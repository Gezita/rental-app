"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { assertCloudDataAllowed } from "@/lib/cloud-guard";
import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";
import { setSession, clearSession } from "@/lib/auth";
import { isLocked, recordFailure, clearAttempts } from "@/lib/rate-limit";
import { zEmail, zOptionalString } from "@/lib/validation";
import { safeAuthRedirectPath } from "@/lib/auth-redirect";

const signUpSchema = z.object({
  email: zEmail,
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: zOptionalString,
});

const signInSchema = z.object({
  email: z.string().trim().min(1, "Email is required").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Password is required"),
  next: zOptionalString,
});

export async function signUpAction(formData: FormData) {
  assertCloudDataAllowed();
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/sign-up?error=invalid");

  const { email, password, name } = parsed.data;

  const existing = await withDbRetry(() =>
    prisma.user.findUnique({ where: { email } })
  );
  if (existing) redirect("/sign-up?error=exists");

  const hashed = await bcrypt.hash(password, 10);
  const user = await withDbRetry(() =>
    prisma.user.create({
      data: {
        email,
        password: hashed,
        name: name || undefined,
        settings: {
          create: {
            landlordName: name || email.split("@")[0],
            paymentInstructions: "Please contact your landlord for payment details.",
          },
        },
      },
    })
  );

  await setSession(user.id);
  redirect("/dashboard");
}

function safeRedirectPath(next: string | undefined): string {
  return safeAuthRedirectPath(next);
}

export async function signInAction(formData: FormData) {
  assertCloudDataAllowed();
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/sign-in?error=invalid");

  const { email, password, next } = parsed.data;

  function failRedirect(): never {
    const errorUrl = new URL("/sign-in", "http://local");
    errorUrl.searchParams.set("error", "invalid");
    if (next) errorUrl.searchParams.set("next", next);
    redirect(`${errorUrl.pathname}${errorUrl.search}`);
  }

  if (await withDbRetry(() => isLocked(email))) {
    failRedirect();
  }

  const user = await withDbRetry(() =>
    prisma.user.findUnique({ where: { email } })
  );
  if (!user) {
    await withDbRetry(() => recordFailure(email));
    failRedirect();
  }

  if (!user.password) {
    const errorUrl = new URL("/sign-in", "http://local");
    errorUrl.searchParams.set("error", "google_only");
    if (next) errorUrl.searchParams.set("next", next);
    redirect(`${errorUrl.pathname}${errorUrl.search}`);
  }

  if (!(await bcrypt.compare(password, user.password))) {
    await withDbRetry(() => recordFailure(email));
    failRedirect();
  }

  await withDbRetry(() => clearAttempts(email));
  await setSession(user.id);
  redirect(safeRedirectPath(next));
}

export async function signOutAction() {
  assertCloudDataAllowed();
  await clearSession();
  redirect("/sign-in");
}
