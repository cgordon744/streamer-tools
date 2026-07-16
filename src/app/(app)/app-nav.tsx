"use client";

import { Building2, IdCard, LayoutDashboard, Table2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/deals", label: "Deals", icon: Table2 },
  { href: "/sponsors", label: "Sponsors", icon: Building2 },
];

const MEDIA_KIT_LINK = { href: "/media-kit", label: "Media Kit", icon: IdCard };

export function AppNav({ showMediaKit }: { showMediaKit: boolean }) {
  const pathname = usePathname();
  const links = showMediaKit ? [...NAV_LINKS, MEDIA_KIT_LINK] : NAV_LINKS;

  return (
    <nav className="flex items-center gap-1 md:flex-col md:items-stretch">
      {links.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            title={link.label}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "md:group-data-[state=collapsed]/sidebar:justify-center md:group-data-[state=collapsed]/sidebar:px-2",
              active
                ? "bg-primary/5 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
            <span className="hidden sm:inline md:group-data-[state=collapsed]/sidebar:hidden">
              {link.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
