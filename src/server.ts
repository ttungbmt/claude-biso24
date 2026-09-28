import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants";
import type { ApiClients } from "./core/http/clients";
import { registerModules } from "./modules/index";

export function createServer(clients: ApiClients): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerModules(server, clients);
  return server;
}
