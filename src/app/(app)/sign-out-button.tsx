import { Button } from "@/components/ui/button";
import { logout } from "@/modules/auth/actions";

export function SignOutButton() {
  return (
    <form action={logout}>
      <Button variant="ghost" size="sm" type="submit">
        Sign out
      </Button>
    </form>
  );
}
