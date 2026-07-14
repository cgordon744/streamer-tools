import type { NextAuthConfig } from "next-auth";

// Edge-safe base config — no database or bcrypt imports, so it can be used in
// proxy.ts (middleware). The Credentials provider is attached in src/auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
