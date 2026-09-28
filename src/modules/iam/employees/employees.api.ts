import type { Biso24Client } from "../../../core/http/biso24-client.js";

export interface GetEmployeeParams {
  id: string;
  histories: boolean;
  profiles: boolean;
}

export function getEmployee(
  client: Biso24Client,
  { id, histories, profiles }: GetEmployeeParams,
): Promise<unknown> {
  return client.get(`v1/employees/${encodeURIComponent(id)}`, {
    histories,
    profiles,
  });
}
