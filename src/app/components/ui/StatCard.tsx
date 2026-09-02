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
  badgeVariant = "neutral",
  icon,
  subtitle,
  accentColor,
  className,
}: StatCardProps) {
  const accentBorders = {
    brand: "border-l-4 border-l-red-500",
    blue: "border-l-4 border-l-[#84E2FA]",
    green: "border-l-4 border-l-[#A6F686]",
    yellow: "border-l-4 border-l-[#FFCD20]",
    pink: "border-l-4 border-l-[#FF88D3]",
  };

  const badgeStyles = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    brand: "bg-red-50 text-red-700 border-red-200",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
  };

  return (
    <div
      className={cn(
        "bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-xs transition-all hover:shadow-md hover:border-slate-300",
        accentColor && accentBorders[accentColor],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="h-9 w-9 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between mt-4">
        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </span>
        {badgeText && (
          <span
            className={cn(
              "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
              badgeStyles[badgeVariant]
            )}
          >
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-slate-400 font-medium mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
