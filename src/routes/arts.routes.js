import express from "express";
import { getDb } from "../db/index.js";

import auth from "../middleware/auth.js";
import noBodyAllowed from "../middleware/noBodyAllowed.js";

import responses from "../utils/responses.js";
import { artToResponse } from "../serializers/arts.serializer.js";
import { buildNextLink } from "../utils/pagination.js";

const { errors } = responses;
const router = express.Router();

// Helpers
function getUserByAuthSub(db, authSub) {
  return db.prepare("SELECT * FROM users WHERE auth_sub = ?").get(authSub);
}

function getArtById(db, artId) {
  return db.prepare("SELECT * FROM arts WHERE id = ?").get(artId);
}

function requireArtOwnership(db, artId, authSub) {
  const art = getArtById(db, artId);
  if (!art) return { ok: false, status: 404, body: errors.ART_NOT_FOUND };

  const user = getUserByAuthSub(db, authSub);
  if (!user) return { ok: false, status: 403, body: errors.NOT_THE_USER };

  if (art.user_id !== user.id) {
    return { ok: false, status: 403, body: errors.NOT_THE_ART_OWNER };
  }

  return { ok: true, art, user };
}

router.post("/arts", auth, noBodyAllowed, (req, res) => {
  const db = getDb();

  const user = getUserByAuthSub(db, req.authSub);
  if (!user) return res.status(403).json(errors.NOT_THE_USER);

  const now = new Date().toUTCString();

  const stmt = db.prepare(`
    INSERT INTO arts (user_id, image, title, comments, modified_date, previous_art_id, is_public)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    user.id,
    null,                  // image
    null,                  // title
    JSON.stringify([]),    // comments
    now,                   // modified_date
    null,                  // previous_art_id
    0                      // is_public
  );

  const created = getArtById(db, info.lastInsertRowid);
  return res.status(201).json(artToResponse(created));
});

//GET /arts?limit&offset
 
router.get("/arts", noBodyAllowed, (req, res) => {
  const db = getDb();

  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const offset = req.query.offset ? Number(req.query.offset) : 0;

  // Basic validation
  if (!Number.isInteger(limit) || limit <= 0) return res.status(400).json(errors.BAD_REQUEST);
  if (!Number.isInteger(offset) || offset < 0) return res.status(400).json(errors.BAD_REQUEST);

  const total = db.prepare("SELECT COUNT(*) as c FROM arts").get().c;

  const rows = db.prepare(`
    SELECT * FROM arts
    ORDER BY id ASC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const items = rows.map((a) => artToResponse(a));
  const next = buildNextLink("/arts", limit, offset, total);

  return res.status(200).json({ items, next });
});

//GET /arts/:art_id
 
router.get("/arts/:art_id", auth, noBodyAllowed, (req, res) => {
  const db = getDb();
  const artId = Number(req.params.art_id);

  if (!Number.isInteger(artId)) return res.status(404).json(errors.ART_NOT_FOUND);

  const own = requireArtOwnership(db, artId, req.authSub);
  if (!own.ok) return res.status(own.status).json(own.body);

  return res.status(200).json(artToResponse(own.art));
});

//PATCH /arts/:art_id

router.patch("/arts/:art_id", auth, (req, res) => {
  const db = getDb();
  const artId = Number(req.params.art_id);
  if (!Number.isInteger(artId)) return res.status(404).json(errors.ART_NOT_FOUND);

  const own = requireArtOwnership(db, artId, req.authSub);
  if (!own.ok) return res.status(own.status).json(own.body);

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json(errors.INVALID_ART_BODY);
  }

  const allowed = new Set(["A_Title", "A_Comments", "A_Is_Public", "A_Image", "A_Previous"]);
  for (const k of Object.keys(req.body)) {
    if (!allowed.has(k)) return res.status(400).json(errors.INVALID_ART_FIELD);
  }

  const updates = [];
  const params = [];

  // Title
  if ("A_Title" in req.body) {
    const v = req.body.A_Title;
    if (v !== null && typeof v !== "string") return res.status(400).json(errors.INVALID_ART_BODY);
    updates.push("title = ?");
    params.push(v);
  }

  // Image
  if ("A_Image" in req.body) {
    const v = req.body.A_Image;
    if (v !== null && typeof v !== "string") return res.status(400).json(errors.INVALID_ART_BODY);
    updates.push("image = ?");
    params.push(v);
  }

  // Comments must be array
  if ("A_Comments" in req.body) {
    const v = req.body.A_Comments;
    if (!Array.isArray(v)) return res.status(400).json(errors.INVALID_ART_BODY);
    updates.push("comments = ?");
    params.push(JSON.stringify(v));
  }

  // Is_Public must be boolean
  if ("A_Is_Public" in req.body) {
    const v = req.body.A_Is_Public;
    if (typeof v !== "boolean") return res.status(400).json(errors.INVALID_ART_BODY);
    updates.push("is_public = ?");
    params.push(v ? 1 : 0);
  }

  // A_Previous expects either {} or object with A_ID
  if ("A_Previous" in req.body) {
    const v = req.body.A_Previous;
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      return res.status(400).json(errors.INVALID_ART_BODY);
    }

    // If {} => set null
    if (Object.keys(v).length === 0) {
      updates.push("previous_art_id = ?");
      params.push(null);
    } else {
      const prevId = Number(v.A_ID);
      if (!Number.isInteger(prevId)) return res.status(400).json(errors.INVALID_ART_BODY);

      
      const prev = getArtById(db, prevId);
      if (!prev) return res.status(404).json(errors.ART_NOT_FOUND);

      updates.push("previous_art_id = ?");
      params.push(prevId);
    }
  }

  const now = new Date().toUTCString();
  updates.push("modified_date = ?");
  params.push(now);

  if (updates.length === 0) {
    // no valid updates
    return res.status(400).json(errors.INVALID_ART_BODY);
  }

  params.push(artId);

  db.prepare(`UPDATE arts SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  const updated = getArtById(db, artId);
  return res.status(200).json(artToResponse(updated));
});

//PUT /arts/:art_id
router.put("/arts/:art_id", auth, (req, res) => {
  const db = getDb();
  const artId = Number(req.params.art_id);
  if (!Number.isInteger(artId)) return res.status(404).json(errors.ART_NOT_FOUND);

  const own = requireArtOwnership(db, artId, req.authSub);
  if (!own.ok) return res.status(own.status).json(own.body);

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json(errors.INVALID_ART_BODY);
  }

  const required = ["A_Title", "A_Comments", "A_Is_Public"];
  for (const f of required) {
    if (!(f in req.body)) return res.status(400).json(errors.INVALID_ART_BODY);
  }

  // Validate types
  if (req.body.A_Title !== null && typeof req.body.A_Title !== "string") {
    return res.status(400).json(errors.INVALID_ART_BODY);
  }
  if (!Array.isArray(req.body.A_Comments)) {
    return res.status(400).json(errors.INVALID_ART_BODY);
  }
  if (typeof req.body.A_Is_Public !== "boolean") {
    return res.status(400).json(errors.INVALID_ART_BODY);
  }

  const title = req.body.A_Title ?? null;
  const comments = JSON.stringify(req.body.A_Comments);
  const isPublic = req.body.A_Is_Public ? 1 : 0;

  // Optional fields
  const image = ("A_Image" in req.body) ? req.body.A_Image : own.art.image;
  if (image !== null && image !== undefined && typeof image !== "string") {
    return res.status(400).json(errors.INVALID_ART_BODY);
  }

  const now = new Date().toUTCString();

  db.prepare(`
    UPDATE arts
    SET title = ?, comments = ?, is_public = ?, image = ?, modified_date = ?
    WHERE id = ?
  `).run(title, comments, isPublic, image ?? null, now, artId);

  const updated = getArtById(db, artId);
  return res.status(200).json(artToResponse(updated));
});

//DELETE /arts/:art_id
router.delete("/arts/:art_id", auth, noBodyAllowed, (req, res) => {
  const db = getDb();
  const artId = Number(req.params.art_id);

  if (!Number.isInteger(artId)) return res.status(404).json(errors.ART_NOT_FOUND);

  const own = requireArtOwnership(db, artId, req.authSub);
  if (!own.ok) return res.status(own.status).json(own.body);

  db.prepare("DELETE FROM arts WHERE id = ?").run(artId);
  return res.status(204).send();
});

export default router;
