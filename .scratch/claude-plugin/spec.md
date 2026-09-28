# Spec: Ship Biso24 as a Claude Code plugin

Status: ready-for-agent

See `CONTEXT.md` for vocabulary and `docs/adr/0001`–`0003` for the decisions this spec builds on.

## Problem Statement

The Biso24 MCP server only runs for its developer: it needs a clone of the repo, mise, a local
`.env` and a manual build. Colleagues in the same Organization who want to ask Claude about their
own timekeeping, Work shifts and Requests have no way to install it. Even for the developer, the
raw tools answer one narrow question each; recurring questions such as "how did my month go?"
or "am I checked in today?" take several tool calls and manual interpretation, and forgotten
check-ins (Unrecorded days without an Attendance correction) go unnoticed until payroll.

## Solution

Turn the repo into an installable Claude Code plugin named `biso24`, published from the same
GitHub repo acting as the `ttungbmt` marketplace. A colleague adds the marketplace, installs the
plugin, and enters their email, password, org id and Tenant domain once in Claude Code's config
dialog; the password is kept in the OS credential store. The plugin bundles the existing
read-only MCP tools plus two Skills:

- `timesheet`: a monthly attendance review: Late arrivals (with Late warnings called out),
  Early leaves, total hours, and every Unrecorded day with the Request that covers it or a
  prompt to check it.
- `today`: today's Work shift and whether and when the Logged-in employee checked in.

Two tool changes support the Skills: a new tool listing a month of Work shifts, and a trimmed
Request list that drops approval-workflow configuration.

## User Stories

### Installing and configuring

1. As an Employee, I want to add the plugin's marketplace from GitHub with one command, so that I can find the plugin without cloning a repo.
2. As an Employee, I want to install the plugin with one command, so that setup takes minutes.
3. As an Employee, I want the plugin to work without Node packages, mise or a build step on my machine beyond Node itself, so that installation cannot fail on missing tooling.
4. As an Employee, I want Claude Code to prompt me for my Biso24 email, password, org id and Tenant domain when I enable the plugin, so that I don't have to edit config files.
5. As an Employee, I want my password masked while typing and stored in my OS credential store, so that it never sits in a plain-text settings file.
6. As an Employee, I want to change my saved credentials later through Claude Code's plugin configuration, so that a password change doesn't require reinstalling.
7. As an Employee, I want a clear tool error naming which setting is wrong when login fails, so that I can fix my configuration myself.
8. As an Employee, I want to update the plugin through the marketplace, so that I get fixes without reinstalling.
9. As the developer, I want the README to explain installation and configuration for colleagues, so that I don't have to walk each of them through it.
10. As the developer, I want no company-identifying values (org id, Tenant domain) in the public repo, so that the Organization is not exposed.

### Timesheet Skill

11. As an Employee, I want to ask Claude for my timesheet for a month (defaulting to the current month), so that I can review my attendance in one answer.
12. As an Employee, I want every Late arrival listed with its date and minutes late, so that I can track my punctuality.
13. As an Employee, I want Late warnings shown separately from Late arrivals within tolerance, so that I know which ones actually count against me.
14. As an Employee, I want Early leaves listed with date and minutes, so that I can spot days I left before my Work shift ended.
15. As an Employee, I want my total recorded hours and number of recorded days for the month, so that I can sanity-check my workload.
16. As an Employee, I want every Unrecorded day listed, so that I notice forgotten check-ins before payroll.
17. As an Employee, I want each Unrecorded day matched with the Request that covers it (Attendance correction, leave) and that Request's status, so that I know which ones are already being handled.
18. As an Employee, I want Unrecorded days with no covering Request flagged as "no request; may be a public holiday, please check", so that the Skill never wrongly claims I was absent.
19. As an Employee, I want days without a Work shift (e.g. weekends) and future dates excluded from Unrecorded days, so that the list only contains days that matter.
20. As an Employee, I want a covering Request that is still a draft (not yet submitted) called out, so that I remember to submit it.
21. As an Employee, I want the timesheet answered in the language I asked in, so that Vietnamese-speaking colleagues get Vietnamese answers.
22. As an Employee, I want to ask for a past month's timesheet, so that I can check a month that is already closed.

### Today Skill

23. As an Employee, I want to ask "what's my shift today?", so that I know my working hours.
24. As an Employee, I want to know whether I have checked in today and at what time, so that I don't forget to check in.
25. As an Employee, I want to know whether I have checked out yet, so that I remember to check out before leaving.
26. As an Employee, I want to be told when I have no Work shift today, so that I don't worry about a missing check-in on a day off.
27. As an Employee, I want a note when today's check-in counts as a Late arrival or Late warning, so that I can file a Request if needed.

### Tools

28. As an Employee (through Claude), I want to list my Work shifts for a whole month in one tool call, so that month-level questions don't need thirty calls.
29. As an Employee (through Claude), I want the monthly Work shift list to contain only dates with a shift, each with the shift code, name and start/end time, so that the answer stays small.
30. As an Employee (through Claude), I want my Request list to contain only the Request type, the date(s) it applies to, status, next approver and note, so that listing Requests doesn't flood the conversation with approval configuration.
31. As an Employee (through Claude), I want the Request list to keep pagination and the pending-approval count, so that existing uses keep working.

### Developer workflow

32. As the developer, I want to keep running the server from source through mise while working in the repo, so that changes don't need a rebuild to try.
33. As the developer, I want my development server named `biso24-dev`, so that it never collides with an installed `biso24` plugin.
34. As the developer, I want one command that builds the single-file bundle, so that releasing is trivial.
35. As the developer, I want a check that fails when the committed bundle is out of date with the source, so that I can't push a stale bundle.
36. As the developer, I want a test that starts the committed bundle as a real process and lists its tools, so that I know the shipped artifact actually runs.
37. As the developer, I want to try the plugin locally with `--plugin-dir` before pushing, so that I can test Skills end to end.
38. As the developer, I want the plugin manifest validated by Claude Code's validator, so that a malformed manifest never ships.
39. As the developer, I want CLAUDE.md and README to describe the repo as a plugin, so that future sessions and contributors start from the right mental model.

## Implementation Decisions

- **Plugin identity.** Plugin name `biso24`; the repo is renamed `claude-biso24` on GitHub; the same repo is the marketplace `ttungbmt`, listing the plugin with source at the repo root. Skills are therefore invoked as `/biso24:timesheet` and `/biso24:today`.
- **Plugin root = repo root** (ADR 0002). A plugin manifest is added under `.claude-plugin/`, next to the marketplace manifest. The MCP server is declared inline in the plugin manifest (`mcpServers`), running the bundle with Node from the plugin root and mapping user config to the existing environment variables: `BISO24_EMAIL`, `BISO24_PASSWORD`, `BISO24_ORG_ID`, `BISO24_DOMAIN`. `BISO24_IAM_URL` is not exposed; the server's default applies.
- **User config.** Four required fields: email, password (sensitive), org id, Tenant domain. No defaults are shipped (the repo is public).
- **Server config stays env-based.** The server keeps reading configuration from environment variables only; no change to the config module or the "never write to stdout" rule. The login-failure error message should stop naming only the env variables and also point to the plugin configuration, since plugin users never see those variable names.
- **Dev MCP config.** The root dev MCP config keeps running from source through mise, renamed to `biso24-dev`.
- **Single-file bundle** (ADR 0003). A bundler produces one ESM `dist/index.js` that inlines `@modelcontextprotocol/sdk` and `zod` and needs only Node ≥ 20 at runtime. `dist/` stops being git-ignored and the bundle is committed. The build must be deterministic so the staleness check can compare bytes. The existing `tsc` build is replaced by (or feeds) the bundle; type checking stays with `pnpm typecheck`.
- **Bundle staleness check.** A script rebuilds the bundle into a temporary location and fails if it differs from the committed file; it is part of the test/lint flow the developer runs before pushing.
- **New tool `biso24_list_my_work_shifts`** in the IAM work-shifts module. Input: `year`, `month` (default current). It calls the existing per-date Work shift endpoint once per day of the month server-side (bounded concurrency), drops days with no shift, and returns per date: date, shift code, shift name, start and end time (local time). Read-only annotation; follows the tool conventions in CLAUDE.md. It is not paginated (at most 31 small items).
- **Trimmed `biso24_list_my_requests`.** Each item is mapped to: id, Request type code/name, the date(s) the Request applies to (from its request data), overall status, current approval step and next approver's name and Staff code, note, created date. Approval step conditions and org/department id lists are dropped. Pagination fields and `total_pending_approval` are unchanged. The mapping lives in the requests module, not in `core/`.
- **Skills** are English markdown files (per the repo's language rule) that instruct Claude to answer in the user's language. `timesheet` combines monthly timekeeping, the new monthly Work shift tool and the Request list (paging back until Requests are older than the month); it applies the Late arrival / Late warning / Early leave / Unrecorded day definitions from `CONTEXT.md`. `today` combines today's Work shift and the current month's timekeeping. Neither Skill writes anything.
- **Docs.** README gains an install/configure section for colleagues and keeps a developer section; CLAUDE.md's intro and structure describe the plugin (manifests, Skills, bundle). `.env.example` uses `acme.biso24.net` instead of the real Tenant domain. Git history is not rewritten.
- **Versioning.** The plugin manifest carries a version kept in step with `package.json`; bump it on each release so marketplace updates are picked up.

## Testing Decisions

- Good tests exercise external behaviour only: a tool's input and its JSON output given mocked HTTP responses, or a process's MCP responses; never internal helpers or request construction beyond the URL/params the API contract needs.
- **Seam 1: MCP client (existing, primary).** `connectTestClient` + `envelopeFetch` / a per-URL fetch mock, as in the existing `*.test.ts` next to each tools file (see work-shifts, requests, timekeeping tests; `server.test.ts` for the registered-tool list). Covers:
  - `biso24_list_my_work_shifts`: one API call per day of the requested month; days returning no shift are omitted; output fields and shape; defaults to the current month; a failing day surfaces as a tool error.
  - `biso24_list_my_requests`: items contain only the trimmed fields; approval conditions are absent; pagination and pending count unchanged.
  - The registered-tool list in `server.test.ts` includes the new tool.
  - Login-failure message mentions the plugin configuration and still never leaks the password.
- **Seam 2: the shipped bundle (new).** One test spawns the committed bundle as a child process over stdio with dummy `BISO24_*` variables, connects an MCP client and asserts the tool list equals the in-process server's list. Plus the byte-for-byte staleness check and `claude plugin validate .` for the manifests.
- **Skills: manual acceptance** with `claude --plugin-dir .` against the real account:
  - `/biso24:timesheet` for a month containing Late warnings, Late arrivals within tolerance, a public holiday and forgotten check-ins: Late warnings are listed separately; each Unrecorded day shows its covering Request and status (drafts called out); the holiday and uncovered days are flagged "no request; may be a holiday"; weekends and future dates are absent. Cross-check against the Biso24 web app.
  - `/biso24:today` on a working day and on a Sunday.
  - A fresh install through the marketplace prompts for the four settings and works.

## Out of Scope

- Any write action: check-in/out, creating, submitting or approving Requests.
- Publishing the MCP server to npm or supporting other MCP clients (ADR 0001).
- Hooks, slash commands separate from Skills, and subagents.
- Skills beyond `timesheet` and `today` (e.g. `my-requests`, `whoami`).
- Public-holiday awareness (no known Biso24 source); the Skill flags instead of guessing.
- CI automation for building the bundle (possible later switch per ADR 0003).
- Rewriting git history to remove the real Tenant domain.

## Further Notes

- Unverified with Claude Code docs at spec time: exact precedence if both an inline `mcpServers` and a root `.mcp.json` exist for a plugin; confirm during implementation (ADR 0002 relies on the inline config winning or on the root file being ignored for plugins). If the root `.mcp.json` is picked up by the installed plugin, move the dev config to a location only the project reads.
- The per-date Work shift endpoint returns shifts on public holidays (observed: 2 Sep 2026), which is why Unrecorded days must not be called absences.
- Request payloads are ~5 KB each before trimming; the timesheet Skill depends on the trimmed shape to stay within context.
