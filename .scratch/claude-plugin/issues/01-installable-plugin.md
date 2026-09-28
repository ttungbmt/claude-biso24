# 01: Installable plugin running the existing tools

**What to build:** An Employee can load the repo as the `biso24` Claude Code plugin, enter their
email, password, org id and Tenant domain in Claude Code's config dialog, and use every existing
Biso24 tool, served by a committed single-file bundle that needs only Node at runtime. The
developer keeps running the server from source under the name `biso24-dev`. See spec
(`.scratch/claude-plugin/spec.md`) and ADRs 0002 and 0003.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] A plugin manifest declares the `biso24` plugin with four required user-config fields (password marked sensitive) and an inline MCP server that runs the bundle from the plugin root and maps the fields to `BISO24_EMAIL`, `BISO24_PASSWORD`, `BISO24_ORG_ID`, `BISO24_DOMAIN`
- [x] A marketplace manifest named `ttungbmt` lists the plugin with its source at the repo root
- [x] The build produces one deterministic ESM bundle with dependencies inlined; `dist/` is no longer git-ignored and the bundle is committed
- [x] A staleness check rebuilds the bundle to a temporary location and fails if it differs from the committed one
- [x] A test spawns the committed bundle over stdio with dummy `BISO24_*` variables and asserts its tool list equals the in-process server's
- [x] `claude plugin validate .` passes
- [x] The dev MCP config runs from source through mise under the name `biso24-dev`
- [x] Verified (and noted in ADR 0002 if the finding changes it) whether an installed plugin also picks up the root dev MCP config; if it does, the dev config is moved where only the project reads it
- [x] The login-failure tool error points to the plugin configuration as well as the env variables, and still never contains the password
- [ ] Manual: `claude --plugin-dir .` prompts for the four settings and a tool call (e.g. today's Work shift) succeeds with real credentials
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass
