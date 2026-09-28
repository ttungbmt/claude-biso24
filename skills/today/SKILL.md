---
name: today
description: Today's Biso24 Work shift and check-in/check-out status for the logged-in employee. Use when the user asks about today - their shift or working hours, whether or when they checked in or out, or whether they were late today. For a month's attendance use the timesheet skill.
---

# Today

Answer "what's my shift today and have I checked in?" from Biso24, in the language the user
wrote in.

## Steps

1. Call `biso24_get_my_work_shift` with no date (it defaults to today). An empty or null result
   means the user has **no Work shift today** (e.g. Sunday); keep going, since they may still
   have a record.
2. Call `biso24_get_my_timekeeping` with no arguments (current month). Its `days` field is a
   JSON-encoded string: parse it, then read the key for today's day of month (`"28"` for the
   28th). A null or missing entry means no check-in yet; otherwise it is a list with one
   Timekeeping record per Work shift (see **Reading a record**).
3. Reply with, in this order:
   - the Work shift: name and start-end time, or that there is no Work shift today;
   - check-in: the time, or "not checked in yet";
   - check-out: the time, or "not checked out yet";
   - a note when the check-in is a Late arrival, naming it a **Late warning** when flagged as one
     and suggesting the user file a Request in Biso24 if they need to explain it.

   Done when all four points are covered (the last one only when late). Keep it to a few lines.

The skill only reads data. For checking in or filing a Request, point the user to the Biso24 app.

## Reading a record

| Field | Meaning |
|---|---|
| `timeIn` / `timeOut` | Check-in / check-out time (HH:mm:ss, local). Empty or null = not done yet. |
| `lateTime` | Minutes after the Work shift start. |
| `lateType` | `WARNING` = Late warning; `NORMAL` = within tolerance. |
| `earlyTime` / `earlyType` | Same for leaving before the Work shift end. |

- **Late arrival**: `lateTime` > 0, however small.
- **Late warning**: a Late arrival with `lateType` = `WARNING` (breaches the lateness policy).
