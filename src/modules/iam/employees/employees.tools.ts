import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Biso24Client } from "../../../core/http/biso24-client.js";
import { defineTool, READ_ONLY } from "../../../core/mcp/define-tool.js";
import { getEmployee } from "./employees.api.js";

export function registerEmployeeTools(
  server: McpServer,
  client: Biso24Client,
): void {
  defineTool(server, {
    name: "biso24_get_employee",
    title: "Get employee",
    description:
      "Get one employee's details by id, optionally with work history and profile records. " +
      "Use when you already know the employee id. Regular accounts may only read their own " +
      "record (other ids return permission denied); the logged-in employee's id is the " +
      "`employeeId` field in biso24_get_my_timekeeping. Do not use for the logged-in employee's " +
      "timekeeping, shifts or requests; use the biso24_get_my_* / biso24_list_my_* tools instead.",
    inputSchema: {
      employee_id: z.string().min(1).describe("Employee id (24-char hex)."),
      include_histories: z
        .boolean()
        .default(false)
        .describe("Include the employee's work history."),
      include_profiles: z
        .boolean()
        .default(false)
        .describe("Include the employee's profile records."),
    },
    annotations: READ_ONLY,
    handler: ({ employee_id, include_histories, include_profiles }) =>
      getEmployee(client, {
        id: employee_id,
        histories: include_histories,
        profiles: include_profiles,
      }),
  });
}
