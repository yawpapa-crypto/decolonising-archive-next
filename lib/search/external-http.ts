export type ExternalFetchErrorCode =
  | "timeout"
  | "network"
  | "rate_limit"
  | "server_error"
  | "client_error"
  | "parse_error"
  | "unknown";

export type ExternalFetchResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  durationMs: number;
  retryAttempted: boolean;
  error?: {
    code: ExternalFetchErrorCode;
    message: string;
    status?: number;
  };
};

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyFetchError(error: unknown, status?: number): ExternalFetchResult<never>["error"] {
  if (status === 429) {
    return { code: "rate_limit", message: "Rate limited by upstream API", status };
  }
  if (status && status >= 500) {
    return { code: "server_error", message: `Upstream server error (${status})`, status };
  }
  if (status && status >= 400) {
    return { code: "client_error", message: `Upstream rejected request (${status})`, status };
  }
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof Error && error.name === "AbortError") {
    return { code: "timeout", message: "Request timed out" };
  }
  if (/failed to fetch|fetch failed|networkerror|econnreset|etimedout/i.test(message)) {
    return { code: "network", message: "Network error reaching upstream API" };
  }
  return { code: "unknown", message: message || "Unknown fetch error" };
}

function shouldRetry(status: number, error: unknown, attempt: number, maxRetries: number): boolean {
  if (attempt >= maxRetries) return false;
  if (RETRYABLE_STATUS.has(status)) return true;
  const err = classifyFetchError(error, status);
  return err?.code === "timeout" || err?.code === "network";
}

export async function fetchExternalJson<T = unknown>(
  url: string,
  options: {
    timeoutMs?: number;
    headers?: Record<string, string>;
    maxRetries?: number;
    cacheSeconds?: number;
  } = {},
): Promise<ExternalFetchResult<T>> {
  const timeoutMs = options.timeoutMs ?? 12_000;
  const maxRetries = options.maxRetries ?? 1;
  const headers = {
    Accept: "application/json",
    "User-Agent": "DecolonisingArchive/1.0 (research discovery; mailto:archive@ared.design)",
    ...options.headers,
  };

  let retryAttempted = false;
  const started = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (attempt > 0) {
      retryAttempted = true;
      await sleep(attempt === 1 ? 500 : 1500);
    }

    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
        next: options.cacheSeconds ? { revalidate: options.cacheSeconds } : undefined,
      });

      const status = response.status;
      if (!response.ok && shouldRetry(status, null, attempt, maxRetries)) {
        continue;
      }

      let data: T | null = null;
      try {
        data = (await response.json()) as T;
      } catch (parseError) {
        return {
          ok: false,
          status,
          data: null,
          durationMs: Date.now() - started,
          retryAttempted,
          error: {
            code: "parse_error",
            message: parseError instanceof Error ? parseError.message : "Invalid JSON from upstream",
            status,
          },
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          status,
          data,
          durationMs: Date.now() - started,
          retryAttempted,
          error: classifyFetchError(null, status),
        };
      }

      return {
        ok: true,
        status,
        data,
        durationMs: Date.now() - started,
        retryAttempted,
      };
    } catch (error) {
      if (shouldRetry(0, error, attempt, maxRetries)) {
        continue;
      }
      return {
        ok: false,
        status: 0,
        data: null,
        durationMs: Date.now() - started,
        retryAttempted,
        error: classifyFetchError(error),
      };
    }
  }

  return {
    ok: false,
    status: 0,
    data: null,
    durationMs: Date.now() - started,
    retryAttempted,
    error: { code: "unknown", message: "Exhausted retries" },
  };
}
