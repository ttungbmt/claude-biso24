# 06: Docs and repo identity

**What to build:** A colleague landing on the GitHub repo can install and configure the plugin
from the README alone, and future sessions read the repo as a plugin. The repo is renamed
`claude-biso24`. See spec, user stories 1–2, 9–10, 39, and "Docs" / "Versioning" decisions.

**Blocked by:** 01

**Status:** ready-for-human (the GitHub rename is an outward-facing action for the owner; the doc edits can be done by an agent)

- [ ] Owner renames the GitHub repo to `claude-biso24` (GitHub redirects the old name)
- [x] README: install section (add the `ttungbmt` marketplace, install `biso24`, configure the four settings, update, reconfigure), list of Skills and tools, and a developer section (mise, `.env`, `biso24-dev`, bundle and staleness check)
- [x] CLAUDE.md intro and structure describe the plugin: manifests, Skills, committed bundle, dev vs plugin MCP config
- [x] `.env.example` uses `acme.biso24.net` instead of the real Tenant domain (history not rewritten)
- [x] Plugin manifest version matches `package.json`, and the release step (bump both, rebuild, commit) is documented
