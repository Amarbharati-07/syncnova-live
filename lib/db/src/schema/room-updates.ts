import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import type { FileInfo } from "./shares";

export const roomUpdatesTable = pgTable(
  "room_updates",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull(),
    type: text("type", { enum: ["text", "file"] }).notNull(),
    content: text("content"),
    files: jsonb("files").$type<FileInfo[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    roomIdIdx: index("room_updates_room_id_idx").on(table.roomId),
    roomIdCreatedAtIdx: index("room_updates_room_id_created_at_idx").on(
      table.roomId,
      table.createdAt,
    ),
  }),
);

export type RoomUpdateRow = typeof roomUpdatesTable.$inferSelect;
