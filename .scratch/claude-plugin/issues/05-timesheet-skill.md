# 05: `timesheet` Skill

**What to build:** An Employee asks for their timesheet for a month (default current) or runs
`/biso24:timesheet`, and gets Late warnings (separately from other Late arrivals), Early leaves,
total recorded hours and days, and every Unrecorded day with its covering Request and status, or
flagged "no request; may be a public holiday, please check". See spec, user stories 11–22, and
`CONTEXT.md`.

**Blocked by:** 01, 02, 03

**Status:** ready-for-agent

- [x] The Skill ships in the plugin, written in English, and instructs Claude to reply in the user's language
- [x] Combines the month's timekeeping, the month's Work shifts and the Request list (paging back until Requests predate the month)
- [x] Unrecorded days exclude dates without a Work shift and future dates; never described as absences
- [x] Covering Requests that are drafts (not yet submitted) are called out
- [x] Late arrival, Late warning, Early leave and Unrecorded day follow `CONTEXT.md` exactly
- [ ] Manual acceptance per the spec's checklist, cross-checked against the Biso24 web app

## Comments

- Headless run of `/biso24:timesheet tháng 9/2026` answered in Vietnamese; Unrecorded days matched the raw data (Sundays and future dates excluded), the NEW correction for 23/09 was called out as a draft, 1-2/09 flagged "may be a holiday". Cross-check against the web app still to do by hand.
