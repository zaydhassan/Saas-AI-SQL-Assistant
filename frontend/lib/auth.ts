// TOKEN HANDLING
export function saveToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function logout() {
  localStorage.removeItem("access_token");
  window.location.href = "/login";
}
export function getUserIdFromToken(): string | null {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub?.toString() || null;
  } catch (err) {
    console.error("Invalid token", err);
    return null;
  }
}