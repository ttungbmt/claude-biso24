# iam / auth

Code: `src/core/http/session-auth.ts` (auth is core, not a module). Bruno: `bruno/iam/auth/`.

## Log in — `POST /v1/auth/login`

Exchanges account credentials for a JWT. The only endpoint without `Authorization`; it still needs
the `domain` header.

### Request body

| Field | Type | Required | Values / format | Verified |
|---|---|---|---|---|
| `email` | string | yes | account email | yes |
| `password` | string | yes | | yes |
| `from` | string | yes | `WORK_SPACE` (what the web app sends) | yes |
| `orgId` | string | yes | organization ObjectId (env `BISO24_ORG_ID`) | yes |

### Response `data` (partial)

| Field | Type | Notes |
|---|---|---|
| `token` | string | JWT, ~24 h; claims include `id` (employee id) and `exp` |
| `refreshToken` | string | no usable refresh flow found |
| `employeeId` | object | the logged-in employee; `employeeId._id` is its id |
| `tenantInfo` | object | tenant details |
| other fields | | the user profile |

### Notes

- A missing or wrong credential returns `success: false`; the server treats it as an auth error.
