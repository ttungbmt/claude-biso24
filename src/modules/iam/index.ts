import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Biso24Client } from "#core/http/biso24-client";
import { registerEmployeeTools } from "./employees/employees.tools";
import { registerRequestTools } from "./requests/requests.tools";
import { registerTimekeepingTools } from "./timekeeping/timekeeping.tools";
import { registerWorkShiftTools } from "./work-shifts/work-shifts.tools";

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
