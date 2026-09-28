import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ConfirmEmailForm } from "@/components/auth/confirm-email-form";

export default function ConfirmEmailPage() {
  return (
    <AuthShell mode="login">
      <Suspense fallback={<p className="text-center text-sm text-t-muted">جاري التحميل...</p>}>
        <ConfirmEmailForm />
      </Suspense>
    </AuthShell>
  );
}
