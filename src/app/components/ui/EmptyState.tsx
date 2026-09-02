import React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "neutral" | "blue" | "green" | "yellow" | "pink";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "neutral",
  className,
}: EmptyStateProps) {
  const variantStyles = {
    neutral: "bg-[#F7F6F3]/80 border-transparent",
    blue: "bg-[#EBF9FD] border-transparent",
    green: "bg-[#F0FCEE] border-transparent",
    yellow: "bg-[#FFFCE8] border-transparent",
    pink: "bg-[#FFF0F8] border-transparent",
  };

  const iconBg = {
    neutral: "bg-white text-slate-500 shadow-sm",
    blue: "bg-white text-[#0284C7] shadow-sm",
    green: "bg-white text-[#16A34A] shadow-sm",
    yellow: "bg-white text-[#CA8A04] shadow-sm",
    pink: "bg-white text-[#DB2777] shadow-sm",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-12 rounded-3xl transition-all",
        variantStyles[variant],
        className
      )}
    >
      <div className={cn("h-16 w-16 rounded-3xl flex items-center justify-center mb-4 transition-transform hover:scale-105", iconBg[variant])}>
        {icon}
      </div>
      <h4 className="text-base font-extrabold text-[#101828] tracking-tight mb-1.5">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-5 font-medium">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
