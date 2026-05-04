import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { nanoid } from "nanoid";
import {
  loadRoom,
  getTextState,
  saveTextState,
  appendUpdate,
  clearRoom as clearRoomStore,
} from "./lib/roomStore";

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

// Track connected users per room
const roomUsers = new Map<string, Set<string>>();

function getUserCount(roomId: string): number {
  return roomUsers.get(roomId)?.size ?? 0;
}

function broadcastUserCount(roomId: string) {
  io.to(roomId).emit("user-count", { count: getUserCount(roomId) });
}

io.on("connection", (socket) => {
  socket.on("join-room", async (roomId: string) => {
    if (!roomId) return;
    socket.join(roomId);

    // Track user in room
    if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Set());
    roomUsers.get(roomId)!.add(socket.id);
    broadcastUserCount(roomId);

    // Send file history + current text state
    const [history, textState] = await Promise.all([
      loadRoom(roomId),
      getTextState(roomId),
    ]);
    socket.emit("room-history", history);
    socket.emit("text-state", { text: textState });
  });

  // Real-time text sync (auto-broadcast, no "send" button needed)
  socket.on(
    "text-sync",
    async ({ roomId, text }: { roomId: string; text: string }) => {
      if (!roomId || typeof text !== "string") return;
      await saveTextState(roomId, text);
      socket.to(roomId).emit("text-sync", { text });
    },
  );

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
      await appendUpdate(roomId, update);
      io.to(roomId).emit("receive-data", update);
    },
  );

  socket.on("clear-room", async (roomId: string) => {
    if (!roomId) return;
    await clearRoomStore(roomId);
    io.to(roomId).emit("room-cleared");
  });

  socket.on(
    "typing",
    ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
      if (!roomId) return;
      socket.to(roomId).emit("typing", { socketId: socket.id, isTyping });
    },
  );

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

  socket.on("disconnect", () => {
    for (const room of socket.rooms) {
      if (room === socket.id) continue;
      socket.to(room).emit("typing", { socketId: socket.id, isTyping: false });

      // Update user count
      const users = roomUsers.get(room);
      if (users) {
        users.delete(socket.id);
        if (users.size === 0) {
          roomUsers.delete(room);
        } else {
          broadcastUserCount(room);
        }
      }
    }
  });
});

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
