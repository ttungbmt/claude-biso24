import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClients } from "#core/http/clients";
import { registerIamTools } from "./iam/index";

/** Registers the tools of every Biso24 service. One line per service. */
export function registerModules(server: McpServer, clients: ApiClients): void {
  registerIamTools(server, clients.iam);
}
