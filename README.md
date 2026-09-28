# biso24-mcp-server

MCP server that lets LLMs (Claude, etc.) work with the Biso24 API.

## Setup

Tools (Node, pnpm, Bruno CLI) and environment variables are managed by [mise](https://mise.jdx.dev):

```bash
mise trust && mise install
cp .env.example .env   # fill in the account, org id and domain
ln -s ../.env bruno/.env   # Bruno (CLI and VS Code extension) reads the same file
pnpm install && pnpm build
```

| Variable | Required | Description |
|---|---|---|
| `BISO24_EMAIL` | yes | Biso24 account email |
| `BISO24_PASSWORD` | yes | Biso24 account password |
| `BISO24_ORG_ID` | yes | Organization id (`orgId` in the web app's login request) |
| `BISO24_DOMAIN` | yes | Tenant domain, sent as the `domain` header (e.g. `acme.biso24.net`) |
| `BISO24_IAM_URL` | no | IAM service base URL. Default `https://iam.biso24.org` |

Biso24 has no long-lived API token. The server logs in with the account on the first tool call,
keeps the JWT (valid ~24h) in memory, and logs in again shortly before it expires or when the
API answers 401. Nothing is written to disk.

mise loads `.env` (`[env] _.file` in `mise.toml`) whenever you are in this directory with mise
activated, or when a command is run through `mise exec`. The server itself does not read `.env`.

## Using with Claude Code

The repo is a Claude Code plugin (`biso24`, in `.claude-plugin/`), which runs the committed bundle
`dist/index.js` and asks for the email, password, org id and Tenant domain in Claude Code's plugin
config dialog (`/plugin configure biso24` to change them). Try it from a clone with:

```bash
claude --plugin-dir .
```

For development, register the from-source server `biso24-dev` once (local scope; it runs through
`mise exec`, so the variables come from `.env` without exporting anything):

```bash
pnpm mcp:dev && claude
```

After changing `src/`, run `pnpm build` and commit `dist/index.js`; `pnpm test` fails on a stale bundle.

## Tools

All tools are read-only and act as the employee who owns the token.

| Tool | Description |
|---|---|
| `biso24_get_employee` | Employee details by id, optionally with work history and profiles |
| `biso24_get_my_timekeeping` | My day-by-day timekeeping for a month |
| `biso24_get_my_timekeeping_summary` | My yearly timekeeping summary |
| `biso24_get_my_work_shift` | My work shift on a date |
| `biso24_list_my_requests` | My requests (leave, overtime...), paginated |
| `biso24_list_request_types` | Request types configured for the organization |

## Development

| Command | Description |
|---|---|
| `pnpm dev` | Run with tsx watch |
| `pnpm test` | Vitest |
| `pnpm typecheck` | Type-check |
| `pnpm lint` / `pnpm format` | Biome |
| `pnpm inspect` | Open the MCP Inspector |
| `pnpm api` | Run the Bruno collection in `bruno/` against the real API (reads the same `.env` through the `bruno/.env` symlink) |
