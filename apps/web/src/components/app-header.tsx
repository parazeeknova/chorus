"use client";

import {
  ArchiveIcon,
  BellIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronRightIcon,
  EyeIcon,
  HelpCircleIcon,
  MenuIcon,
  SendIcon,
  Settings,
  SquareIcon,
  TriangleAlertIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { cn } from "@/lib/utils";

const menuItems = ["Edit", "View", "Window", "Help"];
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

// ─── NotificationItem ──────────────────────────────────────────────────────────
function NotificationItem({
  notification: n,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: (id: number) => void;
}) {
  const meta = NOTIF_META[n.type];
  const Icon = meta.icon;
  const [answerOpen, setAnswerOpen] = useState(false);
  const [answer, setAnswer] = useState("");

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-0 px-4 py-3.5 transition-colors",
        n.read ? "bg-transparent" : "bg-white/[0.022]",
        "hover:bg-white/[0.035]"
      )}
    >
      {/* unread dot */}
      {!n.read && (
        <span
          className={cn(
            "absolute top-4 left-1.5 size-1.5 rounded-full",
            meta.dot
          )}
        />
      )}

      {/* top row: icon + text */}
      <div className="flex gap-3">
        {/* icon */}
        <div className="mt-0.5 shrink-0">
          <Icon className={cn("size-4", meta.iconCls)} />
        </div>

        {/* text */}
        <div className="min-w-0 flex-1 pr-6">
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
      </div>

      {/* CTAs */}
      <div className="mt-2.5 ml-7">
        {n.type === "review" && (
          <div className="flex gap-1.5">
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 py-1.5 font-medium text-[0.65rem] text-emerald-400 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/18 active:scale-[0.97]"
              onClick={() => onDismiss(n.id)}
              type="button"
            >
              <CheckIcon className="size-3" />
              Approve
            </button>
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/8 py-1.5 font-medium text-[0.65rem] text-rose-400/80 transition-all hover:border-rose-500/35 hover:bg-rose-500/15 active:scale-[0.97]"
              onClick={() => onDismiss(n.id)}
              type="button"
            >
              <XIcon className="size-3" />
              Reject
            </button>
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/6 bg-white/3 py-1.5 text-[0.65rem] text-white/30 transition-all hover:bg-white/6 hover:text-white/55 active:scale-[0.97]"
              type="button"
            >
              <ChevronRightIcon className="size-3" />
              View diff
            </button>
          </div>
        )}

        {n.type === "question" && !answerOpen && (
          <div className="flex gap-1.5">
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-sky-500/25 bg-sky-500/10 py-1.5 font-medium text-[0.65rem] text-sky-400 transition-all hover:border-sky-500/40 hover:bg-sky-500/18 active:scale-[0.97]"
              onClick={() => setAnswerOpen(true)}
              type="button"
            >
              <SendIcon className="size-3" />
              Answer
            </button>
          </div>
        )}

        {n.type === "question" && answerOpen && (
          <div className="flex flex-col gap-1.5">
            <textarea
              autoFocus
              className="w-full resize-none rounded-lg border border-sky-500/20 bg-sky-950/20 px-2.5 py-2 text-[0.67rem] text-white/70 placeholder-white/25 outline-none transition-all [scrollbar-width:none] focus:border-sky-500/35 focus:bg-sky-950/30 [&::-webkit-scrollbar]:hidden"
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer…"
              rows={2}
              value={answer}
            />
            <div className="flex gap-1.5">
              <button
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-sky-500/25 bg-sky-500/10 py-1.5 font-medium text-[0.65rem] text-sky-400 transition-all hover:border-sky-500/40 hover:bg-sky-500/18 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!answer.trim()}
                onClick={() => answer.trim() && onDismiss(n.id)}
                type="button"
              >
                <SendIcon className="size-3" />
                Send
              </button>
              <button
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/6 bg-white/3 py-1.5 text-[0.65rem] text-white/30 transition-all hover:bg-white/6 hover:text-white/55 active:scale-[0.97]"
                onClick={() => {
                  setAnswerOpen(false);
                  setAnswer("");
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {n.type === "done" && (
          <div className="flex gap-1.5">
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/8 bg-white/4 py-1.5 font-medium text-[0.65rem] text-white/55 transition-all hover:border-white/14 hover:bg-white/8 hover:text-white/80 active:scale-[0.97]"
              type="button"
            >
              <ChevronRightIcon className="size-3" />
              View changes
            </button>
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/6 py-1.5 font-medium text-[0.65rem] text-emerald-400/70 transition-all hover:border-emerald-500/28 hover:bg-emerald-500/12 hover:text-emerald-400 active:scale-[0.97]"
              onClick={() => onDismiss(n.id)}
              type="button"
            >
              <ArchiveIcon className="size-3" />
              Archive
            </button>
          </div>
        )}

        {n.type === "warning" && (
          <div className="flex gap-1.5">
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 py-1.5 font-medium text-[0.65rem] text-amber-400 transition-all hover:border-amber-500/40 hover:bg-amber-500/18 active:scale-[0.97]"
              type="button"
            >
              <ZapIcon className="size-3" />
              Extend budget
            </button>
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/8 py-1.5 font-medium text-[0.65rem] text-rose-400/80 transition-all hover:border-rose-500/35 hover:bg-rose-500/15 active:scale-[0.97]"
              onClick={() => onDismiss(n.id)}
              type="button"
            >
              <SquareIcon className="size-3" />
              Stop session
            </button>
          </div>
        )}
      </div>

      {/* dismiss */}
      <button
        className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-md text-white/20 opacity-0 transition-all hover:bg-white/8 hover:text-white/50 group-hover:opacity-100"
        onClick={() => onDismiss(n.id)}
        title="Dismiss"
        type="button"
      >
        <XIcon className="size-3" />
      </button>
    </div>
  );
}

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
        // On mobile: attach to viewport edges with a small margin
        // On sm+: fixed width anchored to the right of the button
        "absolute top-[calc(100%+8px)] right-0",
        "w-[calc(100vw-1.5rem)] max-w-[360px] sm:w-[360px]",
        "overflow-hidden rounded-2xl",
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
      <div className="flex max-h-[min(520px,calc(100dvh-7rem))] flex-col divide-y divide-white/[0.04] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <BellIcon className="size-7 text-zinc-800" />
            <p className="text-[0.7rem] text-white/25">You're all caught up</p>
          </div>
        ) : (
          notifs.map((n) => (
            <NotificationItem key={n.id} notification={n} onDismiss={dismiss} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── MobileMenuDrawer ──────────────────────────────────────────────────────────
function MobileMenuDrawer({
  open,
  onClose,
  onOpenFolder,
  isOpeningFolder,
  previousWorkspaces,
  recentProjects,
  createBoardFromHistory,
  createBoardFromProject,
}: {
  open: boolean;
  onClose: () => void;
  onOpenFolder: () => void;
  isOpeningFolder: boolean;
  previousWorkspaces: ReturnType<typeof useWorkspace>["previousWorkspaces"];
  recentProjects: ReturnType<typeof useWorkspace>["recentProjects"];
  createBoardFromHistory: ReturnType<
    typeof useWorkspace
  >["createBoardFromHistory"];
  createBoardFromProject: ReturnType<
    typeof useWorkspace
  >["createBoardFromProject"];
}) {
  // Lock body scroll while drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const allMenuItems = ["Edit", "View", "Window", "Help"];

  return (
    <>
      {/* Backdrop — full-screen button so keyboard/SR users can also close the drawer */}
      <button
        aria-label="Close menu"
        className="fixed inset-0 z-60 cursor-default bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      {/* Drawer panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-61 flex w-72 flex-col",
          "border-white/10 border-r bg-zinc-950/95 shadow-[4px_0_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
        )}
      >
        {/* Drawer header */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-white/8 border-b px-4">
          <div className="flex items-center gap-2">
            <Image
              alt="Chorus logo"
              className="h-5 w-6 invert"
              height={19}
              loading="eager"
              src="/chrous.svg"
              width={24}
            />
            <span className="select-none font-semibold text-sm text-white tracking-[0.02em]">
              Chorus
            </span>
          </div>
          <button
            className="flex size-7 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/8 hover:text-white/70"
            onClick={onClose}
            type="button"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Drawer content */}
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {/* File section */}
          <div className="mb-1">
            <p className="mb-1 px-2 font-semibold text-[0.6rem] text-white/25 uppercase tracking-widest">
              File
            </p>
            <button
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/6 hover:text-white"
              onClick={() => {
                onOpenFolder();
                onClose();
              }}
              type="button"
            >
              <span className="text-white/40">📁</span>
              {isOpeningFolder ? "Opening…" : "Open Folder…"}
            </button>

            {previousWorkspaces.length > 0 && (
              <>
                <p className="mt-3 mb-1 px-2 font-semibold text-[0.6rem] text-white/25 uppercase tracking-widest">
                  Previous Working
                </p>
                {previousWorkspaces.map((entry) => (
                  <button
                    className="flex w-full flex-col rounded-xl px-3 py-2 transition-colors hover:bg-white/6"
                    key={entry.id}
                    onClick={() => {
                      createBoardFromHistory(entry);
                      onClose();
                    }}
                    type="button"
                  >
                    <span className="truncate font-medium text-sm text-white/85">
                      {entry.title}
                    </span>
                    <span className="truncate text-[0.67rem] text-white/35">
                      {entry.repo.directory}
                    </span>
                  </button>
                ))}
              </>
            )}

            {recentProjects.length > 0 && (
              <>
                <p className="mt-3 mb-1 px-2 font-semibold text-[0.6rem] text-white/25 uppercase tracking-widest">
                  Known Projects
                </p>
                {recentProjects.map((project) => (
                  <button
                    className="flex w-full flex-col rounded-xl px-3 py-2 transition-colors hover:bg-white/6"
                    key={`${project.projectId ?? project.directory}`}
                    onClick={() => {
                      createBoardFromProject(project);
                      onClose();
                    }}
                    type="button"
                  >
                    <span className="truncate font-medium text-sm text-white/85">
                      {project.projectName ??
                        project.directory.split("/").filter(Boolean).at(-1) ??
                        project.directory}
                    </span>
                    <span className="truncate text-[0.67rem] text-white/35">
                      {project.directory}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="my-1 h-px bg-white/6" />

          {/* Other menu items */}
          <div>
            <p className="mb-1 px-2 font-semibold text-[0.6rem] text-white/25 uppercase tracking-widest">
              Menu
            </p>
            {allMenuItems.map((item) => (
              <button
                className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/6 hover:text-white"
                key={item}
                onClick={onClose}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── AppHeader ─────────────────────────────────────────────────────────────────
export function AppHeader() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const {
    createBoardFromHistory,
    createBoardFromProject,
    isOpeningFolder,
    openFolder,
    previousWorkspaces,
    recentProjects,
  } = useWorkspace();

  // Close notification pane on outside click
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
    <>
      {/* ── Mobile drawer ── */}
      <MobileMenuDrawer
        createBoardFromHistory={createBoardFromHistory}
        createBoardFromProject={createBoardFromProject}
        isOpeningFolder={isOpeningFolder}
        onClose={() => setMobileMenuOpen(false)}
        onOpenFolder={() => {
          openFolder().catch((error) => {
            console.error("Failed to open folder", error);
          });
        }}
        open={mobileMenuOpen}
        previousWorkspaces={previousWorkspaces}
        recentProjects={recentProjects}
      />

      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          {/* ── Left island: logo + nav ── */}
          <div className={cn(islandChrome, "min-w-0 shrink")}>
            <div className="relative flex h-12 min-w-0 items-center gap-2 px-2">
              {/* Logo pill — always visible */}
              <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/8 bg-zinc-900/78 px-3 py-2">
                <Image
                  alt="Chorus logo"
                  className="h-4.75 w-6 invert"
                  height={19}
                  loading="eager"
                  src="/chrous.svg"
                  width={24}
                />
                {/* Hide the wordmark on very small screens (<480px) */}
                <span className="hidden select-none font-medium text-sm text-white tracking-[0.01em] min-[480px]:inline">
                  Chorus
                </span>
              </div>

              {/* ── Mobile: hamburger button ── */}
              <button
                aria-label="Open menu"
                className={cn(
                  "group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-zinc-300 transition duration-300 hover:text-white sm:hidden"
                )}
                onClick={() => setMobileMenuOpen(true)}
                type="button"
              >
                <div className="absolute inset-0 rounded-xl border border-white/8 bg-zinc-900/80 opacity-0 transition duration-300 group-hover:opacity-100" />
                <MenuIcon className="relative z-10 size-4" />
              </button>

              {/* ── Desktop: divider + nav items ── */}
              <div className="hidden h-6 w-px shrink-0 bg-white/10 sm:block" />

              <nav className="hidden min-w-0 items-center gap-1 overflow-x-auto pr-1 [scrollbar-width:none] sm:flex [&::-webkit-scrollbar]:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      "group relative shrink-0 rounded-xl px-3 py-2 text-sm text-zinc-300 transition duration-300 hover:text-white"
                    )}
                  >
                    <span className="relative z-10">File</span>
                    <div className="absolute inset-0 rounded-xl border border-transparent bg-zinc-900/85 opacity-0 transition duration-300 group-hover:opacity-100" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-72 rounded-2xl border border-white/10 bg-[#111111]/96 p-1.5 text-white shadow-2xl backdrop-blur-xl">
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-white/85 focus:bg-white/10 focus:text-white"
                      onClick={() => {
                        openFolder().catch((error) => {
                          console.error("Failed to open folder", error);
                        });
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span>📁</span>
                        <span>
                          {isOpeningFolder ? "Opening…" : "Open Folder..."}
                        </span>
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/8" />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="rounded-lg px-3 py-2 text-sm text-white/85 focus:bg-white/10 focus:text-white data-[popup-open]:bg-white/10 data-[popup-open]:text-white">
                        Previous Working
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="min-w-80 rounded-2xl border border-white/10 bg-[#111111]/96 p-1.5 text-white shadow-2xl backdrop-blur-xl">
                        {previousWorkspaces.length === 0 ? (
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-white/40">
                              No previous work yet
                            </DropdownMenuLabel>
                          </DropdownMenuGroup>
                        ) : (
                          previousWorkspaces.map((entry) => (
                            <DropdownMenuItem
                              className="cursor-pointer rounded-lg px-3 py-2 text-sm text-white/85 focus:bg-white/10 focus:text-white"
                              key={entry.id}
                              onClick={() => {
                                createBoardFromHistory(entry);
                              }}
                            >
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate font-medium text-sm text-white/90">
                                  {entry.title}
                                </span>
                                <span className="truncate text-white/40 text-xs">
                                  {entry.repo.directory}
                                </span>
                              </div>
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="rounded-lg px-3 py-2 text-sm text-white/85 focus:bg-white/10 focus:text-white data-[popup-open]:bg-white/10 data-[popup-open]:text-white">
                        Known Projects
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="min-w-80 rounded-2xl border border-white/10 bg-[#111111]/96 p-1.5 text-white shadow-2xl backdrop-blur-xl">
                        {recentProjects.length === 0 ? (
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-white/40">
                              No known projects yet
                            </DropdownMenuLabel>
                          </DropdownMenuGroup>
                        ) : (
                          recentProjects.map((project) => (
                            <DropdownMenuItem
                              className="cursor-pointer rounded-lg px-3 py-2 text-sm text-white/85 focus:bg-white/10 focus:text-white"
                              key={`${project.projectId ?? project.directory}`}
                              onClick={() => {
                                createBoardFromProject(project);
                              }}
                            >
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate font-medium text-sm text-white/90">
                                  {project.projectName ??
                                    project.directory
                                      .split("/")
                                      .filter(Boolean)
                                      .at(-1) ??
                                    project.directory}
                                </span>
                                <span className="truncate text-white/40 text-xs">
                                  {project.directory}
                                </span>
                              </div>
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>

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
                          isActive &&
                            "border-cyan-300/18 bg-zinc-900 opacity-100"
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

                {/* Floating notification pane */}
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
    </>
  );
}
