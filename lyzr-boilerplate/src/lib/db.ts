import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import * as fs from "fs";

const { Pool } = pg;

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  const replitDbPath = "/tmp/replitdb";
  if (fs.existsSync(replitDbPath)) {
    const dbUrl = fs.readFileSync(replitDbPath, "utf-8").trim();
    if (dbUrl) {
      return dbUrl;
    }
  }
  
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = getDatabaseUrl();
export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });
