import { ArrowUp, Book, FileText, Terminal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AutocompleteItem } from "@/hooks/use-autocomplete";

interface CommandPaletteProps {
  anchorRect: { top: number; left: number; width: number } | null;
  isLoading: boolean;
  items: AutocompleteItem[];
  onClose: () => void;
  onSelect: (item: AutocompleteItem) => void;
}

const ICONS = {
  command: Terminal,
  skill: Book,
  file: FileText,
};

export function CommandPalette({
  items,
  isLoading,
  onSelect,
  onClose,
  anchorRect,
}: CommandPaletteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const currentItems = itemsRef.current;
      if (currentItems.length === 0) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % currentItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + currentItems.length) % currentItems.length
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = currentItems[selectedIndex];
        if (selected) {
          onSelect(selected);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!anchorRect || items.length === 0) {
    return null;
  }

  const SIDE_PADDING = 8;
  const top = anchorRect.top - 4;
  const panelWidth = Math.min(
    Math.max(anchorRect.width, 320),
    window.innerWidth - SIDE_PADDING * 2
  );
  // Clamp left so we don't overflow the right edge of the viewport
  const clampedLeft = Math.min(
    anchorRect.left,
    window.innerWidth - panelWidth - SIDE_PADDING
  );
  const left = Math.max(SIDE_PADDING, clampedLeft);
  const width = panelWidth;

  return (
    <div
      className="fixed z-50 max-h-64 w-full overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl backdrop-blur-xl"
      style={{
        top,
        left,
        width,
        transform: "translateY(-100%)",
      }}
    >
      <div
        className="max-h-64 overflow-y-auto p-1"
        ref={listRef}
        role="listbox"
      >
        {isLoading ? (
          <div className="px-3 py-4 text-center text-white/40 text-xs">
            Loading...
          </div>
        ) : (
          items.map((item, index) => {
            const Icon = item.type ? ICONS[item.type] : FileText;
            return (
              <div
                aria-selected={index === selectedIndex}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-white/10 data-[selected=true]:bg-white/15"
                data-index={index}
                data-selected={index === selectedIndex}
                key={item.id}
                onClick={() => onSelect(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(item);
                  }
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                role="option"
                tabIndex={0}
              >
                <Icon className="h-4 w-4 shrink-0 text-white/50" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-white/90">
                    {item.label}
                  </div>
                  {item.description && (
                    <div className="truncate text-white/40 text-xs">
                      {item.description}
                    </div>
                  )}
                </div>
                {index === selectedIndex && (
                  <ArrowUp className="h-3 w-3 rotate-90 text-white/30" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
