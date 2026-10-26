"use client";

import React, { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Mail, KeyRound, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { loginAction, verifyMfaAction } from "@/lib/auth/actions";
import type { AuthState } from "@/lib/auth/types";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [authState, setAuthState] = useState<AuthState>({ status: "IDLE" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    startTransition(async () => {
      const result = await loginAction(authState, formData);
      setAuthState(result);
      if (result.status === "SUCCESS") {
        window.location.href = result.redirectTo || "/";
      }
    });
  };

  const handleMfaSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!authState.challengeToken || !authState.email) return;

    const formData = new FormData();
    formData.append("email", authState.email);
    formData.append("code", mfaCode);
    formData.append("challengeToken", authState.challengeToken);

    startTransition(async () => {
      const result = await verifyMfaAction(authState, formData);
      setAuthState(result);
      if (result.status === "SUCCESS") {
        window.location.href = result.redirectTo || "/";
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-8">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Law Practice Portal</h1>
          <p className="text-xs text-slate-400 mt-1">Authorized Legal Practice Management System</p>
        </div>

        {/* Error Alert */}
        {authState.message && (
          <div
            id="auth-error-banner"
            className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start space-x-2"
          >
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{authState.message}</span>
          </div>
        )}

        {/* Step 1: Email and Password Form */}
        {authState.status !== "MFA_REQUIRED" ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lawyer@lawfirm.local"
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-colors"
                />
              </div>
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={isPending}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-sm transition-all duration-150 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/10"
            >
              {isPending ? (
                <span className="flex items-center space-x-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1.5">
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: Two-Factor Authentication TOTP Form */
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4 text-xs text-amber-300 flex items-start space-x-2">
              <KeyRound className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>Two-Factor Authentication is required for your role. Please enter the 6-digit code from your authenticator app.</span>
            </div>

            <div>
              <label htmlFor="mfaCode" className="block text-xs font-medium text-slate-300 mb-1.5">
                6-Digit Authenticator Code
              </label>
              <input
                id="mfaCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full tracking-widest text-center font-mono text-lg font-bold bg-slate-950/60 border border-slate-700 rounded-lg py-2.5 text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-colors"
              />
            </div>

            <button
              id="mfa-verify-button"
              type="submit"
              disabled={isPending || mfaCode.length !== 6}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-sm transition-all duration-150 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/10"
            >
              {isPending ? (
                <span className="flex items-center space-x-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Code...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Access</span>
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAuthState({ status: "IDLE" })}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-300 py-1 transition-colors"
            >
              &larr; Return to password login
            </button>
          </form>
        )}

        {/* Security Notice */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center">
            <Lock className="w-3 h-3 mr-1 text-slate-600" />
            Admin-managed access only. Public self-registration is disabled.
          </p>
        </div>

        {/* Demo Personas for Verification & Testing */}
        <div className="mt-4 pt-4 border-t border-slate-800/60">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Chambers Staff Personas (Demo)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setEmail("counsel.alpha@lawfirm.local");
                setPassword("LocalDevPassword123!");
              }}
              className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-left text-slate-300 transition-colors"
            >
              <div className="font-semibold text-white">Counsel Alpha</div>
              <div className="text-[10px] text-amber-400">Lead Lawyer (WP-101)</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("counsel.beta@lawfirm.local");
                setPassword("LocalDevPassword123!");
              }}
              className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-rose-500/40 text-left text-slate-300 transition-colors"
            >
              <div className="font-semibold text-white">Counsel Beta</div>
              <div className="text-[10px] text-rose-400">Restricted (CS-202)</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("senior.partner@lawfirm.local");
                setPassword("LocalDevPassword123!");
              }}
              className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-left text-slate-300 transition-colors"
            >
              <div className="font-semibold text-white">Senior Partner</div>
              <div className="text-[10px] text-amber-300">Office Administrator</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("clerk.one@lawfirm.local");
                setPassword("LocalDevPassword123!");
              }}
              className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-teal-500/40 text-left text-slate-300 transition-colors"
            >
              <div className="font-semibold text-white">Usman (Clerk)</div>
              <div className="text-[10px] text-teal-400">Court Clerk / Diary</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("finance.head@lawfirm.local");
                setPassword("LocalDevPassword123!");
              }}
              className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-left text-slate-300 transition-colors"
            >
              <div className="font-semibold text-white">Bilal (Finance)</div>
              <div className="text-[10px] text-emerald-400">Finance Manager</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("admin.dev@lawfirm.local");
                setPassword("LocalDevPassword123!");
              }}
              className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-purple-500/40 text-left text-slate-300 transition-colors"
            >
              <div className="font-semibold text-white">Tariq (Super Admin)</div>
              <div className="text-[10px] text-purple-400">Security &amp; Audit</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
