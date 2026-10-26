import React from "react";
import clsx from "clsx";

export interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  showUrdu?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; urdu: string; bg: string; text: string; border: string }
> = {
  NEW: {
    label: "New",
    urdu: "نیا مقدمہ",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  ACTIVE: {
    label: "Active",
    urdu: "زیر سماعت",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  AWAITING_HEARING: {
    label: "Awaiting Hearing",
    urdu: "تاریخ پیشی مقرر",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  AWAITING_CLIENT: {
    label: "Awaiting Client",
    urdu: "مؤکل کے جواب کا انتظار",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },
  JUDGMENT_RESERVED: {
    label: "Judgment Reserved",
    urdu: "فیصلہ محفوظ",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  DECIDED: {
    label: "Decided",
    urdu: "فیصلہ شدہ",
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/30",
  },
  APPEALED: {
    label: "Appealed",
    urdu: "اپیل زیر کارروائی",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
  },
  CLOSED: {
    label: "Closed",
    urdu: "داخل دفتر",
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
  },
};

export function StatusBadge({ status, size = "sm", showUrdu = false }: StatusBadgeProps) {
  const normalized = status.toUpperCase().replace(/\s+/g, "_");
  const config = STATUS_CONFIG[normalized] || {
    label: status,
    urdu: status,
    bg: "bg-slate-800",
    text: "text-slate-300",
    border: "border-slate-700",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors",
        config.bg,
        config.text,
        config.border,
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <span
        className={clsx(
          "rounded-full shrink-0",
          size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
          config.text.replace("text-", "bg-")
        )}
      />
      <span>{config.label}</span>
      {showUrdu && (
        <span className="font-urdu text-[11px] opacity-75 mr-0.5 border-l border-current pl-1.5 ml-0.5">
          {config.urdu}
        </span>
      )}
    </span>
  );
}
