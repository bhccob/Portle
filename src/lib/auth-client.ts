"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

/** Better Auth error codes mapped to copy that names the problem and the recovery. */
export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don't match an account. Check both, or reset your password.";
    case "EMAIL_NOT_VERIFIED":
      return "Confirm your email first. We can send the link again.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists. Sign in instead.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 10 characters for your password.";
    case "PASSWORD_TOO_LONG":
      return "Passwords are limited to 128 characters.";
    case "INVALID_TOKEN":
      return "This link has expired or was already used. Request a new one.";
    case "INVALID_PASSWORD":
      return "That password is incorrect.";
  }
  if (error?.status === 429) return "Too many attempts. Wait a minute and try again.";
  return error?.message || "Something went wrong. Please try again.";
}
