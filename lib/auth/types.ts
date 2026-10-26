export type AuthState = {
  status: "IDLE" | "SUCCESS" | "MFA_REQUIRED" | "ERROR";
  message?: string;
  challengeToken?: string;
  email?: string;
  redirectTo?: string;
};
