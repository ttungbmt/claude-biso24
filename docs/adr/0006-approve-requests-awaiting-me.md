# Approving Requests that await the logged-in employee

Superseded in part: ADR 0005's "no approving on anyone's behalf". Team leads spend real time
clicking "Duyệt" on their team's Requests, and they asked Claude to do it. We now allow one kind of
Write tool on another Employee's data: approving a Request that currently awaits the Logged-in
employee's approval. The Logged-in employee is the Approver, so this is not acting on anyone's
behalf, and it is exactly what the web app lets them do. Rejecting is not supported yet.

`biso24_approve_requests` takes up to 20 Request ids. Before calling the API, it checks that every
id is in the Logged-in employee's "awaiting my approval" (`RESPONSIBLE`) list. The call is all or
nothing: if any id fails a check, nothing is sent. Each Request is forwarded to the approver of its
next step, as the web app does. Claude should show the user which Requests it will approve, since
one permission prompt covers the whole batch.

## Considered options

- Keep ADR 0005's ban: approvals stay in the web app, which is the chore the user wants to drop.
- One Request per call, like deletion: every permission prompt names one thing, but approving a
  team's backlog of 15 Requests means 15 prompts. Unlike a deletion, an approval only moves a
  Request on to the next Approver, who can still reject it.
- Pass the next Approver as an input: the web app does not ask for one (it takes the next step's
  approver), so an input would only add room for mistakes.
- Guess the body for a Request's last step (no next step): not captured yet, so the tool refuses
  those Requests until it is.
