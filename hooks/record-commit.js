import { execSync } from "node:child_process";
import path from "node:path";
import { recordCommit } from "../src/store.js";

const hash = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const message = execSync("git log -1 --pretty=%s", { encoding: "utf8" }).trim();
const committed_at = execSync("git log -1 --pretty=%aI", { encoding: "utf8" }).trim();
const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
const repo = path.basename(execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim());
const files_changed = Number(
  execSync("git diff-tree --no-commit-id --name-only -r HEAD | wc -l", { encoding: "utf8" }).trim()
);

recordCommit({ hash, repo, branch, message, committed_at, files_changed });
console.error(`workbrain: recorded commit ${hash.slice(0, 7)}`);
