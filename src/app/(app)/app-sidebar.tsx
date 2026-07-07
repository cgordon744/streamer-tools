"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const SIDEBAR_DEFAULT_WIDTH = 240;
export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 340;
const COLLAPSED_WIDTH = 64;

function clampWidth(value: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, value));
}

function persist(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

// Collapsed/width state lives in cookies so the server renders the correct
// sidebar on first paint (no flash). Children (nav, sign-out) react to the
// collapsed state via the group/sidebar data attribute.
export function AppSidebar({
  initialCollapsed,
  initialWidth,
  children,
}: {
  initialCollapsed: boolean;
  initialWidth: number;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [width, setWidth] = useState(clampWidth(initialWidth));
  const [resizing, setResizing] = useState(false);

  function toggle() {
    setCollapsed((prev) => {
      persist("sidebar-collapsed", prev ? "0" : "1");
      return !prev;
    });
  }

  function startResize(e: React.PointerEvent) {
    if (collapsed) return;
    e.preventDefault();
    setResizing(true);
    const onMove = (ev: PointerEvent) => setWidth(clampWidth(ev.clientX));
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setResizing(false);
      persist("sidebar-width", String(clampWidth(ev.clientX)));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function resetWidth() {
    setWidth(SIDEBAR_DEFAULT_WIDTH);
    persist("sidebar-width", String(SIDEBAR_DEFAULT_WIDTH));
  }

  return (
    <aside
      data-state={collapsed ? "collapsed" : "expanded"}
      // Inline width for md+; max-md:w-full! restores the mobile top bar.
      style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
      className={cn(
        "group/sidebar bg-background relative flex items-center justify-between gap-2 border-b px-4 py-2 max-md:w-full!",
        "md:sticky md:top-0 md:h-screen md:shrink-0 md:flex-col md:items-stretch md:justify-start md:border-r md:border-b-0 md:px-3 md:py-4",
        !resizing && "md:transition-[width] md:duration-200",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 md:mb-6 md:px-2",
          collapsed && "md:flex-col md:px-0",
        )}
      >
        <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-md text-sm font-bold">
          S
        </div>
        {collapsed ? null : (
          <span className="truncate font-semibold tracking-tight">
            Streamer Tools
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "text-muted-foreground hidden size-7 md:inline-flex",
            collapsed ? "md:mx-auto" : "md:ml-auto",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>

      {children}

      {/* Drag to resize; double-click to reset. Desktop + expanded only. */}
      {collapsed ? null : (
        <div
          role="separator"
          aria-orientation="vertical"
          onPointerDown={startResize}
          onDoubleClick={resetWidth}
          className="hover:bg-primary/20 absolute inset-y-0 -right-0.75 z-10 hidden w-1.5 cursor-col-resize transition-colors md:block"
        />
      )}
    </aside>
  );
}
