# claude-biso24

A Claude Code plugin that lets you ask Claude about your own [Biso24](https://biso24.org) HR data:
your timekeeping, work shifts and requests. Everything is read-only: it never checks in, creates
or approves anything.

## Install

You need [Claude Code](https://claude.com/claude-code) and Node.js 20 or later. Nothing else to
install or build.

In Claude Code:

```
/plugin marketplace add ttungbmt/claude-biso24
/plugin install biso24@ttungbmt
```

Claude Code then asks for four settings:

| Setting | What to enter |
|---|---|
| Biso24 email | The email you log in to Biso24 with |
| Biso24 password | Your Biso24 password (masked, stored in your OS credential store) |
| Organization id | Your company's org id: the `orgId` the Biso24 web app sends when you log in (ask a colleague who already uses the plugin) |
| Tenant domain | Your company's Biso24 host, e.g. `acme.biso24.net` |

- **Change them later** (e.g. after a password change): `/plugin configure biso24`.
- **Update the plugin**: `/plugin marketplace update ttungbmt`, then restart Claude Code.

If a tool answers "Login to Biso24 failed", one of the four settings is wrong; the error says
what Biso24 replied.

## Use

Just ask, in any language. Claude answers in the language you asked in.

| Skill | Ask for example | You get |
|---|---|---|
| `/biso24:today` | "What's my shift today? Did I check in?" | Today's work shift, check-in/out times, and a note if you were late |
| `/biso24:timesheet` | "How did my September go?" | Late warnings, other late arrivals, early leaves, time at work, and every day without a timekeeping record with the request that covers it (or a flag to check it) |

A day without a timekeeping record is never called an absence: it may be leave, a forgotten
check-in or a public holiday, which Biso24 does not tell apart.

The skills use these tools, which you can also ask about directly:

| Tool | Description |
|---|---|
| `biso24_get_employee` | Employee details by id, optionally with work history and profiles |
| `biso24_get_my_timekeeping` | My day-by-day timekeeping for a month |
| `biso24_get_my_timekeeping_summary` | My yearly timekeeping summary |
| `biso24_get_my_work_shift` | My work shift on a date |
| `biso24_list_my_work_shifts` | My work shifts for every date of a month (dates without a shift left out) |
| `biso24_list_my_requests` | My requests (leave, attendance correction, overtime...) as compact summaries, filterable by status and type, paginated |
| `biso24_list_requests_to_approve` | Other employees' requests awaiting my approval, with the requester, paginated |
| `biso24_list_request_types` | Request types configured for the organization |

Biso24 has no long-lived API token. The MCP server logs in with your account on the first tool
call, keeps the JWT (valid ~24h) in memory, and logs in again shortly before it expires or when
the API answers 401. Nothing is written to disk.

## Development

The repo root is the plugin (`.claude-plugin/plugin.json`) and the `ttungbmt` marketplace
(`.claude-plugin/marketplace.json`). The plugin runs `dist/index.js`, a single-file bundle of the
MCP server committed to the repo (see `docs/adr/`).

Tools (Node, pnpm, Bruno CLI) and environment variables are managed by [mise](https://mise.jdx.dev):

```bash
mise trust && mise install
cp .env.example .env   # fill in the account, org id and Tenant domain
ln -s ../.env bruno/.env   # Bruno (CLI and VS Code extension) reads the same file
pnpm install
pnpm mcp:dev   # once: register the from-source dev server biso24-dev (local scope)
```

| Variable | Required | Description |
|---|---|---|
| `BISO24_EMAIL` | yes | Biso24 account email |
| `BISO24_PASSWORD` | yes | Biso24 account password |
| `BISO24_ORG_ID` | yes | Organization id (`orgId` in the web app's login request) |
| `BISO24_DOMAIN` | yes | Tenant domain, sent as the `domain` header (e.g. `acme.biso24.net`) |
| `BISO24_IAM_URL` | no | IAM service base URL. Default `https://iam.biso24.org` |

mise loads `.env` (`[env] _.file` in `mise.toml`) whenever you are in this directory with mise
activated, or when a command is run through `mise exec`. The server itself does not read `.env`.
The installed plugin gets the same variables from its settings instead.

`biso24-dev` runs `src/` directly, so changes need no build. It is registered in local scope
rather than in a root `.mcp.json`, because an installed plugin would load that file too.

| Command | Description |
|---|---|
| `pnpm dev` | Run with tsx watch |
| `pnpm build` | Bundle the server into `dist/index.js` (commit it) |
| `pnpm test` | Vitest; also fails when `dist/index.js` is stale or the plugin version differs from `package.json` |
| `pnpm typecheck` | Type-check |
| `pnpm lint` / `pnpm format` | Biome |
| `pnpm inspect` | Build, then open the MCP Inspector |
| `pnpm api` | Run the Bruno collection in `bruno/` against the real API (reads the same `.env` through the `bruno/.env` symlink) |
| `claude --plugin-dir .` | Try the plugin, Skills included, from the working tree |
| `claude plugin validate .` | Validate the marketplace manifest (`.claude-plugin/plugin.json` for the plugin) |

### Releasing

1. Bump the version in `package.json`, `.claude-plugin/plugin.json` and `SERVER_VERSION` in `src/constants.ts` (a test keeps them equal);
   installed plugins only update when it changes.
2. `pnpm build`, then `pnpm test`.
3. Commit (including `dist/index.js`) and push.
