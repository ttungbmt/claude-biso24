import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Biso24Client } from "#core/http/biso24-client.js";
import { registerEmployeeTools } from "./employees/employees.tools.js";
import { registerRequestTools } from "./requests/requests.tools.js";
import { registerTimekeepingTools } from "./timekeeping/timekeeping.tools.js";
import { registerWorkShiftTools } from "./work-shifts/work-shifts.tools.js";

/** IAM service (iam.biso24.org): employees, timekeeping, work shifts, requests. */
export function registerIamTools(
  server: McpServer,
  client: Biso24Client,
): void {
  registerEmployeeTools(server, client);
  registerTimekeepingTools(server, client);
  registerWorkShiftTools(server, client);
  registerRequestTools(server, client);
}
