import type { Biso24Client } from "#core/http/biso24-client";

/** One Request as returned by `GET /v1/request-employees` (fields we read). */
export interface EmployeeRequest {
  _id: string;
  requestCategoryId?: string;
  requestCategoryCode?: string;
  /** The employee who filed the Request. */
  employeeDetail?: {
    fullName?: string;
    staffCode?: string;
    departmentName?: string;
  };
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
  /** Requests awaiting the logged-in employee's approval, whatever `type` was asked. */
  totalPendingApproval?: number;
}

export type RequestStatus = "NEW" | "PROCESSING" | "APPROVED" | "REJECTED";

export interface ListRequestsParams {
  page: number;
  limit: number;
  status?: RequestStatus;
  /** A request type's `code`, e.g. LEAVE. */
  requestCategoryCode?: string;
}

/** Requests (leave, overtime...) filed by the logged-in employee. */
export function listMyRequests(
  client: Biso24Client,
  params: ListRequestsParams,
): Promise<RequestEmployeePage> {
  return client.get("v1/request-employees", { type: "OWNER", ...params });
}

/**
 * Requests awaiting the logged-in employee's approval. Only open ones: Biso24
 * keeps no history here, and its `status` filter is unreliable for this list.
 */
export function listRequestsToApprove(
  client: Biso24Client,
  params: Omit<ListRequestsParams, "status">,
): Promise<RequestEmployeePage> {
  return client.get("v1/request-employees", { type: "RESPONSIBLE", ...params });
}

/** Request types configured for the tenant. Not paginated. */
export function listRequestTypes(client: Biso24Client): Promise<RequestType[]> {
  return client.get("v1/request-managements");
}
