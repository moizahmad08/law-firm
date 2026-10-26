"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Scale,
  LayoutDashboard,
  Briefcase,
  Users,
  UserCheck,
  ShieldAlert,
  Calendar,
  FileText,
  DollarSign,
  Activity,
  History,
  Lock,
  LogOut,
  FolderLock,
  Clock,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import clsx from "clsx";
import { Role } from "@prisma/client";
import { logoutAction } from "@/lib/auth/actions";

interface SidebarProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: Role;
  };
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  urdu: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

export function Sidebar({ user, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      router.push("/login");
      router.refresh();
    });
  };

  // Build role-scoped navigation
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        label: "Overview",
        urdu: "مرکزی صفحہ",
        href: "/",
        icon: LayoutDashboard,
      },
    ];

    switch (user.role) {
      case Role.SUPER_ADMIN:
        return [
          ...baseItems,
          {
            label: "Legal Research & Laws",
            urdu: "قانونی نظائر و تحقیق",
            href: "/research",
            icon: Scale,
            badge: "GROK 4.3",
            badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          },
          {
            label: "Audit Trails",
            urdu: "آڈٹ لاگز",
            href: "/",
            icon: History,
            badge: "IMMUTABLE",
            badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          },
          {
            label: "System Health",
            urdu: "سسٹم کی حالت",
            href: "/",
            icon: Activity,
          },
          {
            label: "Security & RLS",
            urdu: "سیکورٹی کنٹرولز",
            href: "/",
            icon: Lock,
          },
        ];

      case Role.OFFICE_ADMIN:
        return [
          ...baseItems,
          {
            label: "All Chambers Cases",
            urdu: "تمام مقدمات",
            href: "/cases",
            icon: Briefcase,
          },
          {
            label: "Conflict Screening",
            urdu: "مفادات کا تصادم",
            href: "/cases/new",
            icon: ShieldAlert,
          },
          {
            label: "Legal Research",
            urdu: "قانونی نظائر و تحقیق",
            href: "/research",
            icon: Scale,
          },
        ];

      case Role.LAWYER:
        return [
          ...baseItems,
          {
            label: "My Active Cases",
            urdu: "میرے مقدمات",
            href: "/cases",
            icon: Briefcase,
          },
          {
            label: "Hearings & Cause List",
            urdu: "کاز لسٹ اور پیشیاں",
            href: "/",
            icon: Calendar,
          },
          {
            label: "Legal Research",
            urdu: "قانونی نظائر و تحقیق",
            href: "/research",
            icon: Scale,
          },
          {
            label: "Restricted Matters",
            urdu: "خفیہ مقدمات",
            href: "/cases?restricted=true",
            icon: FolderLock,
            badge: "ETHICAL WALL",
            badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30",
          },
        ];

      case Role.ASSISTANT:
        return [
          ...baseItems,
          {
            label: "Daily Cause List",
            urdu: "روزانہ کاز لسٹ",
            href: "/",
            icon: Calendar,
          },
          {
            label: "Chambers Matters",
            urdu: "عدالتی مقدمات",
            href: "/cases",
            icon: FileText,
          },
        ];

      case Role.FINANCE_ADMIN:
        return [
          ...baseItems,
          {
            label: "Fee Ledger & Cases",
            urdu: "فیس کھاتہ",
            href: "/cases",
            icon: DollarSign,
          },
          {
            label: "Financial Overview",
            urdu: "مالیاتی رپورٹس",
            href: "/",
            icon: Activity,
          },
        ];

      default:
        return baseItems;
    }
  };

  const navItems = getNavItems();

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case Role.SUPER_ADMIN:
        return { label: "Super Admin", urdu: "سپر ایڈمن", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
      case Role.OFFICE_ADMIN:
        return { label: "Office Admin", urdu: "آفس ایڈمن", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
      case Role.LAWYER:
        return { label: "Advocate / Counsel", urdu: "وکیل ہائیکورٹ", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
      case Role.ASSISTANT:
        return { label: "Court Assistant", urdu: "عدالتی معاون", color: "bg-teal-500/10 text-teal-400 border-teal-500/30" };
      case Role.FINANCE_ADMIN:
        return { label: "Finance Manager", urdu: "فنانس مینیجر", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    }
  };

  const roleInfo = getRoleBadge(user.role);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={clsx(
          "fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 lg:static lg:translate-x-0 backdrop-blur-xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div>
          <div className="p-6 border-b border-slate-800/80">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/5">
                <Scale className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>Al-Meezan</span>
                  <span className="text-[10px] font-urdu text-amber-400/90 font-normal">
                    الميزان
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 truncate">
                  Advocates & Legal Consultants
                </p>
              </div>
            </div>
          </div>

          {/* Role pill indicator */}
          <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Current Role:</span>
            <span
              className={clsx(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                roleInfo.color
              )}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>{roleInfo.label}</span>
            </span>
          </div>

          {/* Navigation Section */}
          <nav className="p-4 space-y-1.5">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Practice Navigation
            </p>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    "group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200",
                    isActive
                      ? "bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/5"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={clsx(
                        "w-4 h-4 transition-colors",
                        isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-200"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      <span className="font-urdu text-[10px] text-slate-500 group-hover:text-slate-400">
                        {item.urdu}
                      </span>
                    </div>
                  </div>

                  {item.badge ? (
                    <span
                      className={clsx(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                        item.badgeColor || "bg-slate-800 text-slate-300 border-slate-700"
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight
                      className={clsx(
                        "w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-400",
                        isActive && "opacity-100 translate-x-0 text-amber-400"
                      )}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 mb-3 shadow-inner">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0">
                {user.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-semibold text-white truncate">{user.fullName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isLoggingOut ? "Ending Session..." : "Sign Out of Chambers"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
