#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createServer } from "./server.js";
import { Biso24Client } from "./services/biso24-client.js";

async function main(): Promise<void> {
  const client = new Biso24Client(loadConfig());
  const server = createServer(client);
  await server.connect(new StdioServerTransport());
  // stdout is reserved for the MCP protocol; log to stderr only.
  console.error("biso24-mcp-server running on stdio");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
