# 05: `timesheet` Skill

**What to build:** An Employee asks for their timesheet for a month (default current) or runs
`/biso24:timesheet`, and gets Late warnings (separately from other Late arrivals), Early leaves,
total recorded hours and days, and every Unrecorded day with its covering Request and status, or
flagged "no request; may be a public holiday, please check". See spec, user stories 11–22, and
`CONTEXT.md`.

**Blocked by:** 01, 02, 03

**Status:** ready-for-agent

- [ ] The Skill ships in the plugin, written in English, and instructs Claude to reply in the user's language
- [ ] Combines the month's timekeeping, the month's Work shifts and the Request list (paging back until Requests predate the month)
- [ ] Unrecorded days exclude dates without a Work shift and future dates; never described as absences
- [ ] Covering Requests that are drafts (not yet submitted) are called out
- [ ] Late arrival, Late warning, Early leave and Unrecorded day follow `CONTEXT.md` exactly
- [ ] Manual acceptance per the spec's checklist, cross-checked against the Biso24 web app
