import express from "express";
import { getDb } from "../db/index.js";

import auth from "../middleware/auth.js";
import noBodyAllowed from "../middleware/noBodyAllowed.js";
import requireJsonBody from "../middleware/requireJsonBody.js";

import responses from "../utils/responses.js";
import { userToResponse } from "../serializers/users.serializer.js";

const { errors } = responses;
const router = express.Router();


 //get user by id
 
function getUserById(db, userId) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
}

//get user by auth_sub

function getUserByAuthSub(db, authSub) {
  return db.prepare("SELECT * FROM users WHERE auth_sub = ?").get(authSub);
}
 //check ownership of a user resource (userId must map to token's authSub)
 
function requireUserOwnership(db, userId, authSub) {
  const user = getUserById(db, userId);
  if (!user) return { ok: false, status: 404, body: errors.USER_NOT_FOUND };
  if (user.auth_sub !== authSub) return { ok: false, status: 403, body: errors.NOT_THE_USER };
  return { ok: true, user };
}


function getFriendsForUser(db, userId) {
  return db.prepare(`
    SELECT u.*
    FROM friends f
    JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ?
    ORDER BY u.id ASC
  `).all(userId);
}

//POST /users
 
router.post("/users", auth, requireJsonBody, (req, res) => {
  const db = getDb();
  const { userinfo } = req.body;

  if (!userinfo || typeof userinfo !== "object") {
    return res.status(400).json(errors.BAD_REQUEST);
  }
  
  if (userinfo.sub && userinfo.sub !== req.authSub) {
    return res.status(403).json(errors.NOT_THE_USER);
  }
  
  const existing = getUserByAuthSub(db, req.authSub);
  if (existing) {
    const friends = getFriendsForUser(db, existing.id);
    return res.status(200).json(userToResponse(existing, friends));
  }

  const now = new Date().toUTCString();

  const stmt = db.prepare(`
    INSERT INTO users (auth_sub, name, email, picture, is_custom_time, custom_time_alarm, today_time, time_length, pixel_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    req.authSub,
    userinfo.name ?? null,
    userinfo.email ?? null,
    userinfo.picture ?? null,
    0,
    null,
    now,
    10,
    10
  );

  const created = getUserById(db, info.lastInsertRowid);
  const friends = getFriendsForUser(db, created.id);
  return res.status(201).json(userToResponse(created, friends));
});

//GET /users (list)
 router.get("/users", noBodyAllowed, (req, res) => {
  const db = getDb();
  const users = db.prepare("SELECT * FROM users ORDER BY id ASC").all();

  const result = users.map((u) => {
    const friends = getFriendsForUser(db, u.id);
    return userToResponse(u, friends);
  });

  return res.status(200).json(result);
});

//GET /users/:user_id
 
router.get("/users/:user_id", auth, noBodyAllowed, (req, res) => {
  const db = getDb();
  const userId = Number(req.params.user_id);

  if (!Number.isInteger(userId)) return res.status(404).json(errors.USER_NOT_FOUND);

  const ownership = requireUserOwnership(db, userId, req.authSub);
  if (!ownership.ok) return res.status(ownership.status).json(ownership.body);

  const friends = getFriendsForUser(db, ownership.user.id);
  return res.status(200).json(userToResponse(ownership.user, friends));
});

// DELETE /users/:user_id
 
router.delete("/users/:user_id", auth, noBodyAllowed, (req, res) => {
  const db = getDb();
  const userId = Number(req.params.user_id);

  if (!Number.isInteger(userId)) return res.status(404).json(errors.USER_NOT_FOUND);

  const ownership = requireUserOwnership(db, userId, req.authSub);
  if (!ownership.ok) return res.status(ownership.status).json(ownership.body);

  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  return res.status(204).send();
});


//PATCH /users/:id1/users/:id2  (add friend)
router.patch("/users/:id1/users/:id2", auth, noBodyAllowed, (req, res) => {
  const db = getDb();
  const id1 = Number(req.params.id1);
  const id2 = Number(req.params.id2);

  if (!Number.isInteger(id1) || !Number.isInteger(id2)) return res.status(404).json(errors.USER_NOT_FOUND);
  if (id1 === id2) return res.status(403).json(errors.FRIEND_SELF);

  const own = requireUserOwnership(db, id1, req.authSub);
  if (!own.ok) return res.status(own.status).json(own.body);

  const other = getUserById(db, id2);
  if (!other) return res.status(404).json(errors.USER_NOT_FOUND);

  const exists = db.prepare("SELECT 1 FROM friends WHERE user_id=? AND friend_id=?").get(id1, id2);
  if (exists) return res.status(403).json(errors.FRIEND_ALREADY);

  db.prepare("INSERT INTO friends (user_id, friend_id) VALUES (?, ?)").run(id1, id2);

  // Return updated user
  const refreshed = getUserById(db, id1);
  const friends = getFriendsForUser(db, id1);
  return res.status(200).json(userToResponse(refreshed, friends));
});


//DELETE /users/:id1/users/:id2 (remove friend)
router.delete("/users/:id1/users/:id2", auth, noBodyAllowed, (req, res) => {
  const db = getDb();
  const id1 = Number(req.params.id1);
  const id2 = Number(req.params.id2);

  if (!Number.isInteger(id1) || !Number.isInteger(id2)) return res.status(404).json(errors.USER_NOT_FOUND);
  if (id1 === id2) return res.status(403).json(errors.FRIEND_SELF);

  const own = requireUserOwnership(db, id1, req.authSub);
  if (!own.ok) return res.status(own.status).json(own.body);

  const exists = db.prepare("SELECT 1 FROM friends WHERE user_id=? AND friend_id=?").get(id1, id2);
  if (!exists) return res.status(403).json(errors.FRIEND_NOT_FOUND);

  db.prepare("DELETE FROM friends WHERE user_id=? AND friend_id=?").run(id1, id2);

  const refreshed = getUserById(db, id1);
  const friends = getFriendsForUser(db, id1);
  return res.status(200).json(userToResponse(refreshed, friends));
});

//PATCH /users  (auto-only)
router.patch("/users", requireJsonBody, (req, res) => {
  const { request_method } = req.body;

  if (request_method !== "automatically") {
    return res.status(400).json(errors.AUTO_ONLY);
  }

  const db = getDb();
  const now = new Date().toUTCString();

  db.prepare("UPDATE users SET today_time = ?").run(now);

  return res.status(200).json({ ok: true, Today_Time: now });
});

export default router;
