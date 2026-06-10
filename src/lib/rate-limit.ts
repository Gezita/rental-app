import { prisma } from "./db";

const LOCK_THRESHOLD = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export async function isLocked(key: string): Promise<boolean> {
  const attempt = await prisma.loginAttempt.findUnique({ where: { key } });
  if (!attempt?.lockedUntil) return false;
  if (new Date() >= attempt.lockedUntil) {
    await prisma.loginAttempt.update({
      where: { key },
      data: { count: 0, lockedUntil: null },
    });
    return false;
  }
  return true;
}

export async function recordFailure(key: string): Promise<void> {
  const attempt = await prisma.loginAttempt.upsert({
    where: { key },
    update: { count: { increment: 1 } },
    create: { key, count: 1 },
  });
  if (attempt.count >= LOCK_THRESHOLD) {
    await prisma.loginAttempt.update({
      where: { key },
      data: { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) },
    });
  }
}

export async function clearAttempts(key: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}
