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
  approvalSteps?: {
    stepTitle?: string;
    status?: string;
    /** Who acts at this step, resolved when the Request was filed. */
    approvers?: ApproverCandidate[];
  }[];
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

/**
 * Deletes Requests by id. It is not verified whether the API refuses other
 * employees' Requests, so callers must check ownership first (ADR 0005).
 * Response shape not verified yet.
 */
export function deleteRequests(
  client: Biso24Client,
  ids: string[],
): Promise<unknown> {
  return client.request("v1/request-employees", {
    method: "DELETE",
    body: ids,
  });
}

/**
 * Submits a draft Request for approval (the web app's "Gửi duyệt"). Captured
 * from the web app; like deletion, callers must check ownership first
 * (ADR 0005). Response shape not verified yet.
 */
export function submitRequest(
  client: Biso24Client,
  id: string,
): Promise<unknown> {
  return client.request(
    `v1/request-employees/${encodeURIComponent(id)}/send-request`,
    { method: "PUT" },
  );
}

/**
 * Approves Requests awaiting the logged-in employee's approval (the web app's
 * "Duyệt"), each forwarded to `approvalForNextStep`, the approver of its next
 * step. Callers must check that each Request awaits me (ADR 0006). The body
 * for a Request's last step and the response shape are not verified yet.
 */
export function approveRequests(
  client: Biso24Client,
  items: { _id: string; approvalForNextStep: NextApprover }[],
): Promise<unknown> {
  return client.post("v1/request-employees/multiple-approvals", items);
}

/** The next step's Approver, as the web app sends it when approving. */
export type NextApprover = Pick<
  ApproverCandidate,
  "employeeId" | "staffCode" | "fullName" | "departmentName" | "positionName"
>;

/** An Employee who can be picked as the next Approver when filing a Request. */
export interface ApproverCandidate {
  employeeId: string;
  staffCode?: string;
  fullName?: string;
  avatar?: string;
  personalEmail?: string;
  companyEmail?: string;
  departmentName?: string;
  positionName?: string;
}

/**
 * Employees the logged-in employee may pick as the first Approver of a new
 * Request of this type, for the Work shift the Request is about. The web app
 * also sends `employeeId`; the API takes it from the token when omitted.
 */
export function listApproverCandidates(
  client: Biso24Client,
  {
    requestTypeId,
    workShiftId,
  }: { requestTypeId: string; workShiftId: string },
): Promise<ApproverCandidate[]> {
  return client.post(
    `v1/request-employees/${encodeURIComponent(requestTypeId)}/approve-details-for-next-steps`,
    { workShift: workShiftId },
  );
}

/** Body of `POST /v1/request-employees` for an Attendance correction, as the web app sends it. */
export interface NewAttendanceCorrection {
  /** When it was filed (ISO datetime). */
  registrationDate: string;
  requestCategoryId: string;
  requestCategoryCode: "UPDATE_ATTENDANCE";
  requestData: {
    /** YYYY-MM-DD */
    workingDate: string;
    workShiftItem: { code?: string; workShiftItemId: string; name?: string };
    /** HH:mm:ss */
    timeIn: string;
    timeOut: string;
  };
  notes: string;
  files: never[];
  approvalForNextStep: ApproverCandidate;
}

/** Files a Request as a draft (status NEW); submitting it for approval is a separate step. */
export function createRequest(
  client: Biso24Client,
  body: NewAttendanceCorrection,
): Promise<EmployeeRequest> {
  return client.post("v1/request-employees", body);
}

/** Request types configured for the tenant. Not paginated. */
export function listRequestTypes(client: Biso24Client): Promise<RequestType[]> {
  return client.get("v1/request-managements");
}
