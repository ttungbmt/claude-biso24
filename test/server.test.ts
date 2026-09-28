import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";
import { Biso24Client } from "../src/services/biso24-client.js";

describe("MCP server", () => {
  it("connects and every tool uses the biso24_ prefix", async () => {
    const server = createServer(
      new Biso24Client({ apiUrl: "https://x.test", apiKey: "k" }),
    );
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    expect(client.getServerVersion()?.name).toBe("biso24-mcp-server");
    // The SDK only advertises the "tools" capability once a tool is registered.
    if (client.getServerCapabilities()?.tools) {
      const { tools } = await client.listTools();
      for (const tool of tools) expect(tool.name).toMatch(/^biso24_/);
    }
  });
});
