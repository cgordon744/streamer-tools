"use server";

import { AuthError, CredentialsSignin } from "next-auth";

import { signIn, signOut } from "@/auth";

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
