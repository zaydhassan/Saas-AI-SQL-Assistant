"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Bell, Check, CheckCheck, BellOff } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { subscribe as subscribeWs } from "@/lib/ws";

type Notification = {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  read: boolean;
  created_at?: string | null;
};

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_COLOR: Record<string, string> = {
  alert: "#ef4444",
  anomaly: "#f59e0b",
  briefing: "#8b5cf6",
  info: "#6366f1",
};

export default function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const [items, setItems] = React.useState<Notification[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const refreshCount = React.useCallback(async () => {
    try {
      const r = await apiFetch<{ count: number }>("/api/notifications/unread-count");
      setUnread(r.count);
    } catch {
      /* ignore */
    }
  }, []);

  // Initial + polling of unread count.
  React.useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 30000);
    const onVisible = () => document.visibilityState === "visible" && refreshCount();
    document.addEventListener("visibilitychange", onVisible);

    // Live push: WebSocket subscription updates the unread badge instantly and
    // fires a Linear-style toast for each new notification. Falls back to the
    // 30s polling above if the socket can't connect.
    const unsub = subscribeWs((ev) => {
      if (ev.type === "notification" && ev.notification) {
        const n = ev.notification as Notification;
        if (typeof ev.unread === "number") setUnread(ev.unread);
        else setUnread((u) => u + (n.read ? 0 : 1));
        setItems((prev) => {
          if (prev.some((x) => x.id === n.id)) return prev;
          return [n, ...prev].slice(0, 30);
        });
        // Linear-like toast: brief, themed by type, slides in.
        const color = TYPE_COLOR[n.type] ?? "#6366f1";
        toast(n.title, {
          description: n.body ?? undefined,
          duration: 4500,
          style: {
            borderLeft: `3px solid ${color}`,
            background: "rgba(10,14,35,0.92)",
            color: "#fff",
          },
        });
      } else if (typeof ev.unread === "number") {
        setUnread(ev.unread);
      }
    });

    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      unsub();
    };
  }, [refreshCount]);

  const loadList = React.useCallback(async () => {
    try {
      const r = await apiFetch<Notification[]>("/api/notifications?limit=20");
      setItems(r);
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  React.useEffect(() => {
    if (open && !loaded) loadList();
  }, [open, loaded, loadList]);

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function markRead(n: Notification) {
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setUnread((u) => Math.max(0, u - (n.read ? 0 : 1)));
    try {
      await apiFetch(`/api/notifications/${n.id}/read`, { method: "POST" });
    } catch {
      /* ignore */
    }
  }

  async function markAll() {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/20"
        style={{
          boxShadow: "0 0 0 1px rgba(255,255,255,0.12), 0 8px 24px rgba(99,102,241,0.25)",
          background: "linear-gradient(135deg, rgba(99,102,241,0.55), rgba(139,92,246,0.45))",
          border: "1px solid rgba(255,255,255,0.22)",
        }}
      >
        <Bell
          size={20}
          fill="currentColor"
          strokeWidth={1.5}
          className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.65)]"
        />
        {unread > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ background: "#8b5cf6", boxShadow: "0 0 8px #8b5cf6" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-[var(--radius-lg)]"
            style={{
              background: "rgba(10,14,35,0.96)",
              border: "1px solid var(--border-soft)",
              backdropFilter: "blur(20px) saturate(150%)",
              WebkitBackdropFilter: "blur(20px) saturate(150%)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border-soft)" }}>
              <span className="text-[13px] font-semibold text-white">Notifications</span>
              {unread > 0 && (
                <button type="button" onClick={markAll} className="flex items-center gap-1 text-[11px] hover:text-white" style={{ color: "var(--muted)" }}>
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {!loaded ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton shimmer h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <BellOff size={22} style={{ color: "var(--muted-2)" }} />
                  <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>You're all caught up</p>
                </div>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markRead(n)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <span
                      className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: n.read ? "transparent" : TYPE_COLOR[n.type] ?? "#6366f1",
                        boxShadow: n.read ? "none" : `0 0 8px ${TYPE_COLOR[n.type] ?? "#6366f1"}`,
                        border: n.read ? "1px solid var(--border-soft)" : "none",
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-[12.5px] ${n.read ? "" : "font-semibold"} text-white`}>{n.title}</span>
                        {!n.read && <Check size={12} className="shrink-0 text-[var(--muted-2)]" />}
                      </span>
                      {n.body && (
                        <span className="mt-0.5 block line-clamp-2 text-[11.5px] leading-snug" style={{ color: "var(--muted)" }}>
                          {n.body}
                        </span>
                      )}
                      <span className="mt-1 block text-[10px]" style={{ color: "var(--muted-2)" }}>{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
