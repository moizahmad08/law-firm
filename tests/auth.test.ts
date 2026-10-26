import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/database/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateTotpSecret, verifyTotpToken, generateCurrentTotp } from "@/lib/auth/totp";
import { checkRateLimit, recordFailedAttempt, resetFailedAttempts } from "@/lib/auth/rate-limit";
import { createSession, validateSessionToken, revokeSessionByToken, revokeAllUserSessions } from "@/lib/auth/session";
import { recordAuthAudit } from "@/lib/auth/audit";
import fs from "fs";
import path from "path";

describe("Milestone 1B: Authentication, Sessions & Security Verification", () => {
  const TEST_EMAIL = "auth.tester@lawfirm.local";
  const TEST_PASSWORD = "ValidTesterPassword123!";

  beforeEach(async () => {
    // Ensure test user exists and has 0 failed attempts
    const passwordHash = await hashPassword(TEST_PASSWORD);
    await prisma.user.upsert({
      where: { email: TEST_EMAIL },
      update: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        isActive: true,
      },
      create: {
        email: TEST_EMAIL,
        fullName: "Test Auth Verification User",
        role: "LAWYER",
        passwordHash,
        isActive: true,
      },
    });
  });

  it("1. Rate Limiting: 6 wrong password attempts triggers account lockout", async () => {
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(user).not.toBeNull();

    // Reset attempts
    await resetFailedAttempts(user!.id);

    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await recordFailedAttempt(TEST_EMAIL);
    }

    // 6th check must report locked
    const rateLimitCheck = await checkRateLimit(TEST_EMAIL);
    expect(rateLimitCheck.isLocked).toBe(true);
    expect(rateLimitCheck.message).toContain("Account is temporarily locked");
  });

  it("2. Timing & Information Leakage: Non-existent email error does not leak presence", async () => {
    const nonExistentEmail = "doesnotexist9999@lawfirm.local";
    const rateLimit = await checkRateLimit(nonExistentEmail);
    expect(rateLimit.isLocked).toBe(false);

    // Recording failed attempt on non-existent email safely returns without leaking existence
    const result = await recordFailedAttempt(nonExistentEmail);
    expect(result.isNowLocked).toBe(false);
  });

  it("3. Anti-Registration Guard: strictly no /register or /signup routes exist", () => {
    const appDir = path.resolve(process.cwd(), "app");
    const registerPath = path.join(appDir, "register");
    const signupPath = path.join(appDir, "signup");

    expect(fs.existsSync(registerPath)).toBe(false);
    expect(fs.existsSync(signupPath)).toBe(false);
  });

  it("4. Two-Factor Authentication: generates valid TOTP and verifies RFC 6238 codes", () => {
    const { secret, otpauthUrl } = generateTotpSecret(TEST_EMAIL);
    expect(secret).toBeDefined();
    expect(otpauthUrl).toContain("otpauth://totp/");

    // Generate valid TOTP code
    const validCode = generateCurrentTotp(secret);
    expect(verifyTotpToken(validCode, secret)).toBe(true);

    // Invalid code must fail
    expect(verifyTotpToken("000000", secret)).toBe(false);
    expect(verifyTotpToken("999999", secret)).toBe(false);
  });

  it("5. Revocable Sessions: deactivating user immediately terminates active session", async () => {
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(user).not.toBeNull();

    // Create session
    const { rawToken } = await createSession({
      userId: user!.id,
      ipAddress: "127.0.0.1",
      userAgent: "vitest-runner",
    });

    // Validate active session
    const validResult = await validateSessionToken(rawToken);
    expect(validResult).not.toBeNull();
    expect(validResult?.user.id).toBe(user!.id);

    // Deactivate user
    await prisma.user.update({
      where: { id: user!.id },
      data: { isActive: false },
    });

    // Subsequent session validation MUST fail and revoke session
    const postDeactivationResult = await validateSessionToken(rawToken);
    expect(postDeactivationResult).toBeNull();
  });

  it("6. Audit Log Sanitization: test passwords never appear in audit events", async () => {
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });

    const sensitiveAttempt = "SecretTestPassword999#";
    await recordAuthAudit({
      userId: user?.id,
      action: "AUTH_LOGIN_FAILED_TEST",
      metadata: {
        email: TEST_EMAIL,
        password: sensitiveAttempt,
        passwordHash: "$2a$12$someSensitiveHash",
        attemptDetails: {
          clientPassword: sensitiveAttempt,
        },
      },
    });

    // Query recent audit records
    const recentAudit = await prisma.auditEvent.findFirst({
      where: { action: "AUTH_LOGIN_FAILED_TEST" },
      orderBy: { createdAt: "desc" },
    });

    expect(recentAudit).not.toBeNull();
    const auditString = JSON.stringify(recentAudit);

    // Verify sensitive password NEVER leaked into audit table
    expect(auditString).not.toContain(sensitiveAttempt);
    expect(auditString).not.toContain("$2a$12$someSensitiveHash");
    expect(auditString).toContain("[REDACTED]");
  });
});
