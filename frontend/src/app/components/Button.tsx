"use client";
import React from "react";
import { cn } from "./utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  leftIcon,
  children,
  ...props
}: ButtonProps) {
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-[#167a5b] text-white hover:bg-[#116348] focus-visible:ring-[var(--color-ring)] dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400",
    secondary:
      "bg-muted text-foreground hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
    outline:
      "border border-border bg-card text-foreground hover:border-[#a9b8b0] hover:bg-muted",
    ghost:
      "text-foreground hover:bg-muted",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-5 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none active:translate-y-px",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {leftIcon ? <span className="mr-2 inline-flex items-center">{leftIcon}</span> : null}
      {children}
    </button>
  );
}
