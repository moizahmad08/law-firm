import { prisma } from "@/lib/database/client";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;

export interface RateLimitCheckResult {
  isLocked: boolean;
  remainingMinutes?: number;
  message?: string;
}

export async function checkRateLimit(
  email: string
): Promise<RateLimitCheckResult> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, lockedUntil: true, failedLoginAttempts: true },
    });

    if (!user || !user.lockedUntil) {
      return { isLocked: false };
    }

    const now = new Date();
    if (user.lockedUntil > now) {
      const remainingMs = user.lockedUntil.getTime() - now.getTime();
      const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
      return {
        isLocked: true,
        remainingMinutes,
        message: `Account is temporarily locked due to repeated failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
      };
    }

    // Lock expired - reset attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });

    return { isLocked: false };
  } catch (err) {
    console.warn("checkRateLimit: database lookup failed (DB offline or initializing):", err);
    return { isLocked: false };
  }
}

export async function recordFailedAttempt(
  email: string
): Promise<{ isNowLocked: boolean; lockMessage?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, failedLoginAttempts: true },
    });

    if (!user) {
      // Return standard generic response without revealing user non-existence
      return { isNowLocked: false };
    }

    const newAttempts = user.failedLoginAttempts + 1;
    const now = new Date();

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil,
        },
      });

      return {
        isNowLocked: true,
        lockMessage: `Account has been locked for ${LOCKOUT_DURATION_MINUTES} minutes due to repeated failed login attempts.`,
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newAttempts,
      },
    });

    return { isNowLocked: false };
  } catch (err) {
    console.warn("recordFailedAttempt: database write failed:", err);
    return { isNowLocked: false };
  }
}

export async function resetFailedAttempts(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  } catch (err) {
    console.warn("resetFailedAttempts: database write failed:", err);
  }
}
