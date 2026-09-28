import { describe, expect, it, vi } from "vitest";
import { Biso24Client } from "./biso24-client";
import type { Biso24ApiError } from "./errors";
import type { TokenProvider } from "./session-auth";

/** Hands out token-1, token-2... each time the previous one is invalidated. */
function stubAuth() {
  let n = 1;
  return {
    getToken: vi.fn(async () => `token-${n}`),
    invalidate: vi.fn(() => {
      n++;
    }),
  } satisfies TokenProvider;
}

function client(fetchImpl: typeof fetch, auth = stubAuth()) {
  return new Biso24Client(
    { baseUrl: "https://iam.example.test", domain: "acme.biso24.net", auth },
    fetchImpl,
  );
}

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

function headersOf(fetchImpl: ReturnType<typeof vi.fn<typeof fetch>>, n = 0) {
  return (fetchImpl.mock.calls[n]?.[1]?.headers ?? {}) as Record<
    string,
    string
  >;
}

describe("Biso24Client", () => {
  it("sends the auth and tenant headers plus the query string", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      respond(200, { items: [] }),
    );

    const data = await client(fetchImpl).get("/v1/orders", {
      page: 2,
      q: undefined,
    });

    expect(data).toEqual({ items: [] });
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(
      "https://iam.example.test/v1/orders?page=2",
    );
    expect(headersOf(fetchImpl).Authorization).toBe("Bearer token-1");
    expect(headersOf(fetchImpl).domain).toBe("acme.biso24.net");
  });

  it("unwraps the response envelope", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      respond(200, { success: true, statusCode: 200, data: [{ id: 1 }] }),
    );

    await expect(client(fetchImpl).get("v1/things")).resolves.toEqual([
      { id: 1 },
    ]);
  });

  it("logs in again and retries once after a 401", async () => {
    const auth = stubAuth();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(respond(401, { success: false, data: null }))
      .mockResolvedValueOnce(respond(200, { success: true, data: "ok" }));

    await expect(client(fetchImpl, auth).get("v1/me")).resolves.toBe("ok");
    expect(auth.invalidate).toHaveBeenCalledWith("token-1");
    expect(headersOf(fetchImpl, 1).Authorization).toBe("Bearer token-2");
  });

  it("gives up after a second 401", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      respond(401, { success: false, data: null }),
    );

    await expect(client(fetchImpl).get("v1/me")).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws Biso24ApiError with the envelope message on a non-2xx status", async () => {
    const body = { success: false, message: "not found", data: null };
    const fetchImpl = vi.fn<typeof fetch>(async () => respond(404, body));

    await expect(client(fetchImpl).get("v1/orders/1")).rejects.toMatchObject({
      name: "Biso24ApiError",
      status: 404,
      body,
      message: "GET /v1/orders/1 failed with status 404: not found",
    } satisfies Partial<Biso24ApiError>);
  });
});
