import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClients } from "#core/http/clients.js";
import { registerIamTools } from "./iam/index.js";

/** Registers the tools of every Biso24 service. One line per service. */
export function registerModules(server: McpServer, clients: ApiClients): void {
  registerIamTools(server, clients.iam);
}
