import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface NavLinkProps {
  to: string;
  icon: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
  badge?: string;
}

export const NavLink: React.FC<NavLinkProps> = ({
  to,
  icon: Icon,
  children,
  onClick,
  badge,
}) => {
  const location = useLocation();
  const isActive =
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group p-2.5 flex items-center gap-2.5 rounded-xl transition-all text-xs font-medium border ${isActive ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/25 shadow-sm shadow-indigo-500/10 font-semibold" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 border-transparent"}`}
    >
      <Icon
        size={16}
        className={`shrink-0 ${isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-indigo-400"}`}
      />
      <span className="truncate flex-1">{children}</span>
      {badge && (
        <span
          className={`shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border transition-colors ${
            isActive
              ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
              : "bg-slate-800/80 text-slate-400 border-slate-700/60 group-hover:border-slate-600 group-hover:text-slate-300"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
};
