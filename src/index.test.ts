import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { build } from "tsdown";
import { describe, expect, it } from "vitest";
import { connectTestClient, envelopeFetch } from "#test/helpers/mcp-harness";
import { SERVER_VERSION } from "./constants";

// The plugin runs the committed single-file bundle (docs/adr/0003).
const root = fileURLToPath(new URL("..", import.meta.url));
const bundlePath = join(root, "dist/index.js");

const readJson = async (path: string) =>
  JSON.parse(await readFile(join(root, path), "utf8")) as { version: string };

describe("committed bundle", () => {
  it("serves the same tools as the in-process server", async () => {
    const client = new Client({ name: "test", version: "0.0.0" });
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [bundlePath],
        // Only the dummy config: no .env, no node_modules lookup needed.
        env: {
          BISO24_EMAIL: "me@acme.test",
          BISO24_PASSWORD: "pw",
          BISO24_ORG_ID: "org1",
          BISO24_DOMAIN: "acme.biso24.net",
        },
        cwd: tmpdir(),
        stderr: "ignore",
      }),
    );
    try {
      const expected = await connectTestClient(envelopeFetch(null));
      expect((await client.listTools()).tools).toEqual(
        (await expected.listTools()).tools,
      );
    } finally {
      await client.close();
    }
  });

  it("is up to date with src/ (run `pnpm build` if this fails)", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "biso24-bundle-"));
    try {
      await build({ cwd: root, outDir, logLevel: "silent" });
      const [fresh, committed] = await Promise.all([
        readFile(join(outDir, "index.js")),
        readFile(bundlePath),
      ]);
      expect(fresh.equals(committed)).toBe(true);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  }, 60_000);

  it("keeps the plugin and server versions in step with package.json", async () => {
    const [plugin, pkg] = await Promise.all([
      readJson(".claude-plugin/plugin.json"),
      readJson("package.json"),
    ]);
    expect(plugin.version).toBe(pkg.version);
    expect(SERVER_VERSION).toBe(pkg.version);
  });
});
