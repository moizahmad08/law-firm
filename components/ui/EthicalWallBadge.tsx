import React from "react";
import { ShieldAlert, Lock } from "lucide-react";
import clsx from "clsx";

export interface EthicalWallBadgeProps {
  isRestricted: boolean;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function EthicalWallBadge({
  isRestricted,
  size = "sm",
  showLabel = true,
}: EthicalWallBadgeProps) {
  if (!isRestricted) return null;

  return (
    <span
      title="Restricted Matter: Protected by Ethical Wall. Accessible strictly to explicitly assigned counsel."
      className={clsx(
        "inline-flex items-center gap-1.5 font-semibold rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-400 shadow-sm",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <ShieldAlert className={clsx(size === "sm" ? "w-3 h-3" : "w-4 h-4", "text-rose-400 shrink-0")} />
      {showLabel && (
        <>
          <span>Ethical Wall</span>
          <span className="font-urdu text-[11px] opacity-80 border-l border-rose-500/30 pl-1">
            خفیہ مقدمہ
          </span>
        </>
      )}
    </span>
  );
}
