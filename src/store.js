import fs from "node:fs";
import { getDb, weekStart } from "./db.js";
import { PLAYBOOK_PATH, ensureDataDir } from "./paths.js";

const DEFAULT_PLAYBOOK = `# How I Work

## Approach
- Plan before coding on non-trivial tasks
- Prefer small, focused changes
- Ask before large refactors or deleting files

## Fixing bugs
- Reproduce the bug first
- Minimal fix, then add a test if reasonable
- Explain root cause briefly

## Communication
- Be concise
- Explain tradeoffs when they matter
- Don't suggest follow-ups unless I ask
`;

function all(sql, params = []) {
  return getDb().prepare(sql).all(...params);
}

function get(sql, params = []) {
  return getDb().prepare(sql).get(...params);
}

function run(sql, params = []) {
  return getDb().prepare(sql).run(...params);
}

export function getPlaybook() {
  ensureDataDir();
  if (!fs.existsSync(PLAYBOOK_PATH)) {
    fs.writeFileSync(PLAYBOOK_PATH, DEFAULT_PLAYBOOK, "utf8");
  }
  return fs.readFileSync(PLAYBOOK_PATH, "utf8");
}

export function getAgenda({ week, type } = {}) {
  const targetWeek = week || weekStart();
  let query = `SELECT * FROM agenda_items WHERE week_start = ?`;
  const params = [targetWeek];

  if (type) {
    query += ` AND type = ?`;
    params.push(type);
  }

  query += ` ORDER BY CASE type
    WHEN 'focus' THEN 1
    WHEN 'expected' THEN 2
    WHEN 'coming_up' THEN 3
    ELSE 4 END, id`;

  return { week_start: targetWeek, items: all(query, params) };
}

export function addAgendaItem({ title, type = "focus", estimate, project, notes, week }) {
  const targetWeek = week || weekStart();
  const result = run(
    `INSERT INTO agenda_items (week_start, title, type, estimate, project, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [targetWeek, title, type, estimate ?? null, project ?? null, notes ?? null]
  );

  return get(`SELECT * FROM agenda_items WHERE id = ?`, [result.lastInsertRowid]);
}

export function updateAgendaItem({ id, title, type, estimate, status, project, notes }) {
  const existing = get(`SELECT * FROM agenda_items WHERE id = ?`, [id]);
  if (!existing) {
    throw new Error(`Agenda item ${id} not found`);
  }

  run(
    `UPDATE agenda_items SET
      title = COALESCE(?, title),
      type = COALESCE(?, type),
      estimate = COALESCE(?, estimate),
      status = COALESCE(?, status),
      project = COALESCE(?, project),
      notes = COALESCE(?, notes),
      updated_at = datetime('now')
     WHERE id = ?`,
    [title ?? null, type ?? null, estimate ?? null, status ?? null, project ?? null, notes ?? null, id]
  );

  return get(`SELECT * FROM agenda_items WHERE id = ?`, [id]);
}

export function getWorkLog({ days = 7, project } = {}) {
  let query = `SELECT * FROM work_entries WHERE created_at >= datetime('now', ?)`;
  const params = [`-${days} days`];

  if (project) {
    query += ` AND project = ?`;
    params.push(project);
  }

  query += ` ORDER BY created_at DESC`;
  return all(query, params);
}

export function logWork({ summary, type, project, commit_hash }) {
  const result = run(
    `INSERT INTO work_entries (summary, type, project, commit_hash)
     VALUES (?, ?, ?, ?)`,
    [summary, type ?? null, project ?? null, commit_hash ?? null]
  );

  return get(`SELECT * FROM work_entries WHERE id = ?`, [result.lastInsertRowid]);
}

export function recordCommit({ hash, repo, branch, message, committed_at, files_changed }) {
  run(
    `INSERT INTO commits (hash, repo, branch, message, committed_at, files_changed)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(hash) DO UPDATE SET
       branch = excluded.branch,
       message = excluded.message,
       committed_at = excluded.committed_at,
       files_changed = excluded.files_changed`,
    [hash, repo, branch ?? null, message, committed_at, files_changed ?? 0]
  );

  return get(`SELECT * FROM commits WHERE hash = ?`, [hash]);
}

export function getCommits({ days = 7 } = {}) {
  return all(
    `SELECT * FROM commits
     WHERE committed_at >= datetime('now', ?)
     ORDER BY committed_at DESC`,
    [`-${days} days`]
  );
}
