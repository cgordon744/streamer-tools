"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: SunMoon },
] as const;

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Toggle theme"
          className="text-muted-foreground w-full justify-start gap-2.5 md:px-3 md:group-data-[state=collapsed]/sidebar:justify-center md:group-data-[state=collapsed]/sidebar:px-2"
        >
          <span className="relative size-4 shrink-0">
            <Sun className="absolute inset-0 size-4 scale-100 dark:scale-0" />
            <Moon className="absolute inset-0 size-4 scale-0 dark:scale-100" />
          </span>
          <span className="hidden sm:inline md:group-data-[state=collapsed]/sidebar:hidden">
            Theme
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
            <Icon className="size-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
