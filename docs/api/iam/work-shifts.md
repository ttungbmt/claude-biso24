# iam / work-shifts

Code: `src/modules/iam/work-shifts/`. Bruno: `bruno/iam/work-shifts/`.

## Get my work shift on a date — `GET /v1/work-shift-employees/work-shift-current-date`

The Work shift(s) of the logged-in employee (identified by the token) on one date. There is no
month endpoint: `biso24_list_my_work_shifts` calls this once per day.

### Parameters

| Name | In | Type | Required | Values / format | Verified |
|---|---|---|---|---|---|
| `currentDate` | query | string | yes | `YYYY-MM-DD` | yes |

### Response `data` (partial)

An array of shift assignments, or `null` when the employee has no shift that day (e.g. weekends).

| Field | Type | Notes |
|---|---|---|
| `workShiftId` | string | ObjectId, same as `workShiftItem._id`; what the Request endpoints take as a Work shift |
| `workShiftCode` | string | |
| `workShiftName` | string | label with times, e.g. `CA_HC (08:00 - 17:30)` |
| `workShiftItem.code` | string | e.g. `CA_HC` |
| `workShiftItem.name` | string | |
| `workShiftItem.workingTimes.workingTime` | string (ISO datetime) | start time; only the time of day is meaningful |
| `workShiftItem.endTimes.endTime` | string (ISO datetime) | end time; only the time of day is meaningful |
