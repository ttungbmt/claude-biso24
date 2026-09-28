import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Biso24Client } from "../services/biso24-client.js";

/**
 * Registers all tools. Each domain (orders, products, customers...) lives in
 * its own file under src/tools/ and exports a register<Domain>Tools function.
 */
export function registerTools(_server: McpServer, _client: Biso24Client): void {
  // Example: registerOrderTools(_server, _client);
}
