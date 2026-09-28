import type { Credentials } from "../../config.js";
import { REQUEST_TIMEOUT_MS } from "../../constants.js";
import { readResponse } from "./biso24-client.js";
import { Biso24ApiError, Biso24AuthError } from "./errors.js";

/** Supplies a valid Bearer token to Biso24Client. */
export interface TokenProvider {
  getToken(): Promise<string>;
  /** Called after a 401: forget `token` so the next getToken() logs in again. */
  invalidate(token: string): void;
}

export interface SessionAuthOptions {
  /** IAM base URL; hosts `POST /v1/auth/login`. */
  iamUrl: string;
  domain: string;
  credentials: Credentials;
}

/** Log in again this long before the JWT's `exp`. */
const EXPIRY_MARGIN_MS = 60_000;

interface Session {
  token: string;
  /** Epoch ms; undefined when the JWT has no `exp` (kept until a 401). */
  expiresAt?: number;
}

/**
 * Biso24 issues short-lived JWTs and has no usable refresh flow, so this logs
 * in with the account credentials, caches the token in memory and logs in
 * again when it is about to expire or the API rejects it.
 */
export class SessionAuth implements TokenProvider {
  private session?: Session;
  private pendingLogin?: Promise<Session>;

  constructor(
    private readonly options: SessionAuthOptions,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async getToken(): Promise<string> {
    if (this.session && this.isFresh(this.session)) return this.session.token;
    // Single-flight: concurrent callers share one login request.
    this.pendingLogin ??= this.login().finally(() => {
      this.pendingLogin = undefined;
    });
    this.session = await this.pendingLogin;
    return this.session.token;
  }

  invalidate(token: string): void {
    // Keep a newer token that another caller already obtained.
    if (this.session?.token === token) this.session = undefined;
  }

  private isFresh({ expiresAt }: Session): boolean {
    return expiresAt === undefined || this.now() < expiresAt - EXPIRY_MARGIN_MS;
  }

  private async login(): Promise<Session> {
    const { iamUrl, domain, credentials } = this.options;
    const url = new URL(`${iamUrl}/v1/auth/login`);
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        domain,
      },
      body: JSON.stringify({ ...credentials, from: "WORK_SPACE" }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    let data: { token?: unknown } | undefined;
    try {
      data = await readResponse(response, "POST", url);
    } catch (error) {
      if (error instanceof Biso24ApiError) {
        throw new Biso24AuthError(error.message, { cause: error });
      }
      throw error;
    }
    if (typeof data?.token !== "string" || !data.token) {
      throw new Biso24AuthError("Login response did not contain a token");
    }
    return { token: data.token, expiresAt: jwtExpiry(data.token) };
  }
}

/** The JWT's `exp` claim in epoch ms, if readable. */
function jwtExpiry(token: string): number | undefined {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}
