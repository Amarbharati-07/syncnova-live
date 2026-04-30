import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";

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

router.post(
  "/upload",
  upload.array("files"),
  (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files provided" });
      return;
    }

    const results = files.map((f) => ({
      name: f.originalname,
      url: `/api/uploads/${f.filename}`,
      size: f.size,
      mimeType: f.mimetype,
    }));

    res.status(200).json({ files: results });
  }
);

export default router;
