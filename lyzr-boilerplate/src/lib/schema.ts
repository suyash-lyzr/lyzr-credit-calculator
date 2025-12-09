import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  useCase: text("use_case").notNull(),
  architecture: jsonb("architecture").notNull(),
  credits: jsonb("credits").notNull(),
  roi: jsonb("roi").notNull(),
  chatHistory: jsonb("chat_history").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;
