export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code = "") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Options = { method?: string; body?: unknown; signal?: AbortSignal };

export async function apiFetch(path: string, { method, body, signal }: Options = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: method ?? (body === undefined ? "GET" : "POST"),
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      credentials: "same-origin",
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError("网络连接失败，请检查网络后重试。", 0, "network");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(data?.error ?? `请求失败（${response.status}）`, response.status, data?.code ?? "");
  }
  return response;
}

export async function api<T>(path: string, options?: Options): Promise<T> {
  const response = await apiFetch(path, options);
  return (await response.json()) as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "出了点问题，请稍后再试。";
}
