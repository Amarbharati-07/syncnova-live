import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { nanoid } from "nanoid";
import { db, roomUpdatesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  path: "/api/socket.io",
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

interface FileInfo {
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

interface RoomUpdate {
  id: string;
  type: "text" | "file";
  content?: string;
  files?: FileInfo[];
  timestamp: number;
}

io.on("connection", (socket) => {
  socket.on("join-room", async (roomId: string) => {
    if (!roomId) return;
    socket.join(roomId);
    try {
      const rows = await db
        .select()
        .from(roomUpdatesTable)
        .where(eq(roomUpdatesTable.roomId, roomId))
        .orderBy(asc(roomUpdatesTable.createdAt));

      const history: RoomUpdate[] = rows.map((r) => ({
        id: r.id,
        type: r.type,
        content: r.content ?? undefined,
        files: r.files ?? undefined,
        timestamp: r.createdAt.getTime(),
      }));
      socket.emit("room-history", history);
    } catch (err) {
      logger.error({ err, roomId }, "Failed to load room history");
      socket.emit("room-history", []);
    }
  });

  socket.on(
    "send-data",
    async ({
      roomId,
      data,
    }: {
      roomId: string;
      data: Omit<RoomUpdate, "id" | "timestamp">;
    }) => {
      if (!roomId || !data?.type) return;
      const update: RoomUpdate = {
        id: nanoid(10),
        timestamp: Date.now(),
        ...data,
      };

      try {
        await db.insert(roomUpdatesTable).values({
          id: update.id,
          roomId,
          type: update.type,
          content: update.content ?? null,
          files: update.files ?? null,
          createdAt: new Date(update.timestamp),
        });
      } catch (err) {
        logger.error({ err, roomId, updateId: update.id }, "Failed to persist room update");
      }

      io.to(roomId).emit("receive-data", update);
    }
  );

  socket.on("clear-room", async (roomId: string) => {
    if (!roomId) return;
    try {
      await db.delete(roomUpdatesTable).where(eq(roomUpdatesTable.roomId, roomId));
    } catch (err) {
      logger.error({ err, roomId }, "Failed to clear room");
    }
    io.to(roomId).emit("room-cleared");
  });

  socket.on(
    "typing",
    ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
      if (!roomId) return;
      socket.to(roomId).emit("typing", { socketId: socket.id, isTyping });
    },
  );

  socket.on("disconnect", () => {
    // Notify rooms this socket was in that they stopped typing
    for (const room of socket.rooms) {
      if (room === socket.id) continue;
      socket.to(room).emit("typing", { socketId: socket.id, isTyping: false });
    }
  });

  socket.on(
    "upload-status",
    ({
      roomId,
      status,
    }: {
      roomId: string;
      status: {
        uploadId: string;
        fileCount: number;
        fileNames: string[];
        loaded: number;
        total: number;
        speed: number;
        eta: number;
        state: "uploading" | "completed" | "cancelled" | "failed";
      };
    }) => {
      if (!roomId || !status?.uploadId) return;
      socket.to(roomId).emit("upload-status", status);
    },
  );
});

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
