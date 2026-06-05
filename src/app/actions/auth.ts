"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { setSession, clearSession } from "@/lib/auth";

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "").trim();

  if (!email || password.length < 6) {
    redirect("/sign-up?error=invalid");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/sign-up?error=exists");

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
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
  });

  await setSession(user.id);
  redirect("/dashboard");
}

function safeRedirectPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  if (next.startsWith("/sign-in") || next.startsWith("/sign-up")) {
    return "/dashboard";
  }
  return next;
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    const errorUrl = new URL("/sign-in", "http://local");
    errorUrl.searchParams.set("error", "invalid");
    if (next) errorUrl.searchParams.set("next", next);
    redirect(`${errorUrl.pathname}${errorUrl.search}`);
  }

  await setSession(user.id);
  redirect(safeRedirectPath(next));
}

export async function signOutAction() {
  await clearSession();
  redirect("/sign-in");
}
