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
  const parsed = await parseSessionToken(token);
  if (!parsed) return null;

  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: { id: true, sessionNonce: true },
  });

  if (!user || user.sessionNonce !== parsed.nonce) return null;
  return user.id;
});

export const requireUser = cache(async () => {
  if (isLocalDataOnlyDeploy()) {
    redirect("/get-started");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const parsed = await parseSessionToken(token);
  if (!parsed) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    include: { settings: true },
  });

  if (!user || user.sessionNonce !== parsed.nonce) redirect("/sign-in");
  return user;
});

export async function setSession(userId: string) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  await prisma.user.update({ where: { id: userId }, data: { sessionNonce: nonce } });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await createSessionToken(userId, nonce), {
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
