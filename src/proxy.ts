import NextAuth from "next-auth";

import { authConfig } from "@/modules/auth/config";

// Route protection at the edge using the db-free config. Unauthenticated
// requests are redirected to /login by the `authorized` callback.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
