# biso24-mcp-server

MCP server that lets LLMs (Claude, etc.) work with the Biso24 API.

## Setup

```bash
pnpm install
cp .env.example .env   # fill in BISO24_API_URL, BISO24_API_KEY
pnpm build
```

## Using with Claude Code

The repo ships a `.mcp.json`. Export the environment variables, then start Claude Code in this directory:

```bash
export BISO24_API_URL=... BISO24_API_KEY=...
pnpm build && claude
```

## Development

| Command | Description |
|---|---|
| `pnpm dev` | Run with tsx watch |
| `pnpm test` | Vitest |
| `pnpm typecheck` | Type-check |
| `pnpm lint` / `pnpm format` | Biome |
| `pnpm inspect` | Open the MCP Inspector |
