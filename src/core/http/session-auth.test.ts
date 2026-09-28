import { describe, expect, it, vi } from "vitest";
import { fakeJwt } from "../../../test/helpers/fake-jwt.js";
import { Biso24AuthError } from "./errors.js";
import { SessionAuth } from "./session-auth.js";

const options = {
  iamUrl: "https://iam.test",
  domain: "acme.biso24.net",
  credentials: { email: "me@acme.test", password: "pw", orgId: "org1" },
};

function loginFetch(...tokens: string[]) {
  let i = 0;
  return vi.fn<typeof fetch>(
    async () =>
      new Response(
        JSON.stringify({
          success: true,
          data: { token: tokens[Math.min(i++, tokens.length - 1)] },
        }),
      ),
  );
}

describe("SessionAuth", () => {
  it("logs in with the account credentials", async () => {
    const token = fakeJwt(2_000_000_000);
    const fetchImpl = loginFetch(token);

    await expect(new SessionAuth(options, fetchImpl).getToken()).resolves.toBe(
      token,
    );

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(String(url)).toBe("https://iam.test/v1/auth/login");
    expect(init?.method).toBe("POST");
    expect(headers.domain).toBe("acme.biso24.net");
    expect(JSON.parse(String(init?.body))).toEqual({
      email: "me@acme.test",
      password: "pw",
      orgId: "org1",
      from: "WORK_SPACE",
    });
  });

  it("reuses the token until it is about to expire", async () => {
    let now = 1_000_000;
    const [first, second] = [fakeJwt(1_000 + 3600, "a"), fakeJwt(9e9, "b")];
    const fetchImpl = loginFetch(first, second);
    const auth = new SessionAuth(options, fetchImpl, () => now);

    expect(await auth.getToken()).toBe(first);
    now += 30 * 60_000;
    expect(await auth.getToken()).toBe(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    now = (1_000 + 3600) * 1000 - 30_000; // within the 60 s margin
    expect(await auth.getToken()).toBe(second);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("logs in once for concurrent callers", async () => {
    const fetchImpl = loginFetch(fakeJwt(9e9));
    const auth = new SessionAuth(options, fetchImpl);

    await Promise.all([auth.getToken(), auth.getToken(), auth.getToken()]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("logs in again after invalidate, but keeps a newer token", async () => {
    const [a, b] = [fakeJwt(9e9, "a"), fakeJwt(9e9, "b")];
    const auth = new SessionAuth(options, loginFetch(a, b));

    expect(await auth.getToken()).toBe(a);
    auth.invalidate(a);
    expect(await auth.getToken()).toBe(b);
    auth.invalidate(a); // stale: must not drop b
    expect(await auth.getToken()).toBe(b);
  });

  it("throws Biso24AuthError on bad credentials, then retries on the next call", async () => {
    const token = fakeJwt(9e9);
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            message: "Wrong password",
            data: null,
          }),
          { status: 400 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { token } })),
      );
    const auth = new SessionAuth(options, fetchImpl);

    const failure = auth.getToken();
    await expect(failure).rejects.toBeInstanceOf(Biso24AuthError);
    await expect(failure).rejects.toThrow(/Wrong password/);
    await expect(auth.getToken()).resolves.toBe(token);
  });
});
