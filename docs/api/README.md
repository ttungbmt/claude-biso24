# Biso24 API reference

What we know about the Biso24 API, learned by trying it (Biso24 publishes no docs): the web app's
own requests, its JS bundle, and calls against the real API (ADR 0004). This is the source for a
future OpenAPI spec. Run the requests with Bruno (`pnpm api`, `bruno/`); record findings here.

## Services

| Service | Base URL | Reference |
|---|---|---|
| `iam` | `https://iam.biso24.org` (env `BISO24_IAM_URL`) | [iam/](iam/) |

A service is one Biso24 host, not a business domain: `iam` also serves HR data (employees,
timekeeping, work shifts, requests). Every path below starts with `/v1`.

| Resource | Endpoints |
|---|---|
| [iam/auth](iam/auth.md) | `POST /v1/auth/login` |
| [iam/employees](iam/employees.md) | `GET /v1/employees/{id}` |
| [iam/timekeeping](iam/timekeeping.md) | `GET /v1/timekeeping-employees/personal-data`, `GET /v1/timekeeping-employees/dashboard` |
| [iam/work-shifts](iam/work-shifts.md) | `GET /v1/work-shift-employees/work-shift-current-date` |
| [iam/requests](iam/requests.md) | `GET /v1/request-managements`, `GET`/`POST`/`DELETE /v1/request-employees`, `POST /v1/request-employees/{requestTypeId}/approve-details-for-next-steps` |

## Common conventions

### Headers

| Header | Value | Required |
|---|---|---|
| `domain` | Tenant domain, e.g. `acme.biso24.net` (env `BISO24_DOMAIN`) | every request, login included |
| `Authorization` | `Bearer <JWT>` from [login](iam/auth.md) | every request except login |
| `Accept` | `application/json` | recommended |

### Authentication

`POST /v1/auth/login` returns a JWT valid for about 24 h. There is no usable refresh flow: log in
again when it expires or a request returns 401. The JWT's `id` claim is the logged-in employee's id,
and endpoints described as "of the logged-in employee" identify them by the token alone.

### Response envelope

Every JSON response is wrapped:

```json
{ "success": true, "statusCode": "OK", "message": "OK", "data": <payload> }
```

Each endpoint below documents only `data`. On failure `success` is `false` and `message` explains.

### Pagination

Paginated lists take `page` (starts at 1) and `limit`, and return:

```json
{ "data": [ ... ], "total": 39, "limit": 20, "page": 1, "totalPages": 2 }
```

Unpaginated lists return a plain array in `data`.

## Endpoint template

Each resource file has one section per endpoint, laid out to map onto an OpenAPI operation:

```markdown
## <Summary> — `<METHOD> <path>`

<What it returns, when to use it; web app screen that calls it, if any.>

### Parameters

| Name | In | Type | Required | Values / format | Verified |
|---|---|---|---|---|---|

### Request body            (only for POST/PUT)

### Response `data`

| Field | Type | Notes |
|---|---|---|

### Notes                   (odd behaviour, open questions)
```

`Verified` is `yes` when a call against the real API showed the effect, `partly` or `no` otherwise.
