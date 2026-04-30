import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { db } from "@workspace/db";
import { sharesTable } from "@workspace/db";
import { eq, desc, sql, and, isNotNull } from "drizzle-orm";
import { CreateCodeShareBody } from "@workspace/api-zod";

const router = Router();

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = nanoid(8);
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

function computeExpiry(expiresIn?: string): Date | null {
  if (!expiresIn || expiresIn === "permanent") return null;
  const now = new Date();
  if (expiresIn === "1h") return new Date(now.getTime() + 60 * 60 * 1000);
  if (expiresIn === "24h") return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return null;
}

function isExpired(share: { expiresAt: Date | null }): boolean {
  if (!share.expiresAt) return false;
  return new Date() > share.expiresAt;
}

function formatShare(share: typeof sharesTable.$inferSelect) {
  return {
    id: share.id,
    type: share.type,
    content: share.content,
    language: share.language,
    title: share.title,
    files: share.files ?? null,
    viewCount: share.viewCount,
    createdAt: share.createdAt.toISOString(),
    expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
  };
}

router.post("/share/code", async (req: Request, res: Response) => {
  const parsed = CreateCodeShareBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { content, language, title, expiresIn } = parsed.data;
  const id = nanoid(6);

  const [share] = await db
    .insert(sharesTable)
    .values({
      id,
      type: "code",
      content,
      language: language ?? "plaintext",
      title: title ?? null,
      expiresAt: computeExpiry(expiresIn),
    })
    .returning();

  res.status(201).json(formatShare(share));
});

router.post(
  "/share/files",
  upload.array("files", 20),
  async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const expiresIn = req.body.expiresIn ?? "permanent";
    const id = nanoid(6);

    const fileInfos = files.map((f) => ({
      name: f.originalname,
      size: f.size,
      mimeType: f.mimetype,
      url: `/api/uploads/${f.filename}`,
    }));

    const [share] = await db
      .insert(sharesTable)
      .values({
        id,
        type: "file",
        files: fileInfos,
        expiresAt: computeExpiry(expiresIn),
      })
      .returning();

    res.status(201).json(formatShare(share));
  }
);

router.get("/share/recent", async (_req: Request, res: Response) => {
  const shares = await db
    .select()
    .from(sharesTable)
    .orderBy(desc(sharesTable.createdAt))
    .limit(20);

  const result = shares.map((s) => ({
    id: s.id,
    type: s.type,
    language: s.language,
    title: s.title,
    viewCount: s.viewCount,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
    fileCount: s.files ? s.files.length : null,
  }));

  res.json(result);
});

router.get("/share/stats", async (_req: Request, res: Response) => {
  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      code: sql<number>`count(*) filter (where type = 'code')::int`,
      file: sql<number>`count(*) filter (where type = 'file')::int`,
      views: sql<number>`coalesce(sum(view_count), 0)::int`,
    })
    .from(sharesTable);

  const langRows = await db
    .select({
      language: sharesTable.language,
      count: sql<number>`count(*)::int`,
    })
    .from(sharesTable)
    .where(and(eq(sharesTable.type, "code"), isNotNull(sharesTable.language)))
    .groupBy(sharesTable.language)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  res.json({
    totalShares: totals.total,
    codeShares: totals.code,
    fileShares: totals.file,
    totalViews: totals.views,
    topLanguages: langRows.map((r) => ({
      language: r.language ?? "plaintext",
      count: r.count,
    })),
  });
});

router.get("/share/:id", async (req: Request, res: Response) => {
  const id = String(req.params["id"]);
  const [share] = await db
    .select()
    .from(sharesTable)
    .where(eq(sharesTable.id, id));

  if (!share) {
    res.status(404).json({ error: "Share not found" });
    return;
  }

  if (isExpired(share)) {
    res.status(404).json({ error: "Share has expired" });
    return;
  }

  await db
    .update(sharesTable)
    .set({ viewCount: share.viewCount + 1 })
    .where(eq(sharesTable.id, id));

  res.json(formatShare({ ...share, viewCount: share.viewCount + 1 }));
});

router.delete("/share/:id", async (req: Request, res: Response) => {
  const id = String(req.params["id"]);
  const [share] = await db
    .select()
    .from(sharesTable)
    .where(eq(sharesTable.id, id));

  if (!share) {
    res.status(404).json({ error: "Share not found" });
    return;
  }

  if (share.type === "file" && share.files) {
    for (const file of share.files) {
      const filename = path.basename(file.url);
      const filePath = path.join(uploadsDir, filename);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        // ignore cleanup errors
      }
    }
  }

  await db.delete(sharesTable).where(eq(sharesTable.id, id));

  res.json({ success: true });
});

export default router;
