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
const GIT_TEMPLATE_DIR = path.join(DATA_DIR, "git-template");
const GIT_HOOKS_DIR = path.join(GIT_TEMPLATE_DIR, "hooks");

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

fs.mkdirSync(GIT_HOOKS_DIR, { recursive: true });
const templateHook = path.join(GIT_HOOKS_DIR, "post-commit");
fs.copyFileSync(path.join(ROOT, "hooks", "post-commit"), templateHook);
fs.chmodSync(templateHook, 0o755);

try {
  execSync(`git config --global init.templateDir "${GIT_TEMPLATE_DIR}"`, { stdio: "inherit" });
  console.log(`Git template dir: ${GIT_TEMPLATE_DIR}`);
} catch {
  console.log(`Could not set git init.templateDir — run manually if needed.`);
}

const mcpCmd = `claude mcp add --scope user workbrain -- ${NODE} ${SERVER}`;
const shellRc = process.env.SHELL?.includes("zsh") ? "~/.zshrc" : "~/.bashrc";

console.log(`
Installed to: ${ROOT}
Data dir:     ${DATA_DIR}

Register with Claude Code (run once per machine):

  ${mcpCmd}

Then in Claude Code panel, type:  /mcp
Confirm workbrain shows connected.

Add to ${shellRc} (once per machine):

  export WORKBRAIN_ROOT=${ROOT}

New git repos auto-get the commit hook via init.templateDir.
Existing repo:

  node ${path.join(ROOT, "bin", "setup-git-hook.js")} /path/to/repo

Terminal status (no Claude needed):

  node ${path.join(ROOT, "bin", "workbrain.js")} status

Edit your playbook:  ${playbook}
`);
