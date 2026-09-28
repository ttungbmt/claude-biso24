# 04: `today` Skill

**What to build:** An Employee asks "what's my shift today / did I check in?" (or runs
`/biso24:today`) and gets today's Work shift, check-in and check-out status with times, and a
note on Late arrival or Late warning, answered in the language they asked in. See spec, user
stories 23–27, and `CONTEXT.md` for the terms.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] The Skill ships in the plugin, written in English, and instructs Claude to reply in the user's language
- [x] Its description makes Claude pick it for "today" questions and not for monthly reviews
- [x] Covers: working day with check-in only, with check-in and check-out, not yet checked in, and no Work shift today (e.g. Sunday)
- [x] Uses the Late arrival / Late warning definitions from `CONTEXT.md`
- [x] Read-only: never suggests it can check in on the user's behalf
- [ ] Manual acceptance with `claude --plugin-dir .` on a working day and on a day off

## Comments

- Headless run of `/biso24:today` via `claude -p --plugin-dir .` on a working day (2026-09-28, not yet checked in) answered correctly. Day-off run still to do by hand.
