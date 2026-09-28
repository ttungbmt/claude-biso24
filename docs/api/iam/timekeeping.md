# iam / timekeeping

Code: `src/modules/iam/timekeeping/`. Bruno: `bruno/iam/timekeeping/`.

## Get my timekeeping for a month — `GET /v1/timekeeping-employees/personal-data`

Timekeeping data of the logged-in employee (identified by the token) for one month.

### Parameters

| Name | In | Type | Required | Values / format | Verified |
|---|---|---|---|---|---|
| `month` | query | string | yes | 2 digits, `01`–`12` | yes |
| `year` | query | integer | yes | 4 digits | yes |

### Response `data`

Not documented yet.

## Get my yearly timekeeping summary — `GET /v1/timekeeping-employees/dashboard`

Yearly timekeeping summary of the logged-in employee (identified by the token).

### Parameters

| Name | In | Type | Required | Values / format | Verified |
|---|---|---|---|---|---|
| `year` | query | integer | yes | 4 digits | yes |

### Response `data`

Not documented yet.
