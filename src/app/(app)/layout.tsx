import { Toaster } from "@/components/ui/sonner";
import { requireUserId } from "@/modules/auth/session";

import { AppNav } from "./app-nav";
import { SignOutButton } from "./sign-out-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth alongside proxy.ts route protection.
  await requireUserId();

  return (
    <div className="bg-muted/40 min-h-screen md:flex">
      {/* Sidebar (desktop) / top bar (mobile) */}
      <aside className="bg-background flex items-center justify-between gap-2 border-b px-4 py-2 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:flex-col md:items-stretch md:justify-start md:border-r md:border-b-0 md:px-3 md:py-4">
        <div className="flex items-center gap-2 md:mb-6 md:px-2">
          <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md text-sm font-bold">
            S
          </div>
          <span className="font-semibold tracking-tight">Streamer Tools</span>
        </div>
        <AppNav />
        <div className="md:mt-auto md:border-t md:pt-3">
          <SignOutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      <Toaster />
    </div>
  );
}
