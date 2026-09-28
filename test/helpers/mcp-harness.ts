import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { type Mock, vi } from "vitest";
import { createApiClients } from "../../src/core/http/clients";
import { createServer } from "../../src/server";
import { fakeJwt } from "./fake-jwt";

export const testConfig = {
  iamUrl: "https://iam.test",
  domain: "acme.biso24.net",
  credentials: { email: "me@acme.test", password: "pw", orgId: "org1" },
};

/** Token returned by the mocked login endpoint. */
export const TEST_TOKEN = fakeJwt(4_102_444_800);

const isLogin = (url: unknown) => String(url).endsWith("/v1/auth/login");

/**
 * Mock fetch: the login endpoint returns TEST_TOKEN; every other request
 * gets `body` wrapped in the Biso24 envelope.
 */
export function envelopeFetch(body: unknown, status = 200): Mock<typeof fetch> {
  return vi.fn<typeof fetch>(async (url) =>
    isLogin(url) ? loginResponse() : envelopeResponse(body, status),
  );
}

/**
 * Mock fetch keyed by URL path (e.g. "/v1/request-employees"), or by method
 * and path (e.g. "DELETE /v1/request-employees"), which wins: each route's
 * body is wrapped in the Biso24 envelope; unknown routes answer 404.
 */
export function routeFetch(
  routes: Record<string, unknown>,
): Mock<typeof fetch> {
  return vi.fn<typeof fetch>(async (url, init) => {
    if (isLogin(url)) return loginResponse();
    const { pathname } = new URL(String(url));
    const key = [`${init?.method ?? "GET"} ${pathname}`, pathname].find(
      (k) => k in routes,
    );
    return key ? envelopeResponse(routes[key]) : envelopeResponse(null, 404);
  });
}

function loginResponse() {
  return new Response(
    JSON.stringify({ success: true, data: { token: TEST_TOKEN } }),
  );
}

function envelopeResponse(body: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      success: status < 400,
      statusCode: status,
      message: status < 400 ? "OK" : "Request failed",
      data: body,
    }),
    { status },
  );
}

/** Starts the server with a mocked fetch and connects an MCP client to it. */
export async function connectTestClient(fetchMock: Mock<typeof fetch>) {
  const server = createServer(createApiClients(testConfig, fetchMock));
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

/** API (non-login) fetch calls. */
export function apiCalls(fetchMock: Mock<typeof fetch>) {
  return fetchMock.mock.calls.filter(([url]) => !isLogin(url));
}

/** URL, method, headers and body of the n-th API (non-login) fetch call. */
export function fetchCall(fetchMock: Mock<typeof fetch>, n = 0) {
  const [url, init] = apiCalls(fetchMock)[n] ?? [];
  return {
    url: new URL(String(url)),
    method: init?.method ?? "GET",
    headers: (init?.headers ?? {}) as Record<string, string>,
    body: init?.body,
  };
}

/** Text of the first content block of a tool result. */
export function resultText(result: Awaited<ReturnType<Client["callTool"]>>) {
  const [first] = result.content as { type: string; text: string }[];
  return first?.text ?? "";
}
