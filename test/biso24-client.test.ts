import { describe, expect, it, vi } from "vitest";
import {
  type Biso24ApiError,
  Biso24Client,
} from "../src/services/biso24-client.js";

const config = { apiUrl: "https://api.example.test", apiKey: "secret" };

function mockFetch(status: number, body: unknown) {
  return vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify(body), { status }),
  );
}

describe("Biso24Client", () => {
  it("sends the auth header and query string", async () => {
    const fetchImpl = mockFetch(200, { items: [] });
    const client = new Biso24Client(config, fetchImpl);

    const data = await client.get("/orders", { page: 2, q: undefined });

    expect(data).toEqual({ items: [] });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(String(url)).toBe("https://api.example.test/orders?page=2");
    expect(headers.Authorization).toBe("Bearer secret");
  });

  it("throws Biso24ApiError on a non-2xx status", async () => {
    const client = new Biso24Client(
      config,
      mockFetch(404, { message: "not found" }),
    );

    await expect(client.get("orders/1")).rejects.toMatchObject({
      name: "Biso24ApiError",
      status: 404,
      body: { message: "not found" },
    } satisfies Partial<Biso24ApiError>);
  });
});
