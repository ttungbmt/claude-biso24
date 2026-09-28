import type { Biso24Client } from "../../../core/http/biso24-client.js";

/** Page-based list returned by `GET /v1/request-employees`. */
export interface RequestEmployeePage {
  data: unknown[];
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
export function listRequestTypes(client: Biso24Client): Promise<unknown[]> {
  return client.get("v1/request-managements");
}
