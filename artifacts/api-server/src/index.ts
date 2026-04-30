import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { nanoid } from "nanoid";

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

const roomHistory = new Map<string, RoomUpdate[]>();

io.on("connection", (socket) => {
  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
    const history = roomHistory.get(roomId) || [];
    socket.emit("room-history", history);
  });

  socket.on(
    "send-data",
    ({
      roomId,
      data,
    }: {
      roomId: string;
      data: Omit<RoomUpdate, "id" | "timestamp">;
    }) => {
      const update: RoomUpdate = {
        id: nanoid(8),
        timestamp: Date.now(),
        ...data,
      };

      const history = roomHistory.get(roomId) || [];
      history.push(update);
      if (history.length > 50) history.splice(0, history.length - 50);
      roomHistory.set(roomId, history);

      io.to(roomId).emit("receive-data", update);
    }
  );

  socket.on("clear-room", (roomId: string) => {
    roomHistory.delete(roomId);
    io.to(roomId).emit("room-cleared");
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
