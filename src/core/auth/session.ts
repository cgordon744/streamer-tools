import { redirect } from "next/navigation";

import { auth } from "@/auth";

// The one place domain code gets the acting user's id. Services never call
// auth() themselves — they take a userId argument — so future API-token or
// webhook callers can reuse them with a different identity source.
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }
  return userId;
}
