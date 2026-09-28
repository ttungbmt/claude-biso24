# Biso24 MCP Server

MCP server (TypeScript, stdio) wrapping the Biso24 API. Packages are managed with **pnpm** — never npm/yarn.

## Language
- Write everything that lands in the repo in English: code, identifiers, comments, docstrings,
  tool titles/descriptions, zod `.describe()` text, error/log messages, tests, docs (README, CLAUDE.md),
  commit messages, PR titles/descriptions, branch names.
- Chat replies to the user follow the language the user writes in (Vietnamese in → Vietnamese out).
- Do not mirror the chat language into files, even when the request was written in another language.

## Commands
- `pnpm build` · `pnpm dev` · `pnpm test` · `pnpm typecheck` · `pnpm lint` / `pnpm format`
- `pnpm inspect` — build, then open the MCP Inspector
- Requires env `BISO24_API_URL`, `BISO24_API_KEY` (see `.env.example`)

## Structure
- `src/index.ts` — entry point, stdio transport. **Never write to stdout** (reserved for the MCP protocol); log with `console.error`.
- `src/server.ts` — `createServer(client)`; tests use `InMemoryTransport` (see `test/server.test.ts`).
- `src/services/biso24-client.ts` — the single HTTP client; every tool calls the API through it.
- `src/services/tool-result.ts` — `ok()` / `toolError()`; tools never throw, they return `toolError(e)`.
- `src/tools/<domain>.ts` — each domain exports `register<Domain>Tools(server, client)`, called from `src/tools/index.ts`.

## Tool conventions
- Name tools `biso24_<verb>_<object>` (snake_case) and use `server.registerTool` (not the legacy `server.tool`).
- Always set `title`, `description` (say when to use / not use it), a zod `inputSchema` with `.describe()` on each field, and `annotations` (readOnlyHint, destructiveHint, idempotentHint, openWorldHint).
- List tools support `limit`/`offset` and return `has_more`/`next_offset`; long text is cut by `truncate()` at `CHARACTER_LIMIT`.
- Every new tool needs a test that calls it through an MCP client (InMemoryTransport) with a mocked `fetch`.
