import Link from "next/link";

import { Toaster } from "@/components/ui/sonner";
import { requireUserId } from "@/modules/auth/session";

import { SignOutButton } from "./sign-out-button";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/deals", label: "Deals" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth alongside proxy.ts route protection.
  await requireUserId();

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-6">
            <Link href="/" className="font-semibold">
              Streamer Tools
            </Link>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <Toaster />
    </div>
  );
}
