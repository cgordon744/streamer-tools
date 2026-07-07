import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logout } from "@/modules/auth/actions";

export function SignOutButton() {
  return (
    <form action={logout}>
      <Button
        variant="ghost"
        size="sm"
        type="submit"
        className="text-muted-foreground w-full justify-start gap-2.5 md:px-3"
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </form>
  );
}
