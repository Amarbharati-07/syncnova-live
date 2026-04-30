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

const dataDir = path.resolve(process.cwd(), "data", "rooms");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

function fileFor(roomId: string): string | null {
  if (!SAFE_ID.test(roomId)) return null;
  return path.join(dataDir, `${roomId}.json`);
}

const memCache = new Map<string, RoomUpdate[]>();
const writeTimers = new Map<string, NodeJS.Timeout>();
const WRITE_DEBOUNCE_MS = 250;

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
  const data = memCache.get(roomId) ?? [];
  const tmp = `${file}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(data), "utf-8");
  await fs.promises.rename(tmp, file);
}

export async function loadRoom(roomId: string): Promise<RoomUpdate[]> {
  const cached = memCache.get(roomId);
  if (cached) return cached;

  const file = fileFor(roomId);
  if (!file) return [];

  try {
    const raw = await fs.promises.readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as RoomUpdate[];
    if (!Array.isArray(parsed)) {
      memCache.set(roomId, []);
      return [];
    }
    memCache.set(roomId, parsed);
    return parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      memCache.set(roomId, []);
      return [];
    }
    logger.error({ err, roomId }, "Failed to read room file");
    return [];
  }
}

export async function appendUpdate(
  roomId: string,
  update: RoomUpdate,
): Promise<void> {
  const list = await loadRoom(roomId);
  list.push(update);
  memCache.set(roomId, list);
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
