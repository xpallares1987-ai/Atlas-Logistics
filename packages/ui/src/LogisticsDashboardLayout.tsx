import React, { ReactNode } from "react";
import { LayoutDashboard, RefreshCw } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
}

export interface LogisticsDashboardLayoutProps {
  title: string;
  subtitle?: string;
  activeTab: string;
  onTabChange: (id: string) => void;
  navItems: NavItem[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  isSyncing?: boolean;
  children: ReactNode;
}

export const LogisticsDashboardLayout: React.FC<
  LogisticsDashboardLayoutProps
> = ({
  title,
  subtitle,
  activeTab,
  onTabChange,
  navItems,
  searchTerm,
  onSearchChange,
  isSyncing,
  children,
}) => {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="brand-icon">
            <LayoutDashboard size={24} />
          </div>
          <div className="brand-text">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>

        <nav className="dashboard-nav">
          {navItems.map((item) => {
            if (item.href) {
              return (
                <a key={item.id} href={item.href} className="nav-link-special">
                  {item.icon} {item.label}
                </a>
              );
            }
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={activeTab === item.id ? "active" : ""}
              >
                {item.icon} {item.label}
              </button>
            );
          })}
        </nav>

        <div className="header-actions">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar en la tabla..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          {isSyncing && (
            <RefreshCw size={18} className="spin-animation text-primary" />
          )}
        </div>
      </header>

      <main className="dashboard-main">{children}</main>
    </div>
  );
};
