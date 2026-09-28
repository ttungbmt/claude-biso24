---
name: timesheet
description: Monthly Biso24 attendance review for the logged-in employee - Late arrivals and Late warnings, Early leaves, total hours, and Unrecorded days with the Requests that cover them. Use when the user asks for their timesheet, how their month went, whether they forgot to check in, or which days still need an attendance correction. For today only, use the today skill.
---

# Timesheet

Review one month of the user's attendance, in the language the user wrote in. The month defaults
to the current one; the user may name a past month.

## Steps

1. Fix the month (year and month) and today's date. Call, in parallel:
   - `biso24_get_my_timekeeping` with `year` and `month`;
   - `biso24_list_my_work_shifts` with `year` and `month`;
   - `biso24_list_my_requests` with `limit: 100`.
2. Page the Requests: while `has_more` is true and the oldest item's `created_at` is later than
   31 days before the month's first day, call again with `offset: next_offset`. (Leave is often
   filed before the month; corrections after it.)
3. Parse the timekeeping `days` field: a JSON-encoded string keyed by day of month (`"1"`..`"31"`),
   each value null or a list of Timekeeping records (see **Reading a record**).
4. Classify every date of the month that has a Work shift and is before today:
   - it has a record: a **recorded day**; check it for Late arrival, Late warning and Early leave;
   - no record: an **Unrecorded day**; find its covering Requests (see **Matching Requests**).

   Today counts only if it already has a record; future dates are skipped. Records on dates
   without a Work shift still count as recorded days. Done when every Work shift date before
   today is exactly one of recorded or Unrecorded.
5. Report, with dates as the user's locale writes them:
   1. Summary: recorded days, and total time (sum of `totalTime`; it spans check-in to
      check-out, breaks included, so call it time at work, not hours worked).
   2. Late warnings: date, check-in time, minutes late.
   3. Other Late arrivals (within tolerance): date, minutes late.
   4. Early leaves: date, check-out time, minutes early.
   5. Unrecorded days: date and, per covering Request, its type name and status. Call out a
      covering Request with status `NEW` as a draft that still needs submitting, and a `REJECTED`
      one as not covering the day. With no covering Request, write "no request; may be a public
      holiday, please check".

   Leave out an empty section, saying in one line that there were none.

Call an Unrecorded day exactly that: a date without a record, which may be leave, a forgotten
check-in or a public holiday. Biso24 assigns Work shifts on public holidays, so the data alone
cannot tell. The skill only reads data; for corrections, point the user to the Biso24 app.

## Reading a record

| Field | Meaning |
|---|---|
| `timeIn` / `timeOut` | Check-in / check-out time (HH:mm:ss, local). |
| `totalTime` | Time from check-in to check-out (HH:mm:ss). |
| `lateTime` / `lateType` | Minutes after the Work shift start; `WARNING` or `NORMAL`. |
| `earlyTime` / `earlyType` | Minutes before the Work shift end; `WARNING` or `NORMAL`. |

- **Late arrival**: `lateTime` > 0, however small.
- **Late warning**: a Late arrival with `lateType` = `WARNING` (breaches the lateness policy).
- **Early leave**: `earlyTime` > 0.
- **Unrecorded day**: a past date with a Work shift but no record.

## Matching Requests

A Request covers a date when `from` <= date <= `to`; when it has `days`, the date must also be
listed there (`part` tells whether it is the whole day or half of it). Attendance corrections
(`UPDATE_ATTENDANCE`) and leave (`LEAVE`) are the usual cover; any type whose dates include the
day counts. `status` is `NEW` (draft, not submitted), `PROCESSING` (awaiting `next_approver`),
`APPROVED` or `REJECTED`.
