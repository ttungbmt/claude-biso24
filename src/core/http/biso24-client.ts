import { REQUEST_TIMEOUT_MS } from "../../constants";
import { Biso24ApiError } from "./errors";
import type { TokenProvider } from "./session-auth";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryParams = Record<string, string | number | boolean | undefined>;

export interface RequestOptions {
  method?: HttpMethod;
  query?: QueryParams;
  body?: unknown;
}

export interface Biso24ClientOptions {
  /** Base URL of one Biso24 service, e.g. https://iam.biso24.org */
  baseUrl: string;
  /** Tenant, sent as the `domain` header. */
  domain: string;
  /** Supplies the Bearer token. */
  auth: TokenProvider;
}

/** Biso24 wraps every JSON response in this envelope. */
interface Envelope {
  success: boolean;
  statusCode?: number | string;
  message?: string;
  data: unknown;
}

/**
 * HTTP client for a single Biso24 service. Unwraps the response envelope and,
 * on a 401, logs in again once and retries.
 */
export class Biso24Client {
  constructor(
    private readonly options: Biso24ClientOptions,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { auth } = this.options;
    const token = await auth.getToken();
    try {
      return await this.send<T>(path, options, token);
    } catch (error) {
      if (!(error instanceof Biso24ApiError && error.status === 401)) {
        throw error;
      }
      auth.invalidate(token);
      return this.send<T>(path, options, await auth.getToken());
    }
  }

  get<T>(path: string, query?: QueryParams): Promise<T> {
    return this.request<T>(path, { method: "GET", query });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }

  private async send<T>(
    path: string,
    { method = "GET", query, body }: RequestOptions,
    token: string,
  ): Promise<T> {
    const url = new URL(`${this.options.baseUrl}/${path.replace(/^\/+/, "")}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const response = await this.fetchImpl(url, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        domain: this.options.domain,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return readResponse<T>(response, method, url);
  }
}

/**
 * Parses a Biso24 response: returns the envelope's `data` (or the raw body),
 * or throws Biso24ApiError on a non-2xx status.
 */
export async function readResponse<T>(
  response: Response,
  method: string,
  url: URL,
): Promise<T> {
  const text = await response.text();
  const data: unknown = text ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    const detail = isEnvelope(data) && data.message ? `: ${data.message}` : "";
    throw new Biso24ApiError(
      response.status,
      data,
      `${method} ${url.pathname} failed with status ${response.status}${detail}`,
    );
  }
  return (isEnvelope(data) ? data.data : data) as T;
}

function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "data" in value
  );
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
