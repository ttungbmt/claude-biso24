# 03: List a month of Work shifts in one call

**What to build:** Claude can fetch the Logged-in employee's Work shifts for a whole month with
one tool call, `biso24_list_my_work_shifts`, getting only the dates that have a shift, each with
shift code, name and start/end time. See spec, "New tool `biso24_list_my_work_shifts`".

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Input `year` and `month`, both defaulting to the current month; read-only annotation; title, description and field descriptions per the tool conventions
- [ ] Server-side, the existing per-date Work shift endpoint is called once per day of the month with bounded concurrency
- [ ] Dates without a Work shift are omitted; each returned item has date, shift code, shift name, start and end time in local time
- [ ] A failing day surfaces as a tool error
- [ ] The registered-tool list test includes the new tool
- [ ] Tests through the MCP client cover call count, omission of shiftless days, output shape and defaults
- [ ] If ticket 01 has landed, the committed bundle is rebuilt and the staleness check passes
