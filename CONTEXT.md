# Biso24 for Claude

A Claude Code plugin that lets employees of one company work with their own HR data in Biso24
(timekeeping, work shifts, requests) from Claude.

## Language

### Biso24

**Organization**:
The company account in Biso24 that employees belong to, identified by an org id.
_Avoid_: Company, tenant

**Tenant domain**:
The host name an Organization is served under in Biso24, sent with every API call.
_Avoid_: Domain (alone), subdomain

**Employee**:
A person employed by the Organization, with a Biso24 login.
_Avoid_: Staff, user, member

**Staff code**:
The short human-facing code an Employee is known by in the Organization (e.g. `007`).
_Avoid_: Employee code, employee id

**Employee id**:
Biso24's internal identifier for an Employee record, used only to address it in the API.
_Avoid_: Staff code, user id

**Logged-in employee**:
The Employee whose account the plugin signs in with; all "my" data belongs to them.
_Avoid_: Current user, me

### Attendance

**Work shift**:
The working hours an Employee is assigned on a given date (e.g. the 08:00–17:30 office shift).
_Avoid_: Schedule, roster

**Timekeeping record**:
An Employee's recorded check-in and check-out for one Work shift on one date.
_Avoid_: Attendance log, punch

**Late arrival**:
A Timekeeping record whose check-in is after the Work shift start, by any number of minutes.
_Avoid_: Tardy

**Late warning**:
A Late arrival that Biso24 flags as breaching the Organization's lateness policy.
_Avoid_: Late arrival (when the flag is meant), violation

**Early leave**:
A Timekeeping record whose check-out is before the Work shift end.
_Avoid_: Early out

**Unrecorded day**:
A past date with a Work shift but no Timekeeping record; it may be covered by a Request, or be a public holiday.
_Avoid_: Absence, missing day (both imply the Employee did not work)

**Attendance correction**:
A Request asking to add or fix the Timekeeping record for a date, typically after a forgotten check-in.
_Avoid_: Update attendance, missed punch request

**Request**:
A form an Employee submits for approval (leave, overtime, Attendance correction...), moving through approval steps.
_Avoid_: Application, ticket, form

**Approver**:
The Employee whose approval a Request awaits at its current step.
A "Request awaiting my approval" is one where the logged-in Employee is the Approver; Biso24 lists only those still open, not the ones already approved or rejected.
_Avoid_: Responsible (the API's `type=RESPONSIBLE`), pending request (ambiguous: mine awaiting others, or others' awaiting me)

### Plugin

**Plugin**:
The product this repo ships: one installable Claude Code plugin bundling the MCP server and skills.
_Avoid_: Extension, app

**MCP server**:
The component of the Plugin that exposes Biso24 API calls as tools; not shipped on its own.
_Avoid_: Server (alone), backend

**Skill**:
A packaged workflow in the Plugin that combines tools to answer an Employee's recurring question.
_Avoid_: Command, prompt

**Service**:
One Biso24 host (base URL), such as IAM, which also serves HR data.
_Avoid_: Domain, module
