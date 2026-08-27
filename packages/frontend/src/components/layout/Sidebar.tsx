import React from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  BadgeDollarSign,
  Globe2,
  Activity,
  Leaf,
  Clock,
  Package,
  Cuboid,
  ListTodo,
  FileText,
  Settings,
  Boxes,
  Calendar,
  Book,
  Briefcase,
  ShieldAlert,
  Landmark,
  Users,
  X,
  Plane,
  FileSignature,
  Truck,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { NavLink } from "../NavLink";
import { Button } from "@atlas/ui";

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const role = user?.role || "USER";

  const isShipper = role === "CUSTOMER";
  const isCustomsBroker = role === "OPERATIONS";
  const isAdminOrFF =
    role === "ADMIN" ||
    role === "MANAGER" ||
    role === "EXECUTIVE" ||
    role === "SALES";

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Shell */}
      <aside
        className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition duration-200 ease-in-out w-72 bg-slate-950 text-slate-300 p-6 flex flex-col gap-8 z-50 shadow-2xl border-r border-slate-800/60 overflow-y-auto`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Globe2 size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-widest text-white">
              ATLAS<span className="text-indigo-500">.</span>
            </h1>
          </div>
          <Button
            className="md:hidden text-slate-400 hover:text-white p-0 h-auto"
            onClick={() => setMobileMenuOpen(false)}
            variant="ghost"
          >
            <X size={24} />
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">
            Core
          </span>
          {(isAdminOrFF || isCustomsBroker || isShipper) && (
            <NavLink
              onClick={() => setMobileMenuOpen(false)}
              to="/"
              icon={LayoutDashboard}
            >
              {t("sidebar.dashboard")}
            </NavLink>
          )}
          {(isAdminOrFF || isShipper) && (
            <NavLink
              onClick={() => setMobileMenuOpen(false)}
              to="/quotes"
              icon={BadgeDollarSign}
            >
              {t("sidebar.rateComparer")}
            </NavLink>
          )}
          {isAdminOrFF && (
            <NavLink
              onClick={() => setMobileMenuOpen(false)}
              to="/pricing"
              icon={Activity}
            >
              {t("sidebar.pricing")}
            </NavLink>
          )}
          {(isAdminOrFF || isShipper) && (
            <NavLink
              onClick={() => setMobileMenuOpen(false)}
              to="/globe"
              icon={Globe2}
            >
              {t("sidebar.globeTracker")}
            </NavLink>
          )}
          {isAdminOrFF && (
            <NavLink
              onClick={() => setMobileMenuOpen(false)}
              to="/schedules"
              icon={Calendar}
            >
              {t("sidebar.schedules")}
            </NavLink>
          )}
          {isAdminOrFF && (
            <NavLink
              onClick={() => setMobileMenuOpen(false)}
              to="/bookings"
              icon={Book}
            >
              {t("sidebar.bookings")}
            </NavLink>
          )}
        </div>

        {(isAdminOrFF || isCustomsBroker) && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">
              Finance & Compliance
            </span>
            {isAdminOrFF && (
              <NavLink
                onClick={() => setMobileMenuOpen(false)}
                to="/invoices"
                icon={Landmark}
              >
                {t("sidebar.invoicing")}
              </NavLink>
            )}
            {isAdminOrFF && (
              <NavLink
                onClick={() => setMobileMenuOpen(false)}
                to="/settlements"
                icon={Briefcase}
              >
                Agent Settlements
              </NavLink>
            )}
            {isAdminOrFF && (
              <NavLink
                onClick={() => setMobileMenuOpen(false)}
                to="/treasury"
                icon={BadgeDollarSign}
              >
                Treasury & CASS
              </NavLink>
            )}
            {(isAdminOrFF || isCustomsBroker) && (
              <NavLink
                onClick={() => setMobileMenuOpen(false)}
                to="/customs"
                icon={ShieldAlert}
              >
                {t("sidebar.customs")}
              </NavLink>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">
            Analytics
          </span>
          {isAdminOrFF && (
            <NavLink
              onClick={() => setMobileMenuOpen(false)}
              to="/profitability"
              icon={Activity}
            >
              {t("sidebar.profitability")}
            </NavLink>
          )}
          {(isAdminOrFF || isShipper) && (
            <NavLink
              onClick={() => setMobileMenuOpen(false)}
              to="/esg-tracker"
              icon={Leaf}
            >
              {t("sidebar.carbonTracker")}
            </NavLink>
          )}
          {(isAdminOrFF || isCustomsBroker) && (
            <NavLink
              onClick={() => setMobileMenuOpen(false)}
              to="/demurrage"
              icon={Clock}
            >
              {t("sidebar.demurrage")}
            </NavLink>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">
            Operations
          </span>
          {isAdminOrFF && (
            <>
              <NavLink
                onClick={() => setMobileMenuOpen(false)}
                to="/planner"
                icon={Package}
              >
                {t("sidebar.planner")}
              </NavLink>
              <NavLink
                onClick={() => setMobileMenuOpen(false)}
                to="/lcl"
                icon={Cuboid}
              >
                {t("sidebar.lclEngine")}
              </NavLink>
              <NavLink
                onClick={() => setMobileMenuOpen(false)}
                to="/air-freight"
                icon={Plane}
              >
                Air Freight (e-AWB)
              </NavLink>
              <NavLink
                onClick={() => setMobileMenuOpen(false)}
                to="/road-freight"
                icon={Truck}
              >
                Road Freight (e-CMR)
              </NavLink>
              <NavLink
                onClick={() => setMobileMenuOpen(false)}
                to="/contracts"
                icon={FileSignature}
              >
                Incoterms & Contracts
              </NavLink>
              <NavLink
                onClick={() => setMobileMenuOpen(false)}
                to="/claims"
                icon={ShieldAlert}
              >
                Claims & Subrogation
              </NavLink>
              <NavLink
                onClick={() => setMobileMenuOpen(false)}
                to="/warehouse"
                icon={Boxes}
              >
                {t("sidebar.warehouse")}
              </NavLink>
              <NavLink
                onClick={() => setMobileMenuOpen(false)}
                to="/tasks"
                icon={ListTodo}
              >
                {t("sidebar.tasklist")}
              </NavLink>
              <NavLink
                onClick={() => setMobileMenuOpen(false)}
                to="/documents"
                icon={FileText}
              >
                {t("sidebar.documents")}
              </NavLink>
              <NavLink
                onClick={() => setMobileMenuOpen(false)}
                to="/workflows"
                icon={Settings}
              >
                Workflows Modeler
              </NavLink>
            </>
          )}
          {(isAdminOrFF || isCustomsBroker) && (
            <NavLink
              onClick={() => setMobileMenuOpen(false)}
              to="/bookings"
              icon={FileText}
            >
              EDI/XML Parser
            </NavLink>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">
            External Views
          </span>
          <NavLink
            onClick={() => setMobileMenuOpen(false)}
            to="/portal"
            icon={Users}
          >
            {t("sidebar.customerPortal")}
          </NavLink>
        </div>
      </aside>
    </>
  );
};
