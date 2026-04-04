"use client";

import { Settings } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

const menuItems = ["File", "Edit", "View", "Window", "Help"];
const islandChrome =
  "pointer-events-auto relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-zinc-950/68 shadow-[0_18px_50px_rgba(0,0,0,0.42)] backdrop-blur-2xl";

export function AppHeader() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="flex items-start justify-between gap-3">
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

        <div className={cn(islandChrome, "shrink-0")}>
          <button
            aria-label="Settings"
            className="group relative flex h-12 w-12 items-center justify-center rounded-[1.35rem] text-zinc-300 transition duration-300 hover:text-white"
            type="button"
          >
            <div className="absolute inset-[5px] rounded-[1rem] border border-white/8 bg-zinc-900/80 transition duration-300 group-hover:border-cyan-300/18 group-hover:bg-zinc-900" />
            <Settings className="relative z-10 h-4 w-4 transition duration-300 group-hover:rotate-45" />
          </button>
        </div>
      </div>
    </header>
  );
}
