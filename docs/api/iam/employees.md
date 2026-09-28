# iam / employees

Code: `src/modules/iam/employees/`. Bruno: `bruno/iam/employees/`.

## Get an employee — `GET /v1/employees/{id}`

One employee's record.

### Parameters

| Name | In | Type | Required | Values / format | Verified |
|---|---|---|---|---|---|
| `id` | path | string | yes | employee ObjectId; the logged-in employee's is the JWT `id` claim | yes |
| `histories` | query | boolean | no | `true` = include the work history | yes |
| `profiles` | query | boolean | no | `true` = include the profile records | yes |

### Response `data`

The employee object. Its fields are not documented yet.
