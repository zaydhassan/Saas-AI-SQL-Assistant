const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function apiFetch<T = any>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: any;
  }
): Promise<T> {
  const token = localStorage.getItem("access_token");

  const res = await fetch(`${API_BASE}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "API error");
  }

  return res.status === 204 ? (null as T) : res.json();
}