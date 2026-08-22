#!/usr/bin/env node
import { getContext, getWeeklySummary } from "../src/store.js";

const [, , cmd = "status", ...args] = process.argv;

function statusText(ctx) {
  const { summary, agenda } = ctx;
  const lines = [
    `Week of ${ctx.week_start}`,
    "",
    `Focus: ${summary.focus_done}/${summary.focus_total} done · ${summary.in_progress} in progress`,
    `Last 7 days: ${summary.work_entries} work entries · ${summary.commits} commits`,
    "",
    "Agenda:",
  ];

  if (agenda.items.length === 0) {
    lines.push("  (empty)");
  } else {
    for (const item of agenda.items) {
      const tag = item.type === "focus" ? "focus" : item.type;
      lines.push(`  [${item.status}] ${item.title} (${tag})`);
    }
  }

  lines.push("", "Recent work:");
  if (ctx.work_log.length === 0) {
    lines.push("  (none)");
  } else {
    for (const entry of ctx.work_log.slice(0, 5)) {
      lines.push(`  · ${entry.summary}`);
    }
  }

  return lines.join("\n");
}

function summaryText(summary) {
  const { agenda } = summary;
  const lines = [
    `Week of ${summary.week_start}`,
    "",
    `Agenda: ${agenda.done}/${agenda.total} done · ${agenda.in_progress} in progress · ${agenda.deferred} deferred`,
    `Work log: ${summary.work_log.length} entries`,
    `Commits: ${summary.commits.length}`,
    "",
  ];

  if (summary.work_log.length > 0) {
    lines.push("Shipped:");
    for (const entry of summary.work_log) {
      lines.push(`  · ${entry.summary}`);
    }
  }

  return lines.join("\n");
}

try {
  if (cmd === "status") {
    console.log(statusText(getContext()));
  } else if (cmd === "summary") {
    const week = args[0];
    console.log(summaryText(getWeeklySummary(week ? { week } : {})));
  } else {
    console.error(`Usage: workbrain [status|summary] [week YYYY-MM-DD]`);
    process.exit(1);
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
