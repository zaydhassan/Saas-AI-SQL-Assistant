"use client";

/**
 * WebSocket client for live notifications.
 *
 * Phase 1 hardening: connects to /ws/notifications with a short-lived
 * single-use ticket obtained from POST /api/auth/ws-ticket (auth-gated),
 * rather than the old ?token=<jwt> query param (which leaked long-lived
 * access tokens into URLs). Auto-reconnects with backoff and re-mints a ticket
 * on each reconnect. Dispatches a `ws-notification` CustomEvent on every
 * inbound event so any listener (notification bell, toasts, pages) can react.
 * When no session exists or the socket can't be opened, callers silently fall
 * back to the existing 30s polling — nothing breaks.
 */

import { getCsrfToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// WebSocket base. When API_BASE is empty (same-origin HTTP via the Next proxy),
// derive the WS URL from the current page's host so the upgrade is same-origin
// too (Next dev rewrites forward /ws/* to the backend). WS auth is a single-use
// ticket in the query string, so no cookies are required on the socket.
function wsOrigin(): string {
  if (typeof window === "undefined") return "";
  if (API_BASE) return API_BASE.replace(/^http/, "ws");
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}`;
}

export type WsEvent = {
  type: string;
  notification?: any;
  unread?: number;
  [key: string]: any;
};

type Handler = (event: WsEvent) => void;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let attempt = 0;
let manualClose = false;
const handlers = new Set<Handler>();

async function fetchTicket(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(`${API_BASE}/api/auth/ws-ticket`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": getCsrfToken() || "",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.ticket || null;
  } catch {
    return null;
  }
}

function dispatch(event: WsEvent) {
  handlers.forEach((h) => {
    try {
      h(event);
    } catch {
      /* ignore handler errors */
    }
  });
  try {
    window.dispatchEvent(new CustomEvent("ws-notification", { detail: event }));
  } catch {
    /* ignore */
  }
}

function scheduleReconnect() {
  if (manualClose || reconnectTimer) return;
  const delay = Math.min(1000 * 2 ** attempt, 15000);
  attempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

export async function connect() {
  if (typeof window === "undefined") return;

  // Avoid stacking sockets.
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const ticket = await fetchTicket();
  if (!ticket) {
    // No session (401 from the ticket minter) — schedule a lazy retry in case
    // the user logs in shortly.
    scheduleReconnect();
    return;
  }

  const wsBase = wsOrigin();
  const url = `${wsBase}/ws/notifications?ticket=${encodeURIComponent(ticket)}`;

  manualClose = false;
  try {
    socket = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    attempt = 0;
  };

  socket.onmessage = (msg) => {
    try {
      const parsed = JSON.parse(msg.data) as WsEvent;
      dispatch(parsed);
    } catch {
      /* ignore non-JSON frames */
    }
  };

  socket.onclose = () => {
    socket = null;
    scheduleReconnect();
  };

  socket.onerror = () => {
    // onclose will follow and trigger reconnect.
    try {
      socket?.close();
    } catch {
      /* ignore */
    }
  };
}

export function disconnect() {
  manualClose = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    try {
      socket.close();
    } catch {
      /* ignore */
    }
    socket = null;
  }
  attempt = 0;
}

export function subscribe(handler: Handler): () => void {
  handlers.add(handler);
  // Lazily connect on first subscriber.
  if (typeof window !== "undefined" && !socket) connect();
  return () => handlers.delete(handler);
}