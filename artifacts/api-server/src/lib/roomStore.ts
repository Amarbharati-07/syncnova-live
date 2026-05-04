import fs from "fs";
import path from "path";
import { logger } from "./logger";

export interface FileInfo {
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface RoomUpdate {
  id: string;
  type: "text" | "file";
  content?: string;
  files?: FileInfo[];
  timestamp: number;
}

interface RoomData {
  textState: string;
  updates: RoomUpdate[];
}

const dataDir = path.resolve(process.cwd(), "data", "rooms");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

function fileFor(roomId: string): string | null {
  if (!SAFE_ID.test(roomId)) return null;
  return path.join(dataDir, `${roomId}.json`);
}

const memCache = new Map<string, RoomData>();
const writeTimers = new Map<string, NodeJS.Timeout>();
const WRITE_DEBOUNCE_MS = 300;

function getOrInit(roomId: string): RoomData {
  if (!memCache.has(roomId)) {
    memCache.set(roomId, { textState: "", updates: [] });
  }
  return memCache.get(roomId)!;
}

function scheduleFlush(roomId: string) {
  const existing = writeTimers.get(roomId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    writeTimers.delete(roomId);
    flushNow(roomId).catch((err) =>
      logger.error({ err, roomId }, "Failed to flush room file"),
    );
  }, WRITE_DEBOUNCE_MS);
  writeTimers.set(roomId, t);
}

async function flushNow(roomId: string) {
  const file = fileFor(roomId);
  if (!file) return;
  const data = memCache.get(roomId) ?? { textState: "", updates: [] };
  const tmp = `${file}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(data), "utf-8");
  await fs.promises.rename(tmp, file);
}

export async function loadRoomData(roomId: string): Promise<RoomData> {
  if (memCache.has(roomId)) return memCache.get(roomId)!;

  const file = fileFor(roomId);
  if (!file) return { textState: "", updates: [] };

  try {
    const raw = await fs.promises.readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as unknown;

    let data: RoomData;
    // Handle legacy format (plain array)
    if (Array.isArray(parsed)) {
      data = { textState: "", updates: parsed as RoomUpdate[] };
    } else if (parsed && typeof parsed === "object" && "updates" in parsed) {
      data = parsed as RoomData;
    } else {
      data = { textState: "", updates: [] };
    }

    memCache.set(roomId, data);
    return data;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      const fresh = { textState: "", updates: [] };
      memCache.set(roomId, fresh);
      return fresh;
    }
    logger.error({ err, roomId }, "Failed to read room file");
    return { textState: "", updates: [] };
  }
}

export async function loadRoom(roomId: string): Promise<RoomUpdate[]> {
  const data = await loadRoomData(roomId);
  return data.updates;
}

export async function getTextState(roomId: string): Promise<string> {
  const data = await loadRoomData(roomId);
  return data.textState;
}

export async function saveTextState(
  roomId: string,
  text: string,
): Promise<void> {
  const data = getOrInit(roomId);
  data.textState = text;
  scheduleFlush(roomId);
}

export async function appendUpdate(
  roomId: string,
  update: RoomUpdate,
): Promise<void> {
  const data = await loadRoomData(roomId);
  data.updates.push(update);
  memCache.set(roomId, data);
  scheduleFlush(roomId);
}

export async function clearRoom(roomId: string): Promise<void> {
  const file = fileFor(roomId);
  memCache.delete(roomId);
  const t = writeTimers.get(roomId);
  if (t) {
    clearTimeout(t);
    writeTimers.delete(roomId);
  }
  if (!file) return;
  try {
    await fs.promises.unlink(file);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.error({ err, roomId }, "Failed to delete room file");
    }
  }
}
