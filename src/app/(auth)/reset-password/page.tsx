import { Suspense } from "react";
import { ResetPasswordForm } from "../auth-forms";

export const metadata = { title: "New password" };

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
