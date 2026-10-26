import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/database/client";
import { User, Role } from "@prisma/client";

export const SESSION_COOKIE_NAME = "lms_session";
export const IDLE_TIMEOUT_MINUTES = 30;
export const ABSOLUTE_TIMEOUT_HOURS = 8;

export interface SessionValidationResult {
  user: User;
  sessionId: string;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// In-memory fallback session store for demo personas when database is offline or unprovisioned
const inMemoryDemoSessions = new Map<string, { user: User; expiresAt: Date }>();

export function createDemoSession(user: any): { rawToken: string; expiresAt: Date } {
  const rawToken = "demo_" + generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000);
  inMemoryDemoSessions.set(rawToken, { user: user as User, expiresAt });
  return { rawToken, expiresAt };
}

export async function createSession({
  userId,
  ipAddress,
  userAgent,
}: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      lastActiveAt: now,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  });

  return { rawToken, expiresAt };
}

export async function validateSessionToken(
  rawToken: string
): Promise<SessionValidationResult | null> {
  if (!rawToken || rawToken.trim() === "") return null;

  // Check demo session first
  if (rawToken.startsWith("demo_")) {
    const demo = inMemoryDemoSessions.get(rawToken);
    if (demo && demo.expiresAt > new Date()) {
      return { user: demo.user, sessionId: "demo-session-" + demo.user.id };
    }
  }

  try {
    const tokenHash = hashToken(rawToken.trim());
    const now = new Date();

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.deletedAt) {
      return null;
    }

  // 1. Enforce active user status - immediate revocation if user is deactivated
  if (!session.user.isActive || session.user.deletedAt) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: now },
    });
    return null;
  }

  // 2. Enforce absolute session timeout (8 hours)
  if (now > session.expiresAt) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: now },
    });
    return null;
  }

  // 3. Enforce idle session timeout (30 minutes)
  const idleMs = now.getTime() - session.lastActiveAt.getTime();
  if (idleMs > IDLE_TIMEOUT_MINUTES * 60 * 1000) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: now },
    });
    return null;
  }

  // 4. Slide active window (touch session)
  await prisma.session.update({
    where: { id: session.id },
    data: { lastActiveAt: now },
  });

  return {
    user: session.user,
    sessionId: session.id,
  };
  } catch (err) {
    console.warn("Session validation database lookup failed:", err);
    return null;
  }
}

export async function revokeSessionByToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken.trim());
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export function setSessionCookie(rawToken: string, expiresAt: Date): void {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(): void {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export function getSessionTokenFromCookies(): string | undefined {
  return cookies().get(SESSION_COOKIE_NAME)?.value;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = getSessionTokenFromCookies();
  if (!token) return null;
  const result = await validateSessionToken(token);
  return result ? result.user : null;
}
