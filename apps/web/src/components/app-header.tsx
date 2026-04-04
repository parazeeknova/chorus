"use client";

import { Settings } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

const menuItems = ["File", "Edit", "View", "Window", "Help"];

export function AppHeader() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-zinc-200 border-b bg-white">
      <div className="flex h-12 items-center justify-between px-4">
        {/* Left: Logo + App Name + Menu Items */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Image
              alt="Chorus logo"
              className="h-4.75 w-6"
              height={19}
              loading="eager"
              src="/chrous.svg"
              width={24}
            />
            <span className="select-none font-medium text-black text-sm">
              Chorus
            </span>
          </div>

          {/* Menu Items */}
          <nav className="flex items-center">
            {menuItems.map((item) => (
              <button
                className="group relative px-3 py-1.5 text-black text-sm transition-colors hover:bg-zinc-100"
                key={item}
                onClick={() => setActiveMenu(activeMenu === item ? null : item)}
                onMouseEnter={() => activeMenu && setActiveMenu(item)}
                type="button"
              >
                <span className="relative z-10">{item}</span>
                <div
                  className={`absolute inset-0 origin-left scale-x-0 bg-zinc-100 transition-transform duration-200 group-hover:scale-x-100 ${
                    activeMenu === item ? "scale-x-100" : ""
                  }`}
                />
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Settings Icon */}
        <button
          aria-label="Settings"
          className="group flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-zinc-100"
          type="button"
        >
          <Settings className="h-4 w-4 text-black transition-transform duration-200 group-hover:rotate-45" />
        </button>
      </div>
    </header>
  );
}
