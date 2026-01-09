import express from "express";
import { getDb } from "../db/index.js";

const router = express.Router();

router.get("/debug/db", (req, res) => {
  const db = getDb();

  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    )
    .all()
    .map((r) => r.name);

  const counts = {};
  for (const t of tables) {
    counts[t] = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c;
  }

  return res.status(200).json({ tables, counts });
});

router.post("/debug/reset", (req, res) => {
  const db = getDb();

  // Order matters due to FK constraints
  db.exec(`
    DELETE FROM gallery_arts;
    DELETE FROM friends;
    DELETE FROM arts;
    DELETE FROM galleries;
    DELETE FROM users;
  `);

  return res.status(200).json({ ok: true });
});

export default router;