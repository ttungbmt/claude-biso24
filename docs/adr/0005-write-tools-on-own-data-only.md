# Write tools act only on the logged-in employee's own data

Superseded in part by ADR 0006, which allows approving Requests that await the Logged-in employee.

Until now the plugin was read-only: it never created, changed or approved anything in Biso24. We now
add Write tools, starting with Request deletion, but only on the Logged-in employee's own data:
never another Employee's Request, and no approving or rejecting on anyone's behalf.

Write tools are always registered, with no opt-in setting. They carry `destructiveHint: true` (or
`readOnlyHint: false` for non-destructive writes), and we rely on Claude Code asking the user's
permission before each MCP tool call. Destructive tools act on one record per call, so each
permission prompt names exactly one thing.

## Considered options

- Stay read-only: safest, but leaves routine chores (deleting a draft Request) to the web app.
- Allow writes on any data the API permits: the API lets an Approver act on other Employees'
  Requests, and a mistaken call there affects a colleague, not the user.
- An opt-in `userConfig` switch: extra setup for every user, while Claude Code's permission prompt
  already guards each call. Revisit if users run Claude Code with permissions bypassed.
- Batch deletion (the API takes an array of ids): fewer prompts, but one prompt could delete many
  Requests the user never looked at.
