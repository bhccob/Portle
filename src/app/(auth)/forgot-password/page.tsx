import { Suspense } from "react";
import { ForgotPasswordForm } from "../auth-forms";

export const metadata = { title: "Reset password" };

export default function Page() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
