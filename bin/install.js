#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const NODE = process.execPath;
const SERVER = path.join(ROOT, "src", "index.js");
const DATA_DIR = path.join(os.homedir(), ".workbrain");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT });
}

console.log("\nWorkbrain install\n");

run("npm install");

fs.mkdirSync(DATA_DIR, { recursive: true });

const playbook = path.join(DATA_DIR, "playbook.md");
if (!fs.existsSync(playbook)) {
  fs.copyFileSync(path.join(ROOT, "templates", "playbook.md"), playbook);
  console.log(`Created ${playbook}`);
}

const mcpCmd = `claude mcp add --scope user workbrain -- ${NODE} ${SERVER}`;

console.log(`
Installed to: ${ROOT}
Data dir:     ${DATA_DIR}

Register with Claude Code (run once per machine):

  ${mcpCmd}

Then in Claude Code panel, type:  /mcp
Confirm workbrain shows connected.

Optional — auto-record commits in a repo:

  export WORKBRAIN_ROOT=${ROOT}
  cp ${path.join(ROOT, "hooks", "post-commit")} .git/hooks/post-commit
  chmod +x .git/hooks/post-commit

Edit your playbook:  ${playbook}
`);
