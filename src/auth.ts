import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "@/core/auth/config";
import { verifyPassword } from "@/core/auth/password";
import {
  clientIp,
  isRateLimited,
  recordFailedLogin,
} from "@/core/auth/rate-limit";
import { findUserByEmail } from "@/core/auth/service";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Auth.js rethrows CredentialsSignin subclasses from `authorize` unwrapped,
// so the login action can tell "throttled" from "wrong password" via `code`.
class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Cap failed attempts per IP before doing any credential work.
        const ip = clientIp(request);
        if (await isRateLimited(ip)) throw new RateLimitedError();

        const user = await findUserByEmail(parsed.data.email);
        if (!user) {
          await recordFailedLogin(ip);
          return null;
        }

        const valid = await verifyPassword(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) {
          await recordFailedLogin(ip);
          return null;
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
