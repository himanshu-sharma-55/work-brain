import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DATA_DIR = process.env.WORKBRAIN_HOME
  ? path.resolve(process.env.WORKBRAIN_HOME)
  : path.join(os.homedir(), ".workbrain");

export const DB_PATH = path.join(DATA_DIR, "data.db");
export const PLAYBOOK_PATH = path.join(DATA_DIR, "playbook.md");

export function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
