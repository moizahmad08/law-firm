"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  Bell,
  ShieldCheck,
  Clock,
  Sparkles,
  Gavel,
  CheckSquare,
  ShieldAlert,
  ChevronRight,
  X,
} from "lucide-react";
import { Role } from "@prisma/client";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";

interface TopbarProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: Role;
  };
  onMenuToggle: () => void;
  title?: string;
}

export function Topbar({ user, onMenuToggle, title = "Practice Overview" }: TopbarProps) {
  const [karachiTime, setKarachiTime] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      try {
        const formatter = new Intl.DateTimeFormat("en-PK", {
          timeZone: "Asia/Karachi",
          weekday: "short",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
        setKarachiTime(formatter.format(new Date()) + " (PST)");
      } catch {
        setKarachiTime(new Date().toLocaleTimeString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>{title}</span>
              <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="hidden sm:inline-block text-xs font-normal text-slate-400">
                Chambers Law Practice
              </span>
            </h2>
          </div>
        </div>

        {/* Middle: Quick Search Input Trigger */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="relative w-full text-left"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <div className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl pl-9 pr-12 py-1.5 text-xs text-slate-400 placeholder-slate-500 hover:border-slate-500 transition-colors">
              Search cases, parties, or court citation (Ctrl+K)...
            </div>
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              Ctrl+K
            </kbd>
          </button>
        </div>

      {/* Right: Security & Live Time Badges */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Pakistan Standard Time Live Badge */}
        <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 font-mono">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{karachiTime || "Asia/Karachi"}</span>
        </div>

        {/* Database RLS Isolation Badge */}
        <div
          title="Row-Level Security (RLS) is ENFORCED on PostgreSQL. All queries isolated to user context."
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden md:inline">RLS Active</span>
        </div>

        {/* Notifications Icon with Interactive Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className={`relative p-2 rounded-xl transition-colors cursor-pointer ${
              isNotificationsOpen
                ? "text-white bg-slate-800"
                : "text-slate-400 hover:text-white hover:bg-slate-800/80"
            }`}
            title="Notifications & Upcoming Hearings"
            aria-label="Chambers notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl z-50 overflow-hidden animate-fade-in">
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">Chambers Alerts &amp; Cause List</span>
                </div>
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-2 space-y-1.5 max-h-80 overflow-y-auto divide-y divide-slate-800/50">
                {/* Hearing Alert */}
                <Link
                  href="/cases/WP-101/2026"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors block group space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-amber-400 font-bold flex items-center gap-1.5">
                      <Gavel className="w-3.5 h-3.5 text-amber-400" />
                      WP-101/2026
                    </span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                      Tomorrow &bull; 09:30 AM
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 group-hover:text-amber-200">
                    High Court Division Bench hearing scheduled before Mr. Justice Shahid Karim
                  </p>
                  <span className="text-[11px] text-amber-400 font-semibold group-hover:underline flex items-center pt-0.5">
                    Open Case File <ChevronRight className="w-3 h-3 ml-0.5" />
                  </span>
                </Link>

                {/* Task Alert */}
                <Link
                  href="/cases/WP-101/2026"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors block group space-y-1 pt-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-blue-400 font-bold flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                      Pending Court Task
                    </span>
                    <span className="text-[10px] text-rose-400 font-semibold bg-rose-500/10 px-1.5 py-0.5 rounded">
                      Due Soon
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Finalize Rejoinder to Parawise Comments for IRSA dispute
                  </p>
                </Link>

                {/* Ethical Wall Isolation Notice */}
                <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-1 text-xs">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>PostgreSQL RLS Active</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    All case dockets and documents are strictly isolated to your authenticated persona.
                  </p>
                </div>
              </div>

              <div className="p-2 border-t border-slate-800 bg-slate-950/40 text-center">
                <Link
                  href="/cases"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs text-slate-400 hover:text-amber-400 font-medium transition-colors"
                >
                  View All Chambers Matters &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
  </>
  );
}
