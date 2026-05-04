import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    logger.info(
      {
        method: req.method,
        url: req.originalUrl.split("?")[0],
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      },
      "HTTP request",
    );
  });
  next();
});
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.resolve(process.cwd(), "uploads");
app.use("/api/uploads", express.static(uploadsDir));

app.use("/api", router);

export default app;
