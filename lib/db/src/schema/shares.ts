import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fileInfoSchema = z.object({
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
  url: z.string(),
});

export type FileInfo = z.infer<typeof fileInfoSchema>;

export const sharesTable = pgTable("shares", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["code", "file"] }).notNull(),
  content: text("content"),
  language: text("language"),
  title: text("title"),
  files: jsonb("files").$type<FileInfo[]>(),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const insertShareSchema = createInsertSchema(sharesTable).omit({
  viewCount: true,
  createdAt: true,
});

export type InsertShare = z.infer<typeof insertShareSchema>;
export type Share = typeof sharesTable.$inferSelect;
