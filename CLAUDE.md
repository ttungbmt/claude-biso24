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
- `pnpm build` writes the single-file bundle `dist/index.js` that the plugin runs; it is committed. Rebuild and commit it with every `src/` change: `pnpm test` fails when it is stale.
- `pnpm mcp:dev` — register the `biso24-dev` MCP server (from source, via mise) in Claude Code's local scope, once per clone. There is no root `.mcp.json`: an installed plugin would load it too (ADR 0002).
- `claude plugin validate .` (marketplace) and `claude plugin validate .claude-plugin/plugin.json` after editing the manifests; `claude --plugin-dir .` to try the plugin
- `pnpm inspect` — build, then open the MCP Inspector
- `pnpm api` — run the Bruno collection (`bruno/`; vars from `bruno/.env`, a git-ignored symlink to the root `.env`, since Bruno reads only `<collection>/.env` and the VS Code extension doesn't get mise env; no Bruno environment) against the real API; try endpoints there before wrapping them as tools
- Requires env `BISO24_EMAIL`, `BISO24_PASSWORD`, `BISO24_ORG_ID`, `BISO24_DOMAIN` (optional `BISO24_IAM_URL`) in the git-ignored `.env`, loaded by mise (`mise.toml` `[env]`; `biso24-dev` runs the server via `mise exec`). The installed plugin gets them from its user config instead (`.claude-plugin/plugin.json`); see `.env.example`. Never put real credentials in tracked files.

## Structure
```
.claude-plugin/   plugin.json (the `biso24` plugin: user config + inline MCP server running dist/index.js),
                  marketplace.json (the `ttungbmt` marketplace; keep plugin `version` equal to package.json)
dist/index.js     committed bundle (tsdown; all dependencies inlined, needs only Node)
src/
  index.ts        entry point, stdio transport (index.test.ts: spawns the committed bundle, staleness check)
  server.ts       createServer(clients: ApiClients)
  config.ts       env → Config
  core/http/      Biso24Client (Bearer + `domain` headers, unwraps the {success,data} envelope,
                  re-logs in once on 401), SessionAuth (logs in via POST /v1/auth/login, caches
                  the JWT until near `exp`; there is no refresh flow), Biso24ApiError/Biso24AuthError,
                  createApiClients (one client per service, one shared SessionAuth)
  core/mcp/       defineTool, READ_ONLY annotations, pagination, ok()/toolError()/truncate()
  modules/<service>/<resource>/
                  <resource>.api.ts    typed HTTP calls only (no MCP imports)
                  <resource>.tools.ts  register<Resource>Tools: MCP registration only
                  <resource>.test.ts   tests through an MCP client
test/helpers/     mcp-harness.ts: connectTestClient(fetchMock), envelopeFetch() (login mocked), fetchCall();
                  fake-jwt.ts
```
- `index.ts`: **never write to stdout** (reserved for the MCP protocol); log with `console.error`.
- `core/` never imports from `modules/`. Each `modules/<service>/index.ts` exports `register<Service>Tools(server, client)`, called from `src/modules/index.ts`.
- New service: add its URL to `config.ts` + `.env.example`, a field in `ApiClients` (`core/http/clients.ts`), a `modules/<service>/` folder, and one line in `modules/index.ts`.
- Tests are co-located (`*.test.ts` next to the source).
- Imports omit file extensions (`moduleResolution: "Bundler"`; `tsdown` bundles `src/index.ts` into `dist/index.js`, `tsc` only typechecks). Cross-directory imports use `package.json` `"imports"`: `#core/...` and `#test/...` instead of `../../../`; imports within a module stay relative. Package subpaths keep their `.js` (e.g. `@modelcontextprotocol/sdk/server/mcp.js`) because the package exports them that way.
- `<service>` = one Biso24 host / base URL (not a business domain): `iam` is iam.biso24.org, which also serves HR data.
  Bruno mirrors the modules: `bruno/<service>/<resource>/` ↔ `src/modules/<service>/<resource>/` (exception: `bruno/iam/auth/`, whose code lives in `core/http/`).

## Tool conventions
- Name tools `biso24_<verb>_<object>` (snake_case); `_my_` for data of the logged-in employee (identified by the token).
- Register with `defineTool` (wraps `server.registerTool`): the handler returns data; it is JSON-serialized, truncated at `CHARACTER_LIMIT` and sent as `structuredContent`, and thrown errors become `toolError(e)`.
- Always set `title`, `description` (say when to use / not use it), a zod `inputSchema` with `.describe()` on each field, and `annotations` (`READ_ONLY` for GET tools).
- List tools spread `paginationShape` (`limit`/`offset`) and return `has_more`/`next_offset`: use `toPageParams` + `pageMeta` for page-based endpoints, `paginate` for unpaginated ones.
- Every new tool needs a test that calls it through `connectTestClient` with a mocked `fetch`.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
