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

export function updateAgendaItem({ id, title, type, estimate, status, project, notes, log_on_done = true }) {
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

  const updated = get(`SELECT * FROM agenda_items WHERE id = ?`, [id]);
  let work_entry = null;

  if (log_on_done && status === "done" && existing.status !== "done") {
    const alreadyLogged = get(
      `SELECT id FROM work_entries WHERE agenda_item_id = ? LIMIT 1`,
      [id]
    );
    if (!alreadyLogged) {
      work_entry = logWork({
        summary: `Completed: ${updated.title}`,
        project: updated.project,
        agenda_item_id: id,
      });
    }
  }

  return work_entry ? { ...updated, work_entry } : updated;
}

export function deleteAgendaItem(id) {
  const existing = get(`SELECT * FROM agenda_items WHERE id = ?`, [id]);
  if (!existing) {
    throw new Error(`Agenda item ${id} not found`);
  }
  run(`DELETE FROM agenda_items WHERE id = ?`, [id]);
  return { deleted: existing };
}

export function rolloverAgenda({ from_week, to_week } = {}) {
  const currentWeek = weekStart();
  const prevDate = new Date(`${currentWeek}T00:00:00`);
  prevDate.setDate(prevDate.getDate() - 7);
  const sourceWeek = from_week || weekStart(prevDate);
  const targetWeek = to_week || currentWeek;

  const unfinished = all(
    `SELECT * FROM agenda_items
     WHERE week_start = ? AND status NOT IN ('done', 'deferred')`,
    [sourceWeek]
  );

  for (const item of unfinished) {
    run(
      `UPDATE agenda_items SET week_start = ?, updated_at = datetime('now') WHERE id = ?`,
      [targetWeek, item.id]
    );
  }

  return {
    from_week: sourceWeek,
    to_week: targetWeek,
    items: unfinished.map((item) =>
      get(`SELECT * FROM agenda_items WHERE id = ?`, [item.id])
    ),
  };
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

export function logWork({ summary, type, project, commit_hash, agenda_item_id }) {
  const result = run(
    `INSERT INTO work_entries (summary, type, project, commit_hash, agenda_item_id)
     VALUES (?, ?, ?, ?, ?)`,
    [summary, type ?? null, project ?? null, commit_hash ?? null, agenda_item_id ?? null]
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

export function getContext({ days = 7 } = {}) {
  const agenda = getAgenda();
  const work_log = getWorkLog({ days });
  const commits = getCommits({ days });

  return {
    playbook: getPlaybook(),
    week_start: agenda.week_start,
    agenda,
    work_log,
    commits,
    summary: {
      focus_total: agenda.items.filter((i) => i.type === "focus").length,
      focus_done: agenda.items.filter((i) => i.type === "focus" && i.status === "done").length,
      in_progress: agenda.items.filter((i) => i.status === "in_progress").length,
      work_entries: work_log.length,
      commits: commits.length,
    },
  };
}

export function getWeeklySummary({ week } = {}) {
  const targetWeek = week || weekStart();
  const agenda = getAgenda({ week: targetWeek });
  const work_log = all(
    `SELECT * FROM work_entries
     WHERE date(created_at) >= date(?) AND date(created_at) < date(?, '+7 days')
     ORDER BY created_at DESC`,
    [targetWeek, targetWeek]
  );
  const commits = all(
    `SELECT * FROM commits
     WHERE date(committed_at) >= date(?) AND date(committed_at) < date(?, '+7 days')
     ORDER BY committed_at DESC`,
    [targetWeek, targetWeek]
  );

  const items = agenda.items;
  return {
    week_start: targetWeek,
    agenda: {
      total: items.length,
      done: items.filter((i) => i.status === "done").length,
      in_progress: items.filter((i) => i.status === "in_progress").length,
      not_started: items.filter((i) => i.status === "not_started").length,
      deferred: items.filter((i) => i.status === "deferred").length,
      items,
    },
    work_log,
    commits,
  };
}

export function updatePlaybook({ content, append = false }) {
  ensureDataDir();
  if (append) {
    const existing = getPlaybook();
    fs.writeFileSync(PLAYBOOK_PATH, `${existing.trimEnd()}\n\n${content.trim()}\n`, "utf8");
  } else {
    fs.writeFileSync(PLAYBOOK_PATH, content, "utf8");
  }
  return { path: PLAYBOOK_PATH, content: fs.readFileSync(PLAYBOOK_PATH, "utf8") };
}
