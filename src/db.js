import { DatabaseSync } from "node:sqlite";
import { DB_PATH, ensureDataDir } from "./paths.js";

let db;

export function getDb() {
  if (!db) {
    ensureDataDir();
    db = new DatabaseSync(DB_PATH);
    migrate(db);
  }
  return db;
}

function migrate(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS agenda_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'focus',
      estimate TEXT,
      status TEXT NOT NULL DEFAULT 'not_started',
      project TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS work_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      summary TEXT NOT NULL,
      type TEXT,
      project TEXT,
      commit_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS commits (
      hash TEXT PRIMARY KEY,
      repo TEXT NOT NULL,
      branch TEXT,
      message TEXT NOT NULL,
      committed_at TEXT NOT NULL,
      files_changed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_agenda_week ON agenda_items(week_start);
    CREATE INDEX IF NOT EXISTS idx_work_created ON work_entries(created_at);
  `);

  const workCols = database.prepare("PRAGMA table_info(work_entries)").all();
  if (!workCols.some((c) => c.name === "agenda_item_id")) {
    database.exec(`ALTER TABLE work_entries ADD COLUMN agenda_item_id INTEGER`);
  }
}

export function weekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
