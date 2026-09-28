# iam / requests

Code: `src/modules/iam/requests/`. Bruno: `bruno/iam/requests/`.
Web app: "Quản lý đơn" (`/workspace/request-management?tab=OWNER|RESPONSIBLE`); its params come
from the whitelist in the web app's `requestService` JS chunk.

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
| `approvalSteps` | array | `stepIndex`, `stepTitle`, `status` (`NEW`, `SENT`, `WAITING_FOR_APPROVAL`, `APPROVED`, `REJECTED`, `NOT_STARTED`), `conditions` |
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
- Other `request-employees` endpoints exist in the web app (`GET /{id}`, create, update, delete,
  send, approve, reject, cancel, `multiple-approvals`, `dashboards`); the MCP server is read-only
  and none are documented yet.
