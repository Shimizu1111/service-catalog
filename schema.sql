CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  url TEXT DEFAULT '',
  repo TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active',
  industry TEXT DEFAULT '',
  platform TEXT DEFAULT 'Other',
  images TEXT DEFAULT '[]',
  demo_url TEXT DEFAULT '',
  cost TEXT DEFAULT '',
  created_at TEXT DEFAULT (date('now')),
  updated_at TEXT DEFAULT (date('now'))
);
