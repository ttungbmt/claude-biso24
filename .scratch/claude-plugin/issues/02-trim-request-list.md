# 02: Trim the Request list

**What to build:** When Claude lists the Logged-in employee's Requests, each Request comes back
as a compact summary instead of the full approval-workflow payload (~5 KB each), so month-level
questions fit in context. See spec, "Trimmed `biso24_list_my_requests`".

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Each item contains only: id, Request type code/name, the date(s) the Request applies to, overall status, current approval step, next approver's name and Staff code, note, created date
- [ ] Approval step conditions and org/department id lists are absent from the output
- [ ] `has_more`, `next_offset`, `total` and `total_pending_approval` are unchanged
- [ ] The tool description reflects the trimmed shape
- [ ] Tests through the MCP client cover the trimmed shape and pagination
- [ ] If ticket 01 has landed, the committed bundle is rebuilt and the staleness check passes
