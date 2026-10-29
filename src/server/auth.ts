import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { audit } from "./audit";
import { getDb } from "./db";
import { account, rateLimit, session, user, verification } from "./db/schema";
import { sendMail } from "./mail";
import { handOverOwnedGuilds } from "./services/guilds";
import { deploymentOrigins, siteUrl } from "./site-url";

const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  appName: "Portle",
  baseURL: siteUrl(),
  trustedOrigins: deploymentOrigins(),
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: { user, session, account, verification, rateLimit },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      await sendMail({
        to: user.email,
        subject: "Reset your Portle password",
        text: `Someone asked to reset the password for your Portle account.\n\nReset it here (valid for one hour): ${url}\n\nIf this wasn't you, ignore this email; your password stays the same.`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    async sendVerificationEmail({ user, url }) {
      await sendMail({
        to: user.email,
        subject: "Confirm your email for Portle",
        text: `Welcome to Portle.\n\nConfirm your email to open your archive: ${url}\n\nThe link is valid for 24 hours.`,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: process.env.AUTH_RATE_LIMIT !== "off",
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/sign-up/email": { window: 600, max: 10 },
      "/request-password-reset": { window: 600, max: 5 },
      "/send-verification-email": { window: 600, max: 5 },
    },
  },
  user: {
    deleteUser: {
      enabled: true,
      async beforeDelete(u) {
        const db = getDb();
        await handOverOwnedGuilds(db, u.id);
        await audit(db, { userId: null, action: "account.deleted" });
      },
    },
  },
  advanced: {
    useSecureCookies: isProd,
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
