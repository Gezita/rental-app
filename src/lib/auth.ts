import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLocalDataOnlyDeploy } from "./deploy-config";
import { prisma } from "./db";
import { createSessionToken, parseSessionToken } from "./session-token";

const SESSION_COOKIE = "landlord_session";

export const getSessionUserId = cache(async (): Promise<string | null> => {
  if (isLocalDataOnlyDeploy()) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const userId = await parseSessionToken(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) return null;

  return user.id;
});

export const requireUser = cache(async () => {
  if (isLocalDataOnlyDeploy()) {
    redirect("/get-started");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const userId = await parseSessionToken(token);
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });

  if (!user) throw new Error("Unauthorized");
  return user;
});

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export { SESSION_COOKIE };
