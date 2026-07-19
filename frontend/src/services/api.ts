const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

interface ApiError {
  error: string;
}

let authRedirectInProgress = false;

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && !authRedirectInProgress && !endpoint.startsWith("/auth/login")) {
    authRedirectInProgress = true;
    const { useAuthStore } = await import("@/store/auth-store");
    const { toast } = await import("@/lib/toast");
    useAuthStore.getState().logout();
    toast.error("Sesi login berakhir — silakan login ulang");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    const body: ApiError = text ? JSON.parse(text) : { error: "Unknown error" };
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : undefined as T;
}

export function get<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: "GET" });
}

export function post<T>(endpoint: string, data: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function put<T>(endpoint: string, data: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: "DELETE" });
}
