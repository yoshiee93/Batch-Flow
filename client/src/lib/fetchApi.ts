const API_BASE = "/api";

export class ApiValidationError extends Error {
  fields: Record<string, string>;
  status: number;
  constructor(message: string, fields: Record<string, string>, status = 400) {
    super(message);
    this.name = "ApiValidationError";
    this.fields = fields;
    this.status = status;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as Record<string, unknown>));
    const fields = (body as { fields?: unknown }).fields;
    if (fields && typeof fields === "object") {
      const map: Record<string, string> = {};
      for (const [k, v] of Object.entries(fields as Record<string, unknown>)) {
        if (typeof v === "string") map[k] = v;
      }
      const msg = (body as { error?: string }).error || "Validation failed";
      throw new ApiValidationError(msg, map, res.status);
    }
    const message = (body as { error?: string; message?: string }).error
      || (body as { message?: string }).message
      || (res.status === 403 ? "You don't have permission to do this." : "Request failed");
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}
