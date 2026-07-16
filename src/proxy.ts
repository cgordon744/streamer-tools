import NextAuth from "next-auth";

import { authConfig } from "@/core/auth/config";

// Route protection at the edge using the db-free config. Unauthenticated
// requests are redirected to /login by the `authorized` callback.
export default NextAuth(authConfig).auth;

export const config = {
  // api/cron is excluded from session auth — it authenticates via CRON_SECRET
  // in the route handler instead.
  matcher: [
    "/((?!api/auth|api/cron|login|signup|_next/static|_next/image|favicon.ico).*)",
  ],
};
