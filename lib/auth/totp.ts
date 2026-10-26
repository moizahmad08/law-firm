import { generateSecret, generateURI, verifySync, generateSync } from "otplib";
import QRCode from "qrcode";

export const SERVICE_NAME = "Lawyer Management System PK";

export function generateTotpSecret(email: string): {
  secret: string;
  otpauthUrl: string;
} {
  const secret = generateSecret();
  const otpauthUrl = generateURI({
    issuer: SERVICE_NAME,
    label: email,
    secret,
  });
  return { secret, otpauthUrl };
}

export async function generateTotpQrCode(otpauthUrl: string): Promise<string> {
  return await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}

export function generateCurrentTotp(secret: string): string {
  return generateSync({ secret });
}

export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    const cleanToken = token.trim();
    if (cleanToken.length !== 6) return false;
    const result = verifySync({ token: cleanToken, secret });
    return result.valid === true;
  } catch {
    return false;
  }
}
