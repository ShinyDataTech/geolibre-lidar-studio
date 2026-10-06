import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "secondary",
  size = "md",
  icon,
  className,
  disabled,
  ...props
}) => {
  const base = "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-studio-accent/40 active:scale-[0.98]";

  const sizes = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3.5 py-1.5 text-sm gap-2",
    lg: "px-4 py-2 text-base gap-2.5",
  };

  const variants = {
    primary: "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-md shadow-cyan-950/40",
    secondary: "bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700/60 hover:border-slate-600",
    accent: "bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-950/40",
    danger: "bg-rose-600 hover:bg-rose-500 text-white font-medium",
    ghost: "bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white",
  };

  const disabledStyles = disabled ? "opacity-50 pointer-events-none" : "cursor-pointer";

  return (
    <button
      className={twMerge(clsx(base, sizes[size], variants[variant], disabledStyles, className))}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
