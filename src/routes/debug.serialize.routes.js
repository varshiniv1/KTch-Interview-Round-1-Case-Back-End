import express from "express";
import { getDb } from "../db/index.js";
import { userToResponse } from "../serializers/users.serializer.js";
import { artToResponse } from "../serializers/arts.serializer.js";
import { galleryToResponse } from "../serializers/galleries.serializer.js";

const router = express.Router();

// Returns sample serialized objects from the DB (if they exist)
router.get("/debug/serialize", (req, res) => {
  const db = getDb();

  const u = db.prepare("SELECT * FROM users ORDER BY id DESC LIMIT 1").get();
  const a = db.prepare("SELECT * FROM arts ORDER BY id DESC LIMIT 1").get();
  const g = db.prepare("SELECT * FROM galleries ORDER BY id DESC LIMIT 1").get();

  return res.status(200).json({
    user: u ? userToResponse(u, []) : null,
    art: a ? artToResponse(a, null) : null,
    gallery: g ? galleryToResponse(g, []) : null,
  });
});

export default router;
