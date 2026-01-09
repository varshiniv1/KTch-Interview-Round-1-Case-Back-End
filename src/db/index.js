import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

let db = null;

export function initDb() {
  if (db) return db;

  const dbPath = path.join(process.cwd(), "data.sqlite");
  db = new Database(dbPath);

  // Enforce foreign keys
  db.pragma("foreign_keys = ON");

  // Load schema
  const schemaPath = path.join(process.cwd(), "src", "db", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  db.exec(schemaSql);

  return db;
}

export function getDb() {
  if (!db) initDb();
  return db;
}
