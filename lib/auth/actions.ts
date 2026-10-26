"use server";

import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/database/client";
import { verifyPassword } from "./password";
import { verifyTotpToken } from "./totp";
import { checkRateLimit, recordFailedAttempt, resetFailedAttempts } from "./rate-limit";
import { createSession, setSessionCookie, clearSessionCookie, revokeSessionByToken, getSessionTokenFromCookies } from "./session";
import { recordAuthAudit } from "./audit";
import { Role } from "@prisma/client";

import { AuthState } from "./types";

// Roles that strictly require Two-Factor Authentication (internal to actions)
const MFA_MANDATORY_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.OFFICE_ADMIN,
  Role.FINANCE_ADMIN,
];

const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const MfaVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Verification code must be exactly 6 digits."),
  challengeToken: z.string().min(10),
});

// Ephemeral in-memory store for challenge tokens (expires in 5 minutes)
const challengeStore = new Map<string, { email: string; expiresAt: number }>();

// Constant-time dummy hash to mitigate user enumeration via timing attacks
const DUMMY_HASH = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj40zO3j6e2G";

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const rawEmail = (formData.get("email") as string) || "";
  const rawPassword = (formData.get("password") as string) || "";

  const parsed = LoginSchema.safeParse({ email: rawEmail, password: rawPassword });
  if (!parsed.success) {
    return {
      status: "ERROR",
      message: parsed.error.issues[0]?.message || "Invalid input.",
    };
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check rate limit & lockout status
  const rateLimit = await checkRateLimit(normalizedEmail);
  if (rateLimit.isLocked) {
    return {
      status: "ERROR",
      message: rateLimit.message || "Account is temporarily locked. Please try again later.",
    };
  }

  // 2. Fetch user
  let user: any = null;
  try {
    user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
  } catch (err: any) {
    console.error("Database connection error during login:", err);
    return {
      status: "ERROR",
      message: "Unable to reach database at localhost:5432. Please ensure Docker Desktop or PostgreSQL is running.",
    };
  }

  if (!user || !user.isActive || user.deletedAt) {
    // Execute dummy compare to preserve timing consistency
    await verifyPassword(password, DUMMY_HASH);
    await recordFailedAttempt(normalizedEmail);
    await recordAuthAudit({
      userId: null,
      action: "AUTH_LOGIN_FAILED",
      metadata: { email: normalizedEmail, reason: "INVALID_CREDENTIALS" },
    });

    return {
      status: "ERROR",
      message: "Invalid email or password.",
    };
  }

  // 3. Verify password
  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    const lockResult = await recordFailedAttempt(normalizedEmail);
    await recordAuthAudit({
      userId: user.id,
      action: "AUTH_LOGIN_FAILED",
      metadata: { email: normalizedEmail, reason: "INVALID_PASSWORD" },
    });

    if (lockResult.isNowLocked) {
      await recordAuthAudit({
        userId: user.id,
        action: "AUTH_ACCOUNT_LOCKED",
        metadata: { email: normalizedEmail },
      });
      return {
        status: "ERROR",
        message: lockResult.lockMessage || "Account is locked due to repeated failed attempts.",
      };
    }

    return {
      status: "ERROR",
      message: "Invalid email or password.",
    };
  }

  // 4. Password valid - reset failed attempts
  await resetFailedAttempts(user.id);

  // 5. Determine whether 2FA is required
  const isMfaMandatory = MFA_MANDATORY_ROLES.includes(user.role);
  const requiresMfa = user.mfaEnabled || isMfaMandatory;

  if (requiresMfa && user.mfaSecret) {
    const challengeToken = crypto.randomBytes(24).toString("hex");
    challengeStore.set(challengeToken, {
      email: user.email,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    await recordAuthAudit({
      userId: user.id,
      action: "AUTH_MFA_CHALLENGE_ISSUED",
      metadata: { email: user.email, role: user.role },
    });

    return {
      status: "MFA_REQUIRED",
      challengeToken,
      email: user.email,
    };
  }

  // 6. Direct Session creation (when 2FA is not yet enforced/configured)
  const { rawToken, expiresAt } = await createSession({
    userId: user.id,
  });

  setSessionCookie(rawToken, expiresAt);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await recordAuthAudit({
    userId: user.id,
    action: "AUTH_LOGIN_SUCCESS",
    metadata: { role: user.role, mfaUsed: false },
  });

  return {
    status: "SUCCESS",
    redirectTo: "/",
  };
}

export async function verifyMfaAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const rawEmail = (formData.get("email") as string) || "";
  const rawCode = (formData.get("code") as string) || "";
  const rawChallengeToken = (formData.get("challengeToken") as string) || "";

  const parsed = MfaVerifySchema.safeParse({
    email: rawEmail,
    code: rawCode,
    challengeToken: rawChallengeToken,
  });

  if (!parsed.success) {
    return {
      status: "ERROR",
      message: parsed.error.issues[0]?.message || "Invalid 6-digit verification code.",
      challengeToken: rawChallengeToken,
      email: rawEmail,
    };
  }

  const { email, code, challengeToken } = parsed.data;

  // Validate challenge token
  const challenge = challengeStore.get(challengeToken);
  if (!challenge || challenge.email !== email || Date.now() > challenge.expiresAt) {
    return {
      status: "ERROR",
      message: "Authentication challenge expired. Please log in again.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.isActive || !user.mfaSecret) {
    return {
      status: "ERROR",
      message: "Authentication error. Please restart login.",
    };
  }

  const isTotpValid = verifyTotpToken(code, user.mfaSecret);

  if (!isTotpValid) {
    await recordAuthAudit({
      userId: user.id,
      action: "AUTH_MFA_FAILED",
      metadata: { email: user.email },
    });

    return {
      status: "MFA_REQUIRED",
      challengeToken,
      email,
      message: "Invalid authenticator code. Please check your authenticator app and try again.",
    };
  }

  // Consume challenge
  challengeStore.delete(challengeToken);

  // Create session
  const { rawToken, expiresAt } = await createSession({
    userId: user.id,
  });

  setSessionCookie(rawToken, expiresAt);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await recordAuthAudit({
    userId: user.id,
    action: "AUTH_LOGIN_SUCCESS",
    metadata: { role: user.role, mfaUsed: true },
  });

  return {
    status: "SUCCESS",
    redirectTo: "/",
  };
}

export async function logoutAction(): Promise<void> {
  const token = getSessionTokenFromCookies();
  if (token) {
    await revokeSessionByToken(token);
    await recordAuthAudit({
      action: "AUTH_LOGOUT",
      metadata: { method: "USER_LOGOUT" },
    });
  }
  clearSessionCookie();
}
