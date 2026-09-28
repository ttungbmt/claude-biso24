import type { Config } from "../config.js";
import { REQUEST_TIMEOUT_MS } from "../constants.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryParams = Record<string, string | number | boolean | undefined>;

export interface RequestOptions {
  method?: HttpMethod;
  query?: QueryParams;
  body?: unknown;
}

export class Biso24ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "Biso24ApiError";
  }
}

export class Biso24Client {
  constructor(
    private readonly config: Config,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", query, body } = options;
    const url = new URL(`${this.config.apiUrl}/${path.replace(/^\/+/, "")}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const response = await this.fetchImpl(url, {
      method,
      headers: {
        Accept: "application/json",
        // TODO: adjust to Biso24's actual authentication scheme.
        Authorization: `Bearer ${this.config.apiKey}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await response.text();
    const data: unknown = text ? safeJsonParse(text) : undefined;

    if (!response.ok) {
      throw new Biso24ApiError(
        response.status,
        data,
        `${method} ${url.pathname} failed with status ${response.status}`,
      );
    }
    return data as T;
  }

  get<T>(path: string, query?: QueryParams): Promise<T> {
    return this.request<T>(path, { method: "GET", query });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
