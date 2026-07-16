"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import {
  ipFromForwardedFor,
  isSignupRateLimited,
  recordSignup,
} from "@/core/auth/rate-limit";
import { registerUser } from "@/core/auth/service";
import { signupInputSchema } from "@/core/auth/validation";
import { flags } from "@/core/config/flags";

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    // Without an explicit redirectTo, signIn falls back to the referring
    // page (/login) and the login appears to have silently failed.
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "rate_limited") {
      return "Too many login attempts. Try again in a few minutes.";
    }
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    // next/navigation redirects reach here as thrown values — rethrow them.
    throw error;
  }
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function signup(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  // Defense in depth — the /signup page 404s when the flag is off, but the
  // action is its own endpoint.
  if (!flags.signupEnabled) {
    return "Signups aren't open yet.";
  }

  const parsed = signupInputSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Check the form and try again.";
  }

  const ip = ipFromForwardedFor((await headers()).get("x-forwarded-for"));
  if (await isSignupRateLimited(ip)) {
    return "Too many signups from your network. Try again in an hour.";
  }

  const result = await registerUser(parsed.data);
  if (!result.ok) {
    return "An account with this email already exists — log in instead.";
  }
  await recordSignup(ip);

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // The account exists; only the auto-login failed (e.g. the login rate
      // limit). Don't strand the user on a signup error — send them to log in.
      redirect("/login");
    }
    // next/navigation redirects reach here as thrown values — rethrow them.
    throw error;
  }
}
