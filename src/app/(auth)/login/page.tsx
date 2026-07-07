import { LoginForm } from "./login-form";

export const metadata = {
  title: "Log in — Streamer Tools",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
