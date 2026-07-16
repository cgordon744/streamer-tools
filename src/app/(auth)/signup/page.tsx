import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { flags } from "@/core/config/flags";

import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Sign up — Streamer Tools",
};

export default async function SignupPage() {
  if (!flags.signupEnabled) {
    notFound();
  }

  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignupForm />
    </main>
  );
}
