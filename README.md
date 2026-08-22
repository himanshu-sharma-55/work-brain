# Workbrain

Local MCP server for **Claude Code** (including inside Cursor). Gives Claude your playbook, weekly agenda, and work history.

**Repo:** [github.com/himanshu-sharma-55/work-brain](https://github.com/himanshu-sharma-55/work-brain)

## What it does

| Tool | Purpose |
|------|---------|
| `get_playbook` | How you work, fix bugs, communicate |
| `get_agenda` | This week's focus, coming up, expected |
| `add_agenda_item` | Add to the board |
| `update_agenda_item` | Mark done / in progress / deferred |
| `get_work_log` | Recent work summaries |
| `log_work` | Claude logs what you shipped |
| `get_commits` | Git commits (via hook) |

Claude reads these when you ask. It updates the board when work is clear. No nagging.

---

## Build & install (this machine)

Requires **Node.js 22+** (uses built-in `node:sqlite`, no native deps).

```bash
git clone https://github.com/himanshu-sharma-55/work-brain.git
cd work-brain
npm install
node bin/install.js
```

Then register with Claude Code (MCP server name is `workbrain`, independent of repo name):

```bash
claude mcp add --scope user workbrain -- node /ABSOLUTE/PATH/TO/work-brain/src/index.js
```

In the Claude Code panel: type `/mcp` → confirm **workbrain** is connected.

Edit your playbook: `~/.workbrain/playbook.md`

---

## Use on another machine

### Option A — Clone the repo (recommended)

```bash
git clone https://github.com/himanshu-sharma-55/work-brain.git ~/work-brain
cd ~/work-brain
npm install
claude mcp add --scope user workbrain -- node ~/work-brain/src/index.js
```

Each machine gets its own `~/.workbrain/` data unless you sync it (see below).

### Option B — Copy only the folder

Copy the repo directory to the other machine, run `npm install`, then `claude mcp add` with that machine's absolute path.

### Option C — npm link (dev)

```bash
cd workbrain && npm link
claude mcp add --scope user workbrain -- workbrain
```

---

## Sync data across machines

All data lives in **`~/.workbrain/`**:

```
~/.workbrain/
  data.db       ← agenda, work log, commits
  playbook.md   ← how you work
```

To sync between laptop and desktop:

| Method | How |
|--------|-----|
| **iCloud/Dropbox** | Symlink: `ln -s ~/Library/Mobile Documents/.../workbrain ~/.workbrain` |
| **Git (private dotfiles repo)** | Track `playbook.md`; export/import `data.db` periodically |
| **Manual** | Copy `~/.workbrain/` when switching machines |

Set a custom data dir on any machine:

```bash
export WORKBRAIN_HOME=/path/to/shared/workbrain-data
claude mcp add --scope user workbrain -- env WORKBRAIN_HOME=/path/to/shared/workbrain-data node ~/work-brain/src/index.js
```

---

## Claude Code in Cursor (your setup)

This uses **Claude Code MCP**, not Cursor's `~/.cursor/mcp.json`.

1. Install the **Claude Code** extension in Cursor
2. Open integrated terminal
3. Run `claude mcp add` (see above)
4. In Claude panel: `/mcp` → enable workbrain

Ask in chat:
- "What's my focus this week?"
- "Mark CSV export as in progress"
- "What did I work on last 7 days?"
- "How do I usually approach bugs?" → reads playbook

---

## Optional: record commits automatically

Set `WORKBRAIN_ROOT` to your install path:

```bash
export WORKBRAIN_ROOT=/path/to/work-brain
cp $WORKBRAIN_ROOT/hooks/post-commit .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

---

## Project-level config (team / per-repo)

Create `.mcp.json` at project root:

```json
{
  "mcpServers": {
    "workbrain": {
      "command": "node",
      "args": ["/absolute/path/to/work-brain/src/index.js"]
    }
  }
}
```

Commit this so the same server is available in that project. Approve on first run when Claude asks.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `claude` not found | Install [Claude Code CLI](https://code.claude.com) or use extension's terminal |
| Server not in `/mcp` | Re-run `claude mcp add --scope user workbrain -- ...` |
| Wrong path after move | `claude mcp remove workbrain` then add again with new path |
| Check logs | Claude Code → `/mcp` → reconnect; run server manually: `node src/index.js` (waits on stdio) |

---

## Data directory

Default: `~/.workbrain/`  
Override: `WORKBRAIN_HOME=/custom/path`

---

## License

See [LICENSE](LICENSE).
