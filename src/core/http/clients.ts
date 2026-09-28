import type { Config } from "../../config";
import { Biso24Client } from "./biso24-client";
import { SessionAuth } from "./session-auth";

/** One client per Biso24 service. Add a field here when a new service is wrapped. */
export interface ApiClients {
  iam: Biso24Client;
}

export function createApiClients(
  config: Config,
  fetchImpl: typeof fetch = fetch,
): ApiClients {
  // One login session shared by every service client.
  const auth = new SessionAuth(config, fetchImpl);
  const common = { domain: config.domain, auth };
  return {
    iam: new Biso24Client({ baseUrl: config.iamUrl, ...common }, fetchImpl),
  };
}
