#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  addAgendaItem,
  getAgenda,
  getCommits,
  getPlaybook,
  getWorkLog,
  logWork,
  updateAgendaItem,
} from "./store.js";

const server = new McpServer({
  name: "workbrain",
  version: "0.1.0",
});

server.tool(
  "get_playbook",
  "Read how the user works: approach, bug-fix style, communication preferences.",
  {},
  async () => ({
    content: [{ type: "text", text: getPlaybook() }],
  })
);

server.tool(
  "get_agenda",
  "Get the weekly agenda: focus items, coming up, and expected deliverables.",
  {
    week: z.string().optional().describe("Week start date YYYY-MM-DD (Monday). Defaults to current week."),
    type: z.enum(["focus", "coming_up", "expected"]).optional(),
  },
  async ({ week, type }) => ({
    content: [{ type: "text", text: JSON.stringify(getAgenda({ week, type }), null, 2) }],
  })
);

server.tool(
  "add_agenda_item",
  "Add an item to the weekly agenda board.",
  {
    title: z.string(),
    type: z.enum(["focus", "coming_up", "expected"]).default("focus"),
    estimate: z.string().optional().describe("Rough estimate e.g. 2d, 4h"),
    project: z.string().optional(),
    notes: z.string().optional(),
    week: z.string().optional(),
  },
  async (args) => ({
    content: [{ type: "text", text: JSON.stringify(addAgendaItem(args), null, 2) }],
  })
);

server.tool(
  "update_agenda_item",
  "Update an agenda item: status, estimate, title, etc.",
  {
    id: z.number().int(),
    title: z.string().optional(),
    type: z.enum(["focus", "coming_up", "expected"]).optional(),
    estimate: z.string().optional(),
    status: z.enum(["not_started", "in_progress", "done", "deferred"]).optional(),
    project: z.string().optional(),
    notes: z.string().optional(),
  },
  async (args) => ({
    content: [{ type: "text", text: JSON.stringify(updateAgendaItem(args), null, 2) }],
  })
);

server.tool(
  "get_work_log",
  "Get recent work summaries logged by Claude or hooks.",
  {
    days: z.number().int().min(1).max(90).default(7),
    project: z.string().optional(),
  },
  async ({ days, project }) => ({
    content: [{ type: "text", text: JSON.stringify(getWorkLog({ days, project }), null, 2) }],
  })
);

server.tool(
  "log_work",
  "Log a work summary after completing something.",
  {
    summary: z.string(),
    type: z.enum(["bug", "feature", "enhancement", "explore", "admin"]).optional(),
    project: z.string().optional(),
    commit_hash: z.string().optional(),
  },
  async (args) => ({
    content: [{ type: "text", text: JSON.stringify(logWork(args), null, 2) }],
  })
);

server.tool(
  "get_commits",
  "Get recent git commits recorded by the post-commit hook.",
  {
    days: z.number().int().min(1).max(90).default(7),
  },
  async ({ days }) => ({
    content: [{ type: "text", text: JSON.stringify(getCommits({ days }), null, 2) }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
