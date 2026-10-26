"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Role } from "@prisma/client";

export interface AppShellProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: Role;
  };
  title?: string;
  children: React.ReactNode;
}

export function AppShell({ user, title, children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-emerald-500/25 selection:text-emerald-200 relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Role-scoped Navigation Sidebar */}
      <Sidebar
        user={user}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative z-10">
        <Topbar
          user={user}
          title={title}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Legal Footer */}
        <footer className="border-t border-slate-800/60 px-6 py-4 text-center text-xs text-slate-400 glass-surface mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-slate-200">Al-Meezan Law Chambers</span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-slate-400">Supreme Court &amp; High Court Practice</span>
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-slate-400">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 font-medium">
                xAI Grok 4.3 Reasoning Active
              </span>
              <span className="font-mono text-slate-500">PostgreSQL 16 RLS</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
