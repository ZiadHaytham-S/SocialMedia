import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell mode="login">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
