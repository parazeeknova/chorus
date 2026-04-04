"use client";

import {
  BellIcon,
  CheckCircle2Icon,
  EyeIcon,
  HelpCircleIcon,
  Settings,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const menuItems = ["File", "Edit", "View", "Window", "Help"];
const islandChrome =
  "pointer-events-auto relative rounded-[1.35rem] border border-white/10 bg-zinc-950/68 shadow-[0_18px_50px_rgba(0,0,0,0.42)] backdrop-blur-2xl";

// ─── Notification types ────────────────────────────────────────────────────────
type NotifType = "review" | "question" | "done" | "warning";

interface Notification {
  body: string;
  id: number;
  read: boolean;
  /** e.g. "2 min ago" */
  time: string;
  title: string;
  type: NotifType;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    type: "review",
    title: "Review requested",
    body: 'Agent completed "Update color palette for dark mode" — changes are ready for your approval.',
    time: "just now",
    read: false,
  },
  {
    id: 2,
    type: "question",
    title: "Agent needs clarification",
    body: "Should the refresh token be stored in an httpOnly cookie or localStorage? Waiting on your call.",
    time: "3 min ago",
    read: false,
  },
  {
    id: 3,
    type: "done",
    title: "Task completed",
    body: '"Set up GitHub Actions CI/CD pipeline" finished successfully. 47 files changed.',
    time: "12 min ago",
    read: false,
  },
  {
    id: 4,
    type: "warning",
    title: "Rate limit approaching",
    body: 'The OpenCode session for "Real-time cursor tracking" is nearing its token budget.',
    time: "28 min ago",
    read: true,
  },
  {
    id: 5,
    type: "question",
    title: "Agent needs clarification",
    body: "Which pricing tiers should be listed on the landing page? Found 3 different configs — please specify.",
    time: "1 hr ago",
    read: true,
  },
];

const NOTIF_META: Record<
  NotifType,
  {
    icon: React.ComponentType<{ className?: string }>;
    dot: string;
    iconCls: string;
  }
> = {
  review: {
    icon: EyeIcon,
    dot: "bg-amber-400",
    iconCls: "text-amber-400/80",
  },
  question: {
    icon: HelpCircleIcon,
    dot: "bg-sky-400",
    iconCls: "text-sky-400/80",
  },
  done: {
    icon: CheckCircle2Icon,
    dot: "bg-emerald-400",
    iconCls: "text-emerald-400/80",
  },
  warning: {
    icon: TriangleAlertIcon,
    dot: "bg-rose-400",
    iconCls: "text-rose-400/75",
  },
};

// ─── NotificationPane ──────────────────────────────────────────────────────────
function NotificationPane({ onClose }: { onClose: () => void }) {
  const [notifs, setNotifs] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const unread = notifs.filter((n) => !n.read).length;

  function dismiss(id: number) {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div
      className={cn(
        "absolute top-[calc(100%+8px)] right-0 w-[340px] overflow-hidden rounded-2xl",
        "border border-white/10 bg-zinc-950/90 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-white/6 border-b px-4 py-3">
        <span className="flex-1 font-semibold text-[0.78rem] text-white/80 tracking-wide">
          Notifications
        </span>
        {unread > 0 && (
          <button
            className="rounded-md px-2 py-0.5 text-[0.62rem] text-white/35 transition-colors hover:text-white/60"
            onClick={markAllRead}
            type="button"
          >
            Mark all read
          </button>
        )}
        <button
          className="flex size-6 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/6 hover:text-white/60"
          onClick={onClose}
          type="button"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="flex max-h-[420px] flex-col divide-y divide-white/[0.04] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <BellIcon className="size-7 text-zinc-800" />
            <p className="text-[0.7rem] text-white/25">You're all caught up</p>
          </div>
        ) : (
          notifs.map((n) => {
            const meta = NOTIF_META[n.type];
            const Icon = meta.icon;
            return (
              <div
                className={cn(
                  "group relative flex gap-3 px-4 py-3.5 transition-colors",
                  n.read ? "bg-transparent" : "bg-white/[0.022]",
                  "hover:bg-white/[0.035]"
                )}
                key={n.id}
              >
                {/* unread dot */}
                {!n.read && (
                  <span
                    className={cn(
                      "absolute top-1/2 left-1.5 size-1.5 -translate-y-1/2 rounded-full",
                      meta.dot
                    )}
                  />
                )}

                {/* icon */}
                <div className="mt-0.5 shrink-0">
                  <Icon className={cn("size-4", meta.iconCls)} />
                </div>

                {/* text */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-medium text-[0.72rem] text-white/75">
                      {n.title}
                    </span>
                    <span className="ml-auto shrink-0 text-[0.6rem] text-white/25">
                      {n.time}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[0.67rem] text-white/38 leading-relaxed">
                    {n.body}
                  </p>
                </div>

                {/* dismiss */}
                <button
                  className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-md text-white/20 opacity-0 transition-all hover:bg-white/8 hover:text-white/50 group-hover:opacity-100"
                  onClick={() => dismiss(n.id)}
                  title="Dismiss"
                  type="button"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── AppHeader ─────────────────────────────────────────────────────────────────
export function AppHeader() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close pane on outside click
  useEffect(() => {
    if (!notifOpen) {
      return;
    }
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  const unreadCount = INITIAL_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="flex items-start justify-between gap-3">
        {/* ── Left island: logo + menu ── */}
        <div className={cn(islandChrome, "max-w-full")}>
          <div className="relative flex h-12 items-center gap-2 px-2">
            <div className="flex items-center gap-2 rounded-[1rem] border border-white/8 bg-zinc-900/78 px-3 py-2">
              <Image
                alt="Chorus logo"
                className="h-4.75 w-6 invert"
                height={19}
                loading="eager"
                src="/chrous.svg"
                width={24}
              />
              <span className="select-none font-medium text-sm text-white tracking-[0.01em]">
                Chorus
              </span>
            </div>

            <div className="h-6 w-px bg-white/10" />

            <nav className="flex min-w-0 items-center gap-1 overflow-x-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {menuItems.map((item) => {
                const isActive = activeMenu === item;

                return (
                  <button
                    className={cn(
                      "group relative shrink-0 rounded-xl px-3 py-2 text-sm text-zinc-300 transition duration-300 hover:text-white",
                      isActive && "text-white"
                    )}
                    key={item}
                    onClick={() => setActiveMenu(isActive ? null : item)}
                    onMouseEnter={() => activeMenu && setActiveMenu(item)}
                    type="button"
                  >
                    <span className="relative z-10">{item}</span>
                    <div
                      className={cn(
                        "absolute inset-0 rounded-xl border border-transparent bg-zinc-900/85 opacity-0 transition duration-300 group-hover:opacity-100",
                        isActive && "border-cyan-300/18 bg-zinc-900 opacity-100"
                      )}
                    />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* ── Right island: notifications + settings ── */}
        <div className={cn(islandChrome, "shrink-0")}>
          <div className="flex h-12 items-center divide-x divide-white/8">
            {/* Notification button */}
            <div className="relative" ref={notifRef}>
              <button
                aria-label="Notifications"
                className={cn(
                  "group relative flex h-12 w-12 items-center justify-center text-zinc-300 transition duration-300 hover:text-white",
                  notifOpen && "text-white"
                )}
                onClick={() => setNotifOpen((v) => !v)}
                type="button"
              >
                <div
                  className={cn(
                    "absolute inset-[5px] rounded-[1rem] border bg-zinc-900/80 transition duration-300",
                    notifOpen
                      ? "border-cyan-300/18 bg-zinc-900"
                      : "border-white/8 group-hover:border-cyan-300/18 group-hover:bg-zinc-900"
                  )}
                />
                <BellIcon
                  className={cn(
                    "relative z-10 h-4 w-4 transition duration-300",
                    notifOpen && "text-white"
                  )}
                />
                {/* Unread badge */}
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 flex size-3.5 items-center justify-center rounded-full bg-cyan-500 font-semibold text-[0.5rem] text-white shadow-[0_0_6px_rgba(6,182,212,0.6)]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Floating pane */}
              {notifOpen && (
                <NotificationPane onClose={() => setNotifOpen(false)} />
              )}
            </div>

            {/* Settings button */}
            <button
              aria-label="Settings"
              className="group relative flex h-12 w-12 items-center justify-center text-zinc-300 transition duration-300 hover:text-white"
              type="button"
            >
              <div className="absolute inset-[5px] rounded-[1rem] border border-white/8 bg-zinc-900/80 transition duration-300 group-hover:border-cyan-300/18 group-hover:bg-zinc-900" />
              <Settings className="relative z-10 h-4 w-4 transition duration-300 group-hover:rotate-45" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
