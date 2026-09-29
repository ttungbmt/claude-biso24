# iam / requests

Code: `src/modules/iam/requests/`. Bruno: `bruno/iam/requests/`.
Web app: "Quản lý đơn" (`/workspace/request-management?tab=OWNER|RESPONSIBLE`); its params come
from the whitelist in the web app's `requestService` JS chunk.

## Create a request — `POST /v1/request-employees`

Files a Request as a draft (status `NEW`, "Lưu nháp"): the web app's "Lưu nháp" button in the
"Thêm mới ▾ → <type>" dialog. Captured from the web app saving an Attendance correction
(`UPDATE_ATTENDANCE`) draft on 2026-09-28; wrapped as `biso24_create_my_attendance_correction`.
Submitting the draft ("Gửi duyệt") is a separate call: see "Submit a request" below.
Bruno: `bruno/iam/requests/create-attendance-correction.bru` (tagged `write`).

### Parameters (body, `UPDATE_ATTENDANCE`)

| Name | Type | Required | Values / format | Verified |
|---|---|---|---|---|
| `registrationDate` | string | yes? | ISO datetime; the web app sends the time the page was opened ("Ngày đề nghị") | yes (web app) |
| `requestCategoryId` | string | yes | request type `_id` | yes (web app) |
| `requestCategoryCode` | string | yes | `UPDATE_ATTENDANCE` | yes (web app) |
| `requestData.workingDate` | string | yes | `YYYY-MM-DD` | yes (web app) |
| `requestData.workShiftItem` | object | yes | `code` (e.g. `CA_HC`), `workShiftItemId` (the Work shift's `workShiftId`), `name` (its `workShiftName`, e.g. `CA_HC (08:00 - 17:30)`) | yes (web app) |
| `requestData.timeIn`, `requestData.timeOut` | string | yes | `HH:mm:ss`, local time | yes (web app) |
| `notes` | string | yes | the reason ("Lý do cập nhật"); the web app suggests `Quên chấm công`, `Máy chấm công lỗi`, `Mất điện`, `Mất mạng` | yes (web app) |
| `files` | array | no | attachments; `[]` when none | yes (web app) |
| `approvalForNextStep` | object | yes | the chosen Approver ("Người tiếp nhận"), copied whole from [approver candidates](#list-approver-candidates--post-v1request-employeesrequesttypeidapprove-details-for-next-steps) | yes (web app) |

The requester is not in the body: it is the logged-in employee (from the token).

### Response `data`

The created Request, same shape as a [list](#list-requests--get-v1request-employees) item, with
`status: "NEW"`, `approvalSteps` resolved (step 1 "Tạo đơn" `NEW` with the requester as approver;
the chosen Approver on the next steps, `NOT_STARTED`) and `approvalForNextStep` as sent.

### Notes

- Biso24 does not refuse a second Request for the same `workingDate`: the web app saved two
  drafts for one date. `biso24_create_my_attendance_correction` leaves the check to the caller.
- Other types (`LEAVE`, `OVERTIME`...) use the same endpoint with their own `requestData`; not
  captured yet.

## List approver candidates — `POST /v1/request-employees/{requestTypeId}/approve-details-for-next-steps`

The Employees the logged-in employee may pick as the first Approver ("Người tiếp nhận") of a new
Request of this type. The web app calls it when the user opens the "Người tiếp nhận" picker (the
picker's search box filters this list client-side). Read-only despite the POST. Wrapped as
`biso24_list_attendance_correction_approvers`. Bruno:
`bruno/iam/requests/list-approver-candidates.bru`.

### Parameters

| Name | In | Type | Required | Values / format | Verified |
|---|---|---|---|---|---|
| `requestTypeId` | path | string | yes | request type `_id`, e.g. the `UPDATE_ATTENDANCE` one | yes |
| `workShift` | body | string | yes | the Work shift's `workShiftId` on the Request's date; omitted → 400 "Trường workShift là bắt buộc!" | yes |
| `employeeId` | body | string | no | the requester; the web app sends the logged-in employee's id, and the API takes it from the token when omitted | yes |

### Response `data`

An array (19 people for tenant `gtel-ots`, team leads and managers across departments, the
requester included):

| Field | Type | Notes |
|---|---|---|
| `employeeId` | string | ObjectId |
| `staffCode` | string | e.g. `006` |
| `fullName` | string | |
| `avatar`, `personalEmail`, `companyEmail` | string | often empty |
| `departmentName`, `positionName` | string | |

## Delete requests — `DELETE /v1/request-employees`

Deletes Requests (the web app's "Xoá" on a Request). Captured from the web app deleting a draft;
not yet run from Bruno (`bruno/iam/requests/delete-my-request.bru`, tagged `write`).

### Parameters

| Name | In | Type | Required | Values / format | Verified |
|---|---|---|---|---|---|
| (body) | body | array of string | yes | Request `_id`s, e.g. `["6ab9f4b7754e7d7012bd8766"]` | yes (web app) |

### Response `data`

Not verified.

### Notes

- Unknown: which statuses can be deleted (the web app offered it on a `NEW` draft), whether it
  refuses other employees' Requests, and what a missing or already deleted id returns. Until
  verified, `biso24_delete_my_request` deletes only the logged-in employee's own `NEW` Requests,
  looked up with `GET ?type=OWNER&status=NEW` first (ADR 0005).
- Distinct from cancelling a submitted Request, a separate endpoint not documented yet.

## Submit a request — `PUT /v1/request-employees/{id}/send-request`

Submits a draft Request for approval (the web app's "Gửi duyệt"): its approval steps start and the
next Approver is asked to act. Captured from the web app on 2026-09-28 (sent with no body); not yet
run from Bruno (`bruno/iam/requests/submit-my-request.bru`, tagged `write`). Wrapped as
`biso24_submit_my_request`.

### Parameters

| Name | In | Type | Required | Values / format | Verified |
|---|---|---|---|---|---|
| `id` | path | string | yes | the Request `_id`, e.g. `6aba43f24f9fbf01bd0a77bd` | yes (web app) |

### Response `data`

Not verified. `biso24_submit_my_request` summarizes it when it looks like a Request (has `_id`),
otherwise the draft it looked up beforehand.

### Notes

- Unknown: whether it refuses other employees' Requests or Requests that are not `NEW`. Until
  verified, `biso24_submit_my_request` submits only the logged-in employee's own `NEW` Requests,
  looked up with `GET ?type=OWNER&status=NEW` first (ADR 0005).
- Expected afterwards (from Requests submitted in the web app): `status` `PROCESSING`, the first
  step `SENT`, the next `WAITING_FOR_APPROVAL`. A submitted Request can no longer be deleted; it
  can only be cancelled, through an endpoint not documented yet.

## Approve requests — `POST /v1/request-employees/multiple-approvals`

Approves Requests that await the logged-in employee's approval (the web app's "Duyệt"). Each
Request moves on to its next approval step, and `approvalForNextStep` becomes that step's
Approver. Captured from the web app approving two Requests on 2026-09-29; not yet run from Bruno
(`bruno/iam/requests/approve-requests.bru`, tagged `write`). Wrapped as `biso24_approve_requests`.

### Parameters

The body is an array with one item per Request:

| Name | Type | Required | Values / format | Verified |
|---|---|---|---|---|
| `_id` | string | yes | the Request `_id` | yes (web app) |
| `approvalForNextStep` | object | yes? | the Approver of the step after the current one: `employeeId`, `staffCode`, `fullName`, `departmentName`, `positionName`. The web app fills it in with no picker, and it matches `approvalSteps[current + 1].approvers[0]` | yes (web app) |

### Response `data`

Not verified.

### Notes

- Unknown: the body for a Request at its last step (no next step), what happens with a Request
  that does not await me, and whether one bad item fails the whole batch. Until these are verified,
  `biso24_approve_requests` approves only Requests found in `GET ?type=RESPONSIBLE`, forwarded to
  a next step with exactly one approver. It refuses the whole call otherwise (ADR 0006).
- Rejecting is a separate endpoint, not documented yet.

## List request types — `GET /v1/request-managements`

The Request types configured for the organization. Not paginated.

### Response `data` (partial)

An array of request types.

| Field | Type | Notes |
|---|---|---|
| `_id` | string | ObjectId; a Request's `requestCategoryId` |
| `code` | string | see the codes below; a Request's `requestCategoryCode` |
| `title` | string | display name (Vietnamese) |

Codes seen (tenant `gtel-ots`):

| `code` | `title` |
|---|---|
| `WORKING_REMOTELY` | Đăng ký làm việc từ xa |
| `OVERTIME` | Đăng ký làm thêm |
| `UPDATE_ATTENDANCE` | Đề nghị cập nhật chấm công |
| `PROJECT_ALLOWANCE` | Đăng ký phụ cấp dự án |
| `LATE_ARRIVAL_EARLY_DEPARTURE` | Đăng ký đi muộn và về sớm |
| `LEAVE` | Đơn xin nghỉ phép |
| `BUSINESS_TRIP` | Đề nghị đi công tác |
| `REQUEST_SWAP_SHIFT` | Đề nghị đổi ca |

## List requests — `GET /v1/request-employees`

Paginated list of Requests seen by the logged-in employee (identified by the token), newest first.
`type` picks the list: the web app's tab "Đơn của tôi" (`OWNER`) or "Đơn cần duyệt" (`RESPONSIBLE`).
Filters combine with AND.

### Parameters

| Name | In | Type | Required | Values / format | Verified |
|---|---|---|---|---|---|
| `type` | query | string | no | `OWNER` = filed by me (default when omitted); `RESPONSIBLE` = other employees' requests awaiting my approval | yes |
| `page` | query | integer | no | starts at 1 | yes |
| `limit` | query | integer | no | web app uses 20 | yes |
| `status` | query | string | no | `NEW` = Lưu nháp, `PROCESSING` = Đang thực hiện, `APPROVED` = Đã duyệt, `REJECTED` = Từ chối; unknown values return 0 rows. Unreliable with `RESPONSIBLE` (see Notes) | yes |
| `requestCategoryCode` | query | string | no | a request type `code` (filter "Loại phiếu"; what the web app sends) | yes |
| `requestCategoryId` | query | string | no | a request type `_id` | yes |
| `fromRegistrationDate` | query | string | no | `YYYY-MM-DD`; lower bound on `registrationDate` | yes |
| `toRegistrationDate` | query | string | no | `YYYY-MM-DD`; upper bound on `registrationDate` | yes |
| `from` | query | string | no | `YYYY-MM-DD` or ISO datetime; range on `requestData.from`/`to`, so only types that have them (e.g. `LEAVE`) match; needs `to` | yes |
| `to` | query | string | no | as `from`; needs `from` | yes |
| `q` | query | string | no | search box "Tìm kiếm..."; matched nothing on employee name, staff code or notes, so the field is unknown | partly |
| `employeeId` | query | string | no | ObjectId; in the web app whitelist, not in its UI | no |
| `departmentId` | query | string | no | ObjectId; in the web app whitelist, not in its UI | no |
| `positionId` | query | string | no | ObjectId; in the web app whitelist, not in its UI | no |
| `approval` | query | | no | in the web app whitelist; `approval=true` returns HTTP 500 | no |

### Response `data` (partial)

The standard page (`data`, `total`, `limit`, `page`, `totalPages`) plus:

| Field | Type | Notes |
|---|---|---|
| `totalPendingApproval` | integer | requests awaiting MY approval; the same number for any `type`, not my own open requests |

Each item in `data`:

| Field | Type | Notes |
|---|---|---|
| `_id` | string | ObjectId |
| `requestCategoryId` | string | request type `_id` |
| `requestCategoryCode` | string | request type `code` |
| `registrationDate` | string (ISO datetime) | when the request was filed |
| `employeeId` | string | the requester's id |
| `employeeDetail` | object | the requester: `employeeId`, `staffCode`, `fullName`, `departmentId`, `departmentName`, `positionId`, `positionName`, `avatar`, `gender` |
| `status` | string | `NEW`, `PROCESSING`, `APPROVED`, `REJECTED` |
| `approvalSteps` | array | `stepIndex`, `stepTitle`, `status` (`NEW`, `SENT`, `WAITING_FOR_APPROVAL`, `APPROVED`, `REJECTED`, `NOT_STARTED`), `conditions`, plus the fields below |
| `approvalSteps[].approvers` | array | who acts at that step, resolved when the Request is filed, even for steps `NOT_STARTED`: `employeeId`, `staffCode`, `fullName`, `departmentName`, `positionName`, `avatar`, `companyEmail`. Step 1 ("Tạo đơn") lists the requester |
| `approvalSteps[].approvalConfig` | string or null | how the approvers were picked: `BY_SELECTED` (the requester picked them), `BY_POSITION_LEVEL` (by `positionLevelCode`, e.g. `PHO_PHONG`, `TRUONG_PHONG`) |
| `approvalSteps[].approvedBy` | object or null | who acted at that step, once they have |
| `approvalForNextStep` | object or null | the next Approver (`employeeId`, `staffCode`, `fullName`); kept even on finished requests |
| `requestData` | object | depends on the type; see below |
| `notes` | string | |
| `files` | array | attachments |
| `priority`, `approvedBy`, `createdBy`, `modifiedBy`, `orgIds`, `id`, `_destroy` | | not used yet |
| `createdAt`, `updatedAt` | string (ISO datetime) | |

`requestData` fields seen:

| Type | Fields |
|---|---|
| `UPDATE_ATTENDANCE` | `workingDate` (`YYYY-MM-DD`), `workShiftItem` (`name`, `code`), `timeIn`, `timeOut` (`HH:mm:ss`) |
| `LEAVE` | `from`, `to` (`YYYY-MM-DD`), `leaveDayDetails[]` (`day` as `DD/MM/YYYY`, `option` e.g. `ALL_DAY`, `NOON_SHIFT`), `leaveTypeName` |

### Notes

- `type=RESPONSIBLE` lists only requests still awaiting my approval (all `PROCESSING`), with no
  history of those I approved or rejected; its `total` equals `totalPendingApproval`.
- With `type=RESPONSIBLE`, `status=APPROVED`/`REJECTED` return 0 rows and `status=NEW` returned
  more rows than no filter (16 vs 15). Don't filter that list by status.
- Other `request-employees` endpoints exist in the web app (`GET /{id}`, update, approve,
  reject, cancel, `dashboards`); not documented yet.
