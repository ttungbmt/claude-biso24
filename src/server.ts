import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import type { Biso24Client } from "./services/biso24-client.js";
import { registerTools } from "./tools/index.js";

export function createServer(client: Biso24Client): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerTools(server, client);
  return server;
}
