import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Biso24Client } from "#core/http/biso24-client.js";
import { defineTool, READ_ONLY } from "#core/mcp/define-tool.js";
import {
  getPersonalTimekeeping,
  getTimekeepingDashboard,
} from "./timekeeping.api.js";

const year = z
  .number()
  .int()
  .min(2000)
  .max(2100)
  .optional()
  .describe("4-digit year. Defaults to the current year.");

export function registerTimekeepingTools(
  server: McpServer,
  client: Biso24Client,
): void {
  defineTool(server, {
    name: "biso24_get_my_timekeeping",
    title: "Get my timekeeping for a month",
    description:
      "Get the day-by-day timekeeping (check-in/out, attendance) of the logged-in employee " +
      "(identified by the token) for one month. For a yearly overview use " +
      "biso24_get_my_timekeeping_summary instead.",
    inputSchema: {
      month: z
        .number()
        .int()
        .min(1)
        .max(12)
        .optional()
        .describe("Month 1-12. Defaults to the current month."),
      year,
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const now = new Date();
      return getPersonalTimekeeping(client, {
        month: args.month ?? now.getMonth() + 1,
        year: args.year ?? now.getFullYear(),
      });
    },
  });

  defineTool(server, {
    name: "biso24_get_my_timekeeping_summary",
    title: "Get my yearly timekeeping summary",
    description:
      "Get the yearly timekeeping summary (dashboard totals) of the logged-in employee " +
      "(identified by the token). For per-day details of a month use biso24_get_my_timekeeping.",
    inputSchema: { year },
    annotations: READ_ONLY,
    handler: (args) =>
      getTimekeepingDashboard(client, {
        year: args.year ?? new Date().getFullYear(),
      }),
  });
}
