#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createApiClients } from "./core/http/clients.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer(createApiClients(loadConfig()));
  await server.connect(new StdioServerTransport());
  // stdout is reserved for the MCP protocol; log to stderr only.
  console.error("biso24-mcp-server running on stdio");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
