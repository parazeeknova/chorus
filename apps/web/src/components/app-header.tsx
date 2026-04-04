"use client";

import { FolderOpenIcon, Settings } from "lucide-react";
import Image from "next/image";
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

const menuItems = ["Edit", "View", "Window", "Help"];

export function AppHeader() {
  const {
    createBoardFromHistory,
    createBoardFromProject,
    isOpeningFolder,
    openFolder,
    previousWorkspaces,
    recentProjects,
  } = useWorkspace();

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
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-md px-3 py-1.5 text-black text-sm transition-colors hover:bg-zinc-100">
                File
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-72 rounded-xl border border-zinc-200 bg-white p-1.5 text-black shadow-2xl">
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm"
                  onClick={() => {
                    openFolder().catch((error) => {
                      console.error("Failed to open folder", error);
                    });
                  }}
                >
                  <FolderOpenIcon className="size-4" />
                  <span>{isOpeningFolder ? "Opening…" : "Open Folder..."}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="rounded-lg px-3 py-2 text-sm">
                    Previous Working
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="min-w-80 rounded-xl border border-zinc-200 bg-white p-1.5 text-black shadow-2xl">
                    {previousWorkspaces.length === 0 ? (
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>
                          No previous work yet
                        </DropdownMenuLabel>
                      </DropdownMenuGroup>
                    ) : (
                      previousWorkspaces.map((entry) => (
                        <DropdownMenuItem
                          className="cursor-pointer rounded-lg px-3 py-2 text-sm"
                          key={entry.id}
                          onClick={() => {
                            createBoardFromHistory(entry);
                          }}
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium text-sm text-zinc-900">
                              {entry.title}
                            </span>
                            <span className="truncate text-xs text-zinc-500">
                              {entry.repo.directory}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="rounded-lg px-3 py-2 text-sm">
                    Known Projects
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="min-w-80 rounded-xl border border-zinc-200 bg-white p-1.5 text-black shadow-2xl">
                    {recentProjects.length === 0 ? (
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>
                          No known projects yet
                        </DropdownMenuLabel>
                      </DropdownMenuGroup>
                    ) : (
                      recentProjects.map((project) => (
                        <DropdownMenuItem
                          className="cursor-pointer rounded-lg px-3 py-2 text-sm"
                          key={`${project.projectId ?? project.directory}`}
                          onClick={() => {
                            createBoardFromProject(project);
                          }}
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium text-sm text-zinc-900">
                              {project.projectName ??
                                project.directory
                                  .split("/")
                                  .filter(Boolean)
                                  .at(-1) ??
                                project.directory}
                            </span>
                            <span className="truncate text-xs text-zinc-500">
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
            {menuItems.map((item) => (
              <button
                className="rounded-md px-3 py-1.5 text-black text-sm transition-colors hover:bg-zinc-100"
                key={item}
                type="button"
              >
                {item}
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
