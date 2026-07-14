import { cookies } from "next/headers";

import { ModeToggle } from "@/components/mode-toggle";
import { Toaster } from "@/components/ui/sonner";
import { requireUserId } from "@/core/auth/session";

import { AppNav } from "./app-nav";
import { AppSidebar, SIDEBAR_DEFAULT_WIDTH } from "./app-sidebar";
import { SignOutButton } from "./sign-out-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth alongside proxy.ts route protection.
  await requireUserId();

  const cookieStore = await cookies();
  const collapsed = cookieStore.get("sidebar-collapsed")?.value === "1";
  const storedWidth = Number(cookieStore.get("sidebar-width")?.value);
  const width = Number.isFinite(storedWidth)
    ? storedWidth
    : SIDEBAR_DEFAULT_WIDTH;

  return (
    <div className="bg-muted/40 min-h-screen md:flex">
      <AppSidebar initialCollapsed={collapsed} initialWidth={width}>
        <AppNav />
        <div className="flex items-center gap-1 md:mt-auto md:flex-col md:items-stretch md:gap-0 md:border-t md:pt-3">
          <ModeToggle />
          <SignOutButton />
        </div>
      </AppSidebar>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      <Toaster />
    </div>
  );
}
