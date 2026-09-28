---
name: attendance-correction
description: Draft a Biso24 Attendance correction ("Đề nghị cập nhật chấm công") for the logged-in employee. Use when the user asks to file, create or draft a correction for one or more dates, typically after a forgotten check-in. Saves drafts, then submits them for approval only when the user agrees.
---

# Attendance correction

Save one Attendance correction **draft** per date the user names, then offer to submit it, and
reply in the language the user wrote in. A draft is what the web app's "Lưu nháp" button makes:
it is not sent for approval until submitted ("Gửi duyệt").

## Inputs

| Input | Source | Default |
|---|---|---|
| Dates | the user ("ngày 24", "24 and 25/9") | none; a bare day number means the current month |
| Reason ("Lý do cập nhật") | the user | `Quên chấm công` |
| Approver ("Người tiếp nhận") | the user, by name | the approver of the user's most recent Attendance correction (step 2) |
| Check-in / check-out times | the user | the Work shift's start and end |

## Steps

1. **Resolve dates** to `YYYY-MM-DD`. Done when every date is a concrete day.
2. **Check for duplicates**: call `biso24_list_my_requests` with
   `request_type_code: UPDATE_ATTENDANCE` and `limit: 100`. Biso24 accepts a second Request for
   the same date, so for each date that already has one (any status), tell the user its status and
   leave that date out unless they confirm. Done when every date is either clear or confirmed.
3. **Pick the approver**: call `biso24_list_attendance_correction_approvers` for the first date and
   match the approver by name among `approvers`. Take the default from the step-2 list: the
   `next_approver` of the newest item that has one. Done when you hold exactly one `staff_code`;
   when the name matches none or several, show the candidates and ask.
4. **Confirm once**: show a one-line summary per date (date, Work shift and times, reason,
   approver) and ask the user to confirm. A request that already said "lưu nháp"/"save the draft"
   with every input given counts as confirmed.
5. **Create**: call `biso24_create_my_attendance_correction` once per date with `working_date`,
   `reason`, `approver_staff_code`, and `time_in`/`time_out` only when the user gave them. Done
   when every date has returned a `created` summary with `status: NEW` or an error you report.
6. **Report** each draft (date, times, approver) and ask whether to submit it for approval. A
   request that already said "gửi duyệt"/"submit" counts as yes. To remove a draft made by
   mistake, use `biso24_delete_my_request` with its `id`.
7. **Submit** on a yes: call `biso24_submit_my_request` once per draft `id`. Done when each has
   returned a `submitted` summary or an error you report. Say that a submitted request can no
   longer be deleted, only cancelled in the Biso24 web app. On a no, tell the user they can submit
   later, or press "Gửi duyệt" under "Quản lý đơn → Đơn của tôi" in Biso24.

## Errors

- **No Work shift on a date** (e.g. Sunday): there is nothing to correct; tell the user and skip it.
- **Several Work shifts on a date**: ask which one, then pass its code as `work_shift_code`.
