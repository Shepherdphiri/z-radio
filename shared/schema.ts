import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const broadcasts = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull().unique(),
  title: text("title").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  listenerCount: integer("listener_count").notNull().default(0),
  audioQuality: text("audio_quality").notNull().default("high"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const listeners = pgTable("listeners", {
  id: serial("id").primaryKey(),
  broadcastId: integer("broadcast_id").references(() => broadcasts.id),
  sessionId: text("session_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertBroadcastSchema = createInsertSchema(broadcasts).omit({
  id: true,
  createdAt: true,
});

export const insertListenerSchema = createInsertSchema(listeners).omit({
  id: true,
  joinedAt: true,
});

export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;
export type Broadcast = typeof broadcasts.$inferSelect;
export type InsertListener = z.infer<typeof insertListenerSchema>;
export type Listener = typeof listeners.$inferSelect;

// WebSocket message types
export interface WebSocketMessage {
  type: 'join-room' | 'leave-room' | 'offer' | 'answer' | 'ice-candidate' | 'room-update';
  roomId?: string;
  data?: any;
  sessionId?: string;
}

export interface RoomUpdate {
  listenerCount: number;
  isActive: boolean;
}
