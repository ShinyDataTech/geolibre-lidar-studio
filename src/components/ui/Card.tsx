import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = "", title, action }) => {
  return (
    <div
      className={`bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-xl p-3.5 shadow-xl ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/60">
          {title && <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
