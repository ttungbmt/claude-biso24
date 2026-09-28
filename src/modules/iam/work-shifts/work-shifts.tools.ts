import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Biso24Client } from "#core/http/biso24-client.js";
import { defineTool, READ_ONLY } from "#core/mcp/define-tool.js";
import { getWorkShiftOnDate } from "./work-shifts.api.js";

export function registerWorkShiftTools(
  server: McpServer,
  client: Biso24Client,
): void {
  defineTool(server, {
    name: "biso24_get_my_work_shift",
    title: "Get my work shift on a date",
    description:
      "Get the work shift (start/end time) assigned to the logged-in employee (identified by " +
      "the token) on one date. For actual check-in/out records use biso24_get_my_timekeeping.",
    inputSchema: {
      date: z.iso
        .date()
        .optional()
        .describe("Date as YYYY-MM-DD. Defaults to today (server local time)."),
    },
    annotations: READ_ONLY,
    handler: ({ date }) =>
      getWorkShiftOnDate(client, { date: date ?? today() }),
  });
}

/** Today's date as YYYY-MM-DD in the server's local time zone. */
function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
