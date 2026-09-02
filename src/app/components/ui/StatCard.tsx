import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  badgeText?: string;
  badgeVariant?: "success" | "warning" | "brand" | "neutral" | "info";
  icon?: React.ReactNode;
  subtitle?: string;
  accentColor?: "brand" | "blue" | "green" | "yellow" | "pink";
  className?: string;
}

export function StatCard({
  label,
  value,
  badgeText,
  icon,
  subtitle,
  accentColor = "yellow",
  className,
}: StatCardProps) {
  // Grandes superfícies coloridas pastel com alto contraste editorial
  const surfaceThemes = {
    blue: "bg-[#EBF9FD] text-[#0C4A6E] border-transparent",
    green: "bg-[#F0FCEE] text-[#14532D] border-transparent",
    yellow: "bg-[#FFFCE8] text-[#713F12] border-transparent",
    pink: "bg-[#FFF0F8] text-[#831843] border-transparent",
    brand: "bg-[#FEF2F2] text-[#991B1B] border-transparent",
  };

  const badgeTheme = {
    blue: "bg-[#84E2FA]/30 text-[#075985]",
    green: "bg-[#A6F686]/35 text-[#166534]",
    yellow: "bg-[#FFCD20]/30 text-[#854D0E]",
    pink: "bg-[#FF88D3]/30 text-[#9D174D]",
    brand: "bg-red-100 text-red-800",
  };

  const iconTheme = {
    blue: "bg-white/80 text-[#0284C7]",
    green: "bg-white/80 text-[#16A34A]",
    yellow: "bg-white/80 text-[#CA8A04]",
    pink: "bg-white/80 text-[#DB2777]",
    brand: "bg-white/80 text-red-600",
  };

  return (
    <div
      className={cn(
        "rounded-3xl p-7 flex flex-col justify-between transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5",
        surfaceThemes[accentColor],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-widest opacity-75">
          {label}
        </span>
        {icon && (
          <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shadow-2xs shrink-0", iconTheme[accentColor])}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-5 mb-1">
        <div className="text-4xl sm:text-5xl font-black tracking-tight text-[#101828]">
          {value}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5">
        {subtitle && (
          <p className="text-xs font-medium opacity-80 truncate max-w-[200px]">
            {subtitle}
          </p>
        )}
        {badgeText && (
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-2xs ml-auto",
              badgeTheme[accentColor]
            )}
          >
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
}
