import type { Biso24Client } from "#core/http/biso24-client";

/** One Request as returned by `GET /v1/request-employees` (fields we read). */
export interface EmployeeRequest {
  _id: string;
  requestCategoryId?: string;
  requestCategoryCode?: string;
  approvalSteps?: { stepTitle?: string; status?: string }[];
  /** Shape depends on the Request type; these are the date fields seen so far. */
  requestData?: {
    /** UPDATE_ATTENDANCE */
    workingDate?: string;
    /** LEAVE */
    from?: string;
    to?: string;
    leaveDayDetails?: { day: string; option?: string }[];
  };
  notes?: string;
  status?: string;
  approvalForNextStep?: { fullName?: string; staffCode?: string } | null;
  createdAt?: string;
}

/** A Request type from `GET /v1/request-managements`; `_id` is a Request's requestCategoryId. */
export interface RequestType {
  _id: string;
  code?: string;
  title?: string;
}

/** Page-based list returned by `GET /v1/request-employees`. */
export interface RequestEmployeePage {
  data: EmployeeRequest[];
  total: number;
  limit: number;
  page: number;
  totalPages: number;
  totalPendingApproval?: number;
}

export interface ListMyRequestsParams {
  type: string;
  page: number;
  limit: number;
}

/** Requests (leave, overtime...) of the logged-in employee. */
export function listMyRequests(
  client: Biso24Client,
  { type, page, limit }: ListMyRequestsParams,
): Promise<RequestEmployeePage> {
  return client.get("v1/request-employees", { type, page, limit });
}

/** Request types configured for the tenant. Not paginated. */
export function listRequestTypes(client: Biso24Client): Promise<RequestType[]> {
  return client.get("v1/request-managements");
}
