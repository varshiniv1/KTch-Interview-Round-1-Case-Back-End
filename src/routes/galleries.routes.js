import express from "express";
import { getDb } from "../db/index.js";

import auth from "../middleware/auth.js";
import noBodyAllowed from "../middleware/noBodyAllowed.js";

import responses from "../utils/responses.js";
import { galleryToResponse } from "../serializers/galleries.serializer.js";
import { artToResponse } from "../serializers/arts.serializer.js";
import { buildNextLink } from "../utils/pagination.js";

const { errors } = responses;
const router = express.Router();

//Helpers 

// get user by auth_sub
function getUserByAuthSub(db, authSub) {
  return db.prepare("SELECT * FROM users WHERE auth_sub = ?").get(authSub);
}

// get gallery by id
function getGalleryById(db, galleryId) {
  return db.prepare("SELECT * FROM galleries WHERE id = ?").get(galleryId);
}

// get art by id
function getArtById(db, artId) {
  return db.prepare("SELECT * FROM arts WHERE id = ?").get(artId);
}

// verify gallery ownership
function requireGalleryOwnership(db, galleryId, authSub) {
  const gallery = getGalleryById(db, galleryId);
  if (!gallery) return { ok: false, status: 404, body: errors.GALLERY_NOT_FOUND };

  const user = getUserByAuthSub(db, authSub);
  if (!user) return { ok: false, status: 403, body: errors.NOT_THE_USER };

  if (gallery.user_id !== user.id) {
    return { ok: false, status: 403, body: errors.NOT_THE_GALLERY_OWNER };
  }

  return { ok: true, gallery, user };
}

// verify art ownership
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

// get all arts in a gallery
function getArtsForGallery(db, galleryId) {
  return db.prepare(`
    SELECT a.*
    FROM gallery_arts ga
    JOIN arts a ON a.id = ga.art_id
    WHERE ga.gallery_id = ?
    ORDER BY a.id ASC
  `).all(galleryId);
}

// Routes 

// POST /galleries
// auth required
// request body not allowed
router.post("/galleries", auth, noBodyAllowed, (req, res) => {
  const db = getDb();
  const user = getUserByAuthSub(db, req.authSub);
  if (!user) return res.status(403).json(errors.NOT_THE_USER);

  const now = new Date().toUTCString();

  const stmt = db.prepare(`
    INSERT INTO galleries (user_id, name, profile, comments, creation_date, is_public)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    user.id,
    null,
    null,
    JSON.stringify([]),
    now,
    0
  );

  const created = getGalleryById(db, info.lastInsertRowid);
  return res.status(201).json(galleryToResponse(created, []));
});

// GET /galleries
// pagination with limit & offset
router.get("/galleries", noBodyAllowed, (req, res) => {
  const db = getDb();

  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const offset = req.query.offset ? Number(req.query.offset) : 0;

  if (!Number.isInteger(limit) || limit <= 0) {
    return res.status(400).json(errors.BAD_REQUEST);
  }
  if (!Number.isInteger(offset) || offset < 0) {
    return res.status(400).json(errors.BAD_REQUEST);
  }

  const total = db.prepare("SELECT COUNT(*) as c FROM galleries").get().c;

  const rows = db.prepare(`
    SELECT * FROM galleries
    ORDER BY id ASC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const items = rows.map((g) => galleryToResponse(g, []));
  const next = buildNextLink("/galleries", limit, offset, total);

  return res.status(200).json({ items, next });
});

// GET /galleries/:gallery_id
// auth + ownership required
router.get("/galleries/:gallery_id", auth, noBodyAllowed, (req, res) => {
  const db = getDb();
  const galleryId = Number(req.params.gallery_id);

  if (!Number.isInteger(galleryId)) {
    return res.status(404).json(errors.GALLERY_NOT_FOUND);
  }

  const own = requireGalleryOwnership(db, galleryId, req.authSub);
  if (!own.ok) return res.status(own.status).json(own.body);

  const arts = getArtsForGallery(db, galleryId);
  return res.status(200).json(galleryToResponse(own.gallery, arts));
});

// PATCH /galleries/:gallery_id
// partial update
router.patch("/galleries/:gallery_id", auth, (req, res) => {
  const db = getDb();
  const galleryId = Number(req.params.gallery_id);

  if (!Number.isInteger(galleryId)) {
    return res.status(404).json(errors.GALLERY_NOT_FOUND);
  }

  const own = requireGalleryOwnership(db, galleryId, req.authSub);
  if (!own.ok) return res.status(own.status).json(own.body);

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json(errors.INVALID_GALLERY_BODY);
  }

  const allowed = new Set(["G_Name", "G_Profile", "G_Comments", "G_Is_Public"]);
  for (const k of Object.keys(req.body)) {
    if (!allowed.has(k)) {
      return res.status(400).json(errors.INVALID_GALLERY_FIELD);
    }
  }

  const updates = [];
  const params = [];

  if ("G_Name" in req.body) {
    const v = req.body.G_Name;
    if (v !== null && typeof v !== "string") {
      return res.status(400).json(errors.INVALID_GALLERY_BODY);
    }
    updates.push("name = ?");
    params.push(v);
  }

  if ("G_Profile" in req.body) {
    const v = req.body.G_Profile;
    if (v !== null && typeof v !== "string") {
      return res.status(400).json(errors.INVALID_GALLERY_BODY);
    }
    updates.push("profile = ?");
    params.push(v);
  }

  if ("G_Comments" in req.body) {
    const v = req.body.G_Comments;
    if (!Array.isArray(v)) {
      return res.status(400).json(errors.INVALID_GALLERY_BODY);
    }
    updates.push("comments = ?");
    params.push(JSON.stringify(v));
  }

  if ("G_Is_Public" in req.body) {
    const v = req.body.G_Is_Public;
    if (typeof v !== "boolean") {
      return res.status(400).json(errors.INVALID_GALLERY_BODY);
    }
    updates.push("is_public = ?");
    params.push(v ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json(errors.INVALID_GALLERY_BODY);
  }

  params.push(galleryId);
  db.prepare(`UPDATE galleries SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  const updated = getGalleryById(db, galleryId);
  const arts = getArtsForGallery(db, galleryId);
  return res.status(200).json(galleryToResponse(updated, arts));
});

// PUT /galleries/:gallery_id
// full replace
router.put("/galleries/:gallery_id", auth, (req, res) => {
  const db = getDb();
  const galleryId = Number(req.params.gallery_id);

  if (!Number.isInteger(galleryId)) {
    return res.status(404).json(errors.GALLERY_NOT_FOUND);
  }

  const own = requireGalleryOwnership(db, galleryId, req.authSub);
  if (!own.ok) return res.status(own.status).json(own.body);

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json(errors.INVALID_GALLERY_BODY);
  }

  const required = ["G_Name", "G_Profile", "G_Comments", "G_Is_Public"];
  for (const f of required) {
    if (!(f in req.body)) {
      return res.status(400).json(errors.INVALID_GALLERY_BODY);
    }
  }

  if (req.body.G_Name !== null && typeof req.body.G_Name !== "string") {
    return res.status(400).json(errors.INVALID_GALLERY_BODY);
  }
  if (req.body.G_Profile !== null && typeof req.body.G_Profile !== "string") {
    return res.status(400).json(errors.INVALID_GALLERY_BODY);
  }
  if (!Array.isArray(req.body.G_Comments)) {
    return res.status(400).json(errors.INVALID_GALLERY_BODY);
  }
  if (typeof req.body.G_Is_Public !== "boolean") {
    return res.status(400).json(errors.INVALID_GALLERY_BODY);
  }

  db.prepare(`
    UPDATE galleries
    SET name = ?, profile = ?, comments = ?, is_public = ?
    WHERE id = ?
  `).run(
    req.body.G_Name ?? null,
    req.body.G_Profile ?? null,
    JSON.stringify(req.body.G_Comments),
    req.body.G_Is_Public ? 1 : 0,
    galleryId
  );

  const updated = getGalleryById(db, galleryId);
  const arts = getArtsForGallery(db, galleryId);
  return res.status(200).json(galleryToResponse(updated, arts));
});

// DELETE /galleries/:gallery_id
// auth + ownership required
router.delete("/galleries/:gallery_id", auth, noBodyAllowed, (req, res) => {
  const db = getDb();
  const galleryId = Number(req.params.gallery_id);

  if (!Number.isInteger(galleryId)) {
    return res.status(404).json(errors.GALLERY_NOT_FOUND);
  }

  const own = requireGalleryOwnership(db, galleryId, req.authSub);
  if (!own.ok) return res.status(own.status).json(own.body);

  db.prepare("DELETE FROM galleries WHERE id = ?").run(galleryId);
  return res.status(204).send();
});

// GET /galleries/:gallery_id/arts
// auth + ownership required
router.get("/galleries/:gallery_id/arts", auth, noBodyAllowed, (req, res) => {
  const db = getDb();
  const galleryId = Number(req.params.gallery_id);

  if (!Number.isInteger(galleryId)) {
    return res.status(404).json(errors.GALLERY_NOT_FOUND);
  }

  const own = requireGalleryOwnership(db, galleryId, req.authSub);
  if (!own.ok) return res.status(own.status).json(own.body);

  const arts = getArtsForGallery(db, galleryId).map((a) => artToResponse(a));
  return res.status(200).json(arts);
});

// PATCH /galleries/:gallery_id/arts/:art_id
// add art to gallery
router.patch("/galleries/:gallery_id/arts/:art_id", auth, noBodyAllowed, (req, res) => {
  const db = getDb();
  const galleryId = Number(req.params.gallery_id);
  const artId = Number(req.params.art_id);

  if (!Number.isInteger(galleryId)) {
    return res.status(404).json(errors.GALLERY_NOT_FOUND);
  }
  if (!Number.isInteger(artId)) {
    return res.status(404).json(errors.ART_NOT_FOUND);
  }

  const gOwn = requireGalleryOwnership(db, galleryId, req.authSub);
  if (!gOwn.ok) return res.status(gOwn.status).json(gOwn.body);

  const aOwn = requireArtOwnership(db, artId, req.authSub);
  if (!aOwn.ok) return res.status(aOwn.status).json(aOwn.body);

  const exists = db.prepare(
    "SELECT 1 FROM gallery_arts WHERE gallery_id = ? AND art_id = ?"
  ).get(galleryId, artId);

  if (exists) return res.status(403).json(errors.ART_ALREADY_IN_GALLERY);

  db.prepare("INSERT INTO gallery_arts (gallery_id, art_id) VALUES (?, ?)")
    .run(galleryId, artId);

  const updatedGallery = getGalleryById(db, galleryId);
  const arts = getArtsForGallery(db, galleryId);
  return res.status(200).json(galleryToResponse(updatedGallery, arts));
});

// DELETE /galleries/:gallery_id/arts/:art_id
// remove art from gallery
router.delete("/galleries/:gallery_id/arts/:art_id", auth, noBodyAllowed, (req, res) => {
  const db = getDb();
  const galleryId = Number(req.params.gallery_id);
  const artId = Number(req.params.art_id);

  if (!Number.isInteger(galleryId)) {
    return res.status(404).json(errors.GALLERY_NOT_FOUND);
  }
  if (!Number.isInteger(artId)) {
    return res.status(404).json(errors.ART_NOT_FOUND);
  }

  const gOwn = requireGalleryOwnership(db, galleryId, req.authSub);
  if (!gOwn.ok) return res.status(gOwn.status).json(gOwn.body);

  const aOwn = requireArtOwnership(db, artId, req.authSub);
  if (!aOwn.ok) return res.status(aOwn.status).json(aOwn.body);

  const exists = db.prepare(
    "SELECT 1 FROM gallery_arts WHERE gallery_id = ? AND art_id = ?"
  ).get(galleryId, artId);

  if (!exists) return res.status(403).json(errors.ART_NOT_IN_GALLERY);

  db.prepare("DELETE FROM gallery_arts WHERE gallery_id = ? AND art_id = ?")
    .run(galleryId, artId);

  const updatedGallery = getGalleryById(db, galleryId);
  const arts = getArtsForGallery(db, galleryId);
  return res.status(200).json(galleryToResponse(updatedGallery, arts));
});

export default router;
