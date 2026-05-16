import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({ 
  children, 
  variant = "primary", 
  size = "md", 
  isLoading = false, 
  className = "", 
  ...props 
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-emerald-500 text-slate-950 hover:bg-emerald-400 focus:ring-emerald-500 shadow-lg shadow-emerald-500/10",
    secondary: "bg-slate-800 text-white hover:bg-slate-700 focus:ring-slate-700 border border-slate-700",
    outline: "bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white focus:ring-slate-700",
    danger: "bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white focus:ring-rose-500",
    ghost: "bg-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white focus:ring-slate-800",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "error" | "info" | "neutral";
  size?: "xs" | "sm";
}

export function Badge({ children, variant = "neutral", size = "xs" }: BadgeProps) {
  const variants = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    error: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    info: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    neutral: "bg-slate-800 text-slate-400 border-slate-700/50",
  };

  const sizes = {
    xs: "px-2 py-0.5 text-[10px]",
    sm: "px-2.5 py-1 text-xs",
  };

  return (
    <span className={`inline-flex items-center rounded-full font-mono font-bold uppercase tracking-wider border ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
}
