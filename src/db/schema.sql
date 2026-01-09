PRAGMA foreign_keys = ON;

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auth_sub TEXT UNIQUE NOT NULL,

  -- profile fields 
  name TEXT,
  email TEXT,
  picture TEXT,

  -- app fields 
  is_custom_time INTEGER DEFAULT 0,
  custom_time_alarm TEXT,
  today_time TEXT,
  time_length INTEGER DEFAULT 10,
  pixel_amount INTEGER DEFAULT 10
);

-- FRIENDS
CREATE TABLE IF NOT EXISTS friends (
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, friend_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (user_id != friend_id)
);

-- ARTS
CREATE TABLE IF NOT EXISTS arts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,

  image TEXT,
  title TEXT,
  comments TEXT DEFAULT '[]',  -- JSON string
  modified_date TEXT,
  previous_art_id INTEGER,
  is_public INTEGER DEFAULT 0,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- GALLERIES
CREATE TABLE IF NOT EXISTS galleries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,

  name TEXT,
  profile TEXT,
  comments TEXT DEFAULT '[]',  -- JSON string
  creation_date TEXT,
  is_public INTEGER DEFAULT 0,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- GALLERY_ARTS 
CREATE TABLE IF NOT EXISTS gallery_arts (
  gallery_id INTEGER NOT NULL,
  art_id INTEGER NOT NULL,
  PRIMARY KEY (gallery_id, art_id),
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
  FOREIGN KEY (art_id) REFERENCES arts(id) ON DELETE CASCADE
);


CREATE INDEX IF NOT EXISTS idx_arts_user_id ON arts(user_id);
CREATE INDEX IF NOT EXISTS idx_galleries_user_id ON galleries(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
