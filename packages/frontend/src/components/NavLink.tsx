import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface NavLinkProps {
  to: string;
  icon: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
}

export const NavLink: React.FC<NavLinkProps> = ({
  to,
  icon: Icon,
  children,
  onClick,
}) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`p-3 flex items-center gap-3 rounded-xl transition-all font-medium border ${isActive ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-indigo-300 border-transparent"}`}
    >
      <Icon
        size={18}
        className={isActive ? "text-indigo-400" : "text-slate-500"}
      />
      {children}
    </Link>
  );
};
