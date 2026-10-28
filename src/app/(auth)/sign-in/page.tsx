import { Suspense } from "react";
import { SignInForm } from "../auth-forms";

export const metadata = { title: "Sign in" };

export default function Page() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
