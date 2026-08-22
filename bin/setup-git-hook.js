#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const hookSrc = path.join(ROOT, "hooks", "post-commit");

const repoPath = path.resolve(process.cwd(), process.argv[2] || ".");
const gitDir = path.join(repoPath, ".git");

if (!fs.existsSync(gitDir)) {
  console.error(`Not a git repo: ${repoPath}`);
  process.exit(1);
}

const hooksDir = path.join(gitDir, "hooks");
const hookDest = path.join(hooksDir, "post-commit");

fs.mkdirSync(hooksDir, { recursive: true });
fs.copyFileSync(hookSrc, hookDest);
fs.chmodSync(hookDest, 0o755);

console.log(`Installed post-commit hook in ${repoPath}`);
console.log(`\nAdd to ~/.zshrc (once per machine):\n  export WORKBRAIN_ROOT=${ROOT}`);

try {
  const toplevel = execSync("git rev-parse --show-toplevel", { cwd: repoPath, encoding: "utf8" }).trim();
  if (toplevel === repoPath) {
    console.log("\nHook will run on commits in this repo.");
  }
} catch {
  // ignore
}
