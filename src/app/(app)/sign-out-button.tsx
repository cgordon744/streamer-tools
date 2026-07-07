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
        title="Sign out"
        className="text-muted-foreground w-full justify-start gap-2.5 md:px-3 md:group-data-[state=collapsed]/sidebar:justify-center md:group-data-[state=collapsed]/sidebar:px-2"
      >
        <LogOut className="size-4 shrink-0" />
        <span className="hidden sm:inline md:group-data-[state=collapsed]/sidebar:hidden">
          Sign out
        </span>
      </Button>
    </form>
  );
}
