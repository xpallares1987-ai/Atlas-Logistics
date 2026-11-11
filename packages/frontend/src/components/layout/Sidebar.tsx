import React, { useState } from "react";
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
  BookOpen,
  Briefcase,
  ShieldAlert,
  Landmark,
  Users,
  X,
  Plane,
  FileSignature,
  Truck,
  Snowflake,
  TrainTrack,
  Building2,
  Ship,
  ShieldCheck,
  Anchor,
  Flame,
  Zap,
  ArrowLeftRight,
  Radio,
  FileCode2,
  Compass,
  Coins,
  Sliders,
  CheckCircle2,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { NavLink } from "../NavLink";
import { Button } from "@atlas/ui";

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

type Persona = "all" | "ops" | "finance" | "compliance";

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [persona, setPersona] = useState<Persona>(() => {
    try {
      const saved = localStorage.getItem("atlas_sidebar_persona");
      if (
        saved === "ops" ||
        saved === "finance" ||
        saved === "compliance" ||
        saved === "all"
      ) {
        return saved;
      }
    } catch {}
    return "all";
  });

  const handleSelectPersona = (p: Persona) => {
    setPersona(p);
    try {
      localStorage.setItem("atlas_sidebar_persona", p);
    } catch {}
  };

  const role = user?.role || "USER";
  const isCustomsBroker = role === "OPERATIONS";
  const isAdminOrFF =
    role === "ADMIN" ||
    role === "MANAGER" ||
    role === "EXECUTIVE" ||
    role === "SALES";

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Shell */}
      <aside
        className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out w-72 shrink-0 bg-slate-950 text-slate-300 p-5 flex flex-col gap-5 z-50 shadow-2xl border-r border-slate-800/60 overflow-y-auto`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Globe2 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-widest text-white leading-none">
                ATLAS<span className="text-indigo-500">.</span>
              </h1>
              <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">
                Enterprise Logistics
              </span>
            </div>
          </div>
          <Button
            className="md:hidden text-slate-400 hover:text-white p-0 h-auto"
            onClick={closeMobile}
            variant="ghost"
            aria-label="Cerrar menú de navegación móvil"
          >
            <X size={24} />
          </Button>
        </div>

        {/* Persona Switcher (Option C) */}
        <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 shadow-inner">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 mb-0.5 flex items-center justify-between">
            <span>Navigation View</span>
            <span className="text-[8px] font-mono text-indigo-400">
              {persona.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => handleSelectPersona("all")}
              className={`py-1 px-1 rounded-lg text-[11px] font-medium transition-colors duration-150 text-center ${
                persona === "all"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => handleSelectPersona("ops")}
              className={`py-1 px-1 rounded-lg text-[11px] font-medium transition-colors duration-150 text-center ${
                persona === "ops"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Ops
            </button>
            <button
              type="button"
              onClick={() => handleSelectPersona("finance")}
              className={`py-1 px-1 rounded-lg text-[11px] font-medium transition-colors duration-150 text-center ${
                persona === "finance"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Finance
            </button>
            <button
              type="button"
              onClick={() => handleSelectPersona("compliance")}
              className={`py-1 px-1 rounded-lg text-[11px] font-medium transition-colors duration-150 text-center ${
                persona === "compliance"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Comp
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW: OPERATIONS PERSONA                                                  */}
        {/* ========================================================================= */}
        {persona === "ops" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Mission Control
              </span>
              <NavLink onClick={closeMobile} to="/" icon={LayoutDashboard}>
                {t("sidebar.dashboard")}
              </NavLink>
              {(isAdminOrFF || isCustomsBroker) && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/cockpit"
                    icon={Zap}
                    badge="Inbox"
                  >
                    Operations Cockpit
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/shipment-360"
                    icon={Compass}
                    badge="360°"
                  >
                    Shipment 360
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/control-tower"
                    icon={Radio}
                    badge="AI Ops"
                  >
                    Control Tower
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/exceptions"
                    icon={ShieldAlert}
                  >
                    Exception Center
                  </NavLink>
                </>
              )}
              <NavLink onClick={closeMobile} to="/globe" icon={Globe2}>
                Globe Tracker
              </NavLink>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Freight & Multimodal
              </span>
              {isAdminOrFF && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/schedules"
                    icon={Calendar}
                  >
                    Sailing Schedules
                  </NavLink>
                  <NavLink onClick={closeMobile} to="/bookings" icon={Book}>
                    Booking & B/L
                  </NavLink>
                  <NavLink onClick={closeMobile} to="/planner" icon={Package}>
                    Container Planner
                  </NavLink>
                  <NavLink onClick={closeMobile} to="/lcl" icon={Cuboid}>
                    LCL Consolidation
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/air-freight"
                    icon={Plane}
                    badge="e-AWB"
                  >
                    Air Freight
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/road-freight"
                    icon={Truck}
                    badge="e-CMR"
                  >
                    Road Freight
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/drayage"
                    icon={Truck}
                    badge="GLEC"
                  >
                    Port Drayage
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/rail-freight"
                    icon={TrainTrack}
                    badge="TEN-T"
                  >
                    Rail Freight
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/bulk-operations"
                    icon={Anchor}
                    badge="IMSBC"
                  >
                    Bulk Operations
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/chartering-laytime"
                    icon={Anchor}
                    badge="BIMCO"
                  >
                    Chartering & Laytime
                  </NavLink>
                  <NavLink onClick={closeMobile} to="/warehouse" icon={Boxes}>
                    Warehouse 3D
                  </NavLink>
                  <NavLink onClick={closeMobile} to="/tasks" icon={ListTodo}>
                    Tasklist
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/port-congestion"
                    icon={Compass}
                    badge="AIS"
                  >
                    Port & AIS Radar
                  </NavLink>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Directory & Docs
              </span>
              <NavLink
                onClick={closeMobile}
                to="/addresses"
                icon={Building2}
                badge="Directory"
              >
                Addresses & B/L Hub
              </NavLink>
              <NavLink onClick={closeMobile} to="/documents" icon={FileText}>
                Document Vault
              </NavLink>
              <NavLink onClick={closeMobile} to="/wiki" icon={BookOpen}>
                Knowledge Wiki
              </NavLink>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW: FINANCE PERSONA                                                     */}
        {/* ========================================================================= */}
        {persona === "finance" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Commercial & P&L
              </span>
              <NavLink onClick={closeMobile} to="/" icon={LayoutDashboard}>
                {t("sidebar.dashboard")}
              </NavLink>
              {isAdminOrFF && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/profitability"
                    icon={Activity}
                    badge="P&L"
                  >
                    Profitability
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/quotes"
                    icon={BadgeDollarSign}
                  >
                    Rate Comparer
                  </NavLink>
                  <NavLink onClick={closeMobile} to="/pricing" icon={Activity}>
                    Dynamic Pricing
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/demurrage"
                    icon={Clock}
                    badge="D&D"
                  >
                    Demurrage Alerts
                  </NavLink>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Invoicing & Settlements
              </span>
              {isAdminOrFF && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/invoices"
                    icon={Landmark}
                    badge="AR/AP"
                  >
                    Invoicing & Billing
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/settlements"
                    icon={Briefcase}
                  >
                    Agent Settlements
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/treasury"
                    icon={BadgeDollarSign}
                    badge="IATA"
                  >
                    Treasury & CASS
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/trade-finance"
                    icon={Landmark}
                    badge="UCP 600"
                  >
                    Trade Finance
                  </NavLink>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Legal & Contracts
              </span>
              {isAdminOrFF && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/cargo-insurance"
                    icon={ShieldCheck}
                    badge="ICC"
                  >
                    Cargo Insurance
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/claims"
                    icon={ShieldAlert}
                    badge="Claims"
                  >
                    Cargo Claims
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/general-average"
                    icon={Flame}
                    badge="YAR"
                  >
                    General Average
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/contracts"
                    icon={FileSignature}
                    badge="2020"
                  >
                    Incoterms Contracts
                  </NavLink>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Directory & Docs
              </span>
              <NavLink
                onClick={closeMobile}
                to="/addresses"
                icon={Building2}
                badge="Directory"
              >
                Addresses & B/L Hub
              </NavLink>
              <NavLink onClick={closeMobile} to="/documents" icon={FileText}>
                Document Vault
              </NavLink>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW: COMPLIANCE PERSONA                                                  */}
        {/* ========================================================================= */}
        {persona === "compliance" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Surveillance & Ops
              </span>
              <NavLink onClick={closeMobile} to="/" icon={LayoutDashboard}>
                {t("sidebar.dashboard")}
              </NavLink>
              {(isAdminOrFF || isCustomsBroker) && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/control-tower"
                    icon={Radio}
                    badge="AI Ops"
                  >
                    Control Tower
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/exceptions"
                    icon={ShieldAlert}
                  >
                    Exception Center
                  </NavLink>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Customs & Security
              </span>
              {(isAdminOrFF || isCustomsBroker) && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/customs"
                    icon={ShieldAlert}
                    badge="DUA"
                  >
                    Customs Clearance
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/customs-warehouse"
                    icon={Building2}
                    badge="Bonded"
                  >
                    Customs Warehouse
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/cross-border-usmca"
                    icon={Truck}
                    badge="T-MEC"
                  >
                    USMCA Cross-Border
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/aeo-security"
                    icon={ShieldCheck}
                    badge="C-TPAT"
                  >
                    AEO & Cargo Security
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/security-risk"
                    icon={ShieldAlert}
                    badge="PKI"
                  >
                    Security & Resilience
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/smart-contracts"
                    icon={FileCode2}
                    badge="MLETR"
                  >
                    e-BL & Smart Contracts
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/iata-one-record"
                    icon={Plane}
                    badge="1Record"
                  >
                    IATA ONE Record
                  </NavLink>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Regulated Cargo
              </span>
              {isAdminOrFF && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/cold-chain"
                    icon={Snowflake}
                    badge="GDP"
                  >
                    Cold Chain
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/dangerous-goods"
                    icon={Zap}
                    badge="IMDG"
                  >
                    Dangerous Goods
                  </NavLink>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Decarbonization (EU ETS)
              </span>
              {isAdminOrFF && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/cbam"
                    icon={Leaf}
                    badge="CBAM"
                  >
                    CBAM Emissions
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/fueleu-maritime"
                    icon={Ship}
                    badge="FuelEU"
                  >
                    FuelEU Maritime
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/carbon-insetting"
                    icon={Coins}
                    badge="Twin"
                  >
                    Carbon Insetting
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/esg-tracker"
                    icon={Leaf}
                    badge="GLEC"
                  >
                    Carbon Tracker
                  </NavLink>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Directory & Docs
              </span>
              <NavLink
                onClick={closeMobile}
                to="/addresses"
                icon={Building2}
                badge="Directory"
              >
                Addresses & B/L Hub
              </NavLink>
              <NavLink onClick={closeMobile} to="/documents" icon={FileText}>
                Document Vault
              </NavLink>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW: ALL (FULL ENTERPRISE HIERARCHY)                                     */}
        {/* ========================================================================= */}
        {persona === "all" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Mission Control
              </span>
              <NavLink onClick={closeMobile} to="/" icon={LayoutDashboard}>
                {t("sidebar.dashboard")}
              </NavLink>
              {(isAdminOrFF || isCustomsBroker) && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/cockpit"
                    icon={Zap}
                    badge="Inbox"
                  >
                    Operations Cockpit
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/shipment-360"
                    icon={Compass}
                    badge="360°"
                  >
                    Shipment 360
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/control-tower"
                    icon={Radio}
                    badge="AI Ops"
                  >
                    Control Tower
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/exceptions"
                    icon={ShieldAlert}
                  >
                    Exception Center
                  </NavLink>
                </>
              )}
              <NavLink onClick={closeMobile} to="/globe" icon={Globe2}>
                Globe Tracker
              </NavLink>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Multimodal Transport
              </span>
              {isAdminOrFF && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/schedules"
                    icon={Calendar}
                  >
                    Sailing Schedules
                  </NavLink>
                  <NavLink onClick={closeMobile} to="/bookings" icon={Book}>
                    Booking & B/L
                  </NavLink>
                  <NavLink onClick={closeMobile} to="/planner" icon={Package}>
                    Container Planner
                  </NavLink>
                  <NavLink onClick={closeMobile} to="/lcl" icon={Cuboid}>
                    LCL Consolidation
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/air-freight"
                    icon={Plane}
                    badge="e-AWB"
                  >
                    Air Freight
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/road-freight"
                    icon={Truck}
                    badge="e-CMR"
                  >
                    Road Freight
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/drayage"
                    icon={Truck}
                    badge="GLEC"
                  >
                    Port Drayage
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/rail-freight"
                    icon={TrainTrack}
                    badge="TEN-T"
                  >
                    Rail Freight
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/bulk-operations"
                    icon={Anchor}
                    badge="IMSBC"
                  >
                    Bulk Operations
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/chartering-laytime"
                    icon={Anchor}
                    badge="BIMCO"
                  >
                    Chartering & Laytime
                  </NavLink>
                  <NavLink onClick={closeMobile} to="/warehouse" icon={Boxes}>
                    Warehouse 3D
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/port-congestion"
                    icon={Compass}
                    badge="AIS"
                  >
                    Port & AIS Radar
                  </NavLink>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Customs & Security
              </span>
              {(isAdminOrFF || isCustomsBroker) && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/customs"
                    icon={ShieldAlert}
                    badge="DUA"
                  >
                    Customs Clearance
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/customs-warehouse"
                    icon={Building2}
                    badge="Bonded"
                  >
                    Customs Warehouse
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/cross-border-usmca"
                    icon={Truck}
                    badge="T-MEC"
                  >
                    USMCA Cross-Border
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/aeo-security"
                    icon={ShieldCheck}
                    badge="C-TPAT"
                  >
                    AEO & Cargo Security
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/security-risk"
                    icon={ShieldAlert}
                    badge="PKI"
                  >
                    Security & Resilience
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/smart-contracts"
                    icon={FileCode2}
                    badge="MLETR"
                  >
                    e-BL & Smart Contracts
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/iata-one-record"
                    icon={Plane}
                    badge="1Record"
                  >
                    IATA ONE Record
                  </NavLink>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Regulated Cargo & Green
              </span>
              {isAdminOrFF && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/cold-chain"
                    icon={Snowflake}
                    badge="GDP"
                  >
                    Cold Chain
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/dangerous-goods"
                    icon={Zap}
                    badge="IMDG"
                  >
                    Dangerous Goods
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/cbam"
                    icon={Leaf}
                    badge="CBAM"
                  >
                    CBAM Emissions
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/fueleu-maritime"
                    icon={Ship}
                    badge="FuelEU"
                  >
                    FuelEU Maritime
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/carbon-insetting"
                    icon={Coins}
                    badge="Twin"
                  >
                    Carbon Insetting
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/esg-tracker"
                    icon={Leaf}
                    badge="GLEC"
                  >
                    Carbon Tracker
                  </NavLink>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Finance & Legal
              </span>
              {isAdminOrFF && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/invoices"
                    icon={Landmark}
                    badge="AR/AP"
                  >
                    Invoicing & Billing
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/settlements"
                    icon={Briefcase}
                  >
                    Agent Settlements
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/treasury"
                    icon={BadgeDollarSign}
                    badge="IATA"
                  >
                    Treasury & CASS
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/trade-finance"
                    icon={Landmark}
                    badge="UCP 600"
                  >
                    Trade Finance
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/quotes"
                    icon={BadgeDollarSign}
                  >
                    Rate Comparer
                  </NavLink>
                  <NavLink onClick={closeMobile} to="/pricing" icon={Activity}>
                    Dynamic Pricing
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/cargo-insurance"
                    icon={ShieldCheck}
                    badge="ICC"
                  >
                    Cargo Insurance
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/claims"
                    icon={ShieldAlert}
                    badge="Claims"
                  >
                    Cargo Claims
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/general-average"
                    icon={Flame}
                    badge="YAR"
                  >
                    General Average
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/contracts"
                    icon={FileSignature}
                    badge="2020"
                  >
                    Incoterms Contracts
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/demurrage"
                    icon={Clock}
                    badge="D&D"
                  >
                    Demurrage Alerts
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/profitability"
                    icon={Activity}
                    badge="P&L"
                  >
                    Profitability
                  </NavLink>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-1">
                Directory & Standards
              </span>
              <NavLink
                onClick={closeMobile}
                to="/addresses"
                icon={Building2}
                badge="Directory"
              >
                Addresses & B/L Hub
              </NavLink>
              <NavLink onClick={closeMobile} to="/documents" icon={FileText}>
                Document Vault
              </NavLink>
              {isAdminOrFF && (
                <>
                  <NavLink
                    onClick={closeMobile}
                    to="/edi"
                    icon={ArrowLeftRight}
                    badge="EDI"
                  >
                    B2B EDI Hub
                  </NavLink>
                  <NavLink
                    onClick={closeMobile}
                    to="/workflows"
                    icon={Settings}
                  >
                    Workflows Modeler
                  </NavLink>
                  <NavLink onClick={closeMobile} to="/tasks" icon={ListTodo}>
                    Tasklist
                  </NavLink>
                </>
              )}
              <NavLink onClick={closeMobile} to="/wiki" icon={BookOpen}>
                Knowledge Wiki
              </NavLink>
              <NavLink onClick={closeMobile} to="/portal" icon={Users}>
                Customer Portal
              </NavLink>
            </div>
          </div>
        )}

        {/* System Administration - Always accessible to authorized roles */}
        {(isAdminOrFF || isCustomsBroker) && (
          <div className="flex flex-col gap-1 pt-3 border-t border-slate-800/80 mt-auto">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest px-2.5 mb-1 flex items-center justify-between">
              <span>Administration</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                {role}
              </span>
            </span>
            <NavLink
              onClick={closeMobile}
              to="/system-panel"
              icon={Sliders}
              badge="Admin"
            >
              System Governance
            </NavLink>
            <NavLink
              onClick={closeMobile}
              to="/settings#resolutions"
              icon={CheckCircle2}
            >
              Resolution Protocols
            </NavLink>
          </div>
        )}
      </aside>
    </>
  );
};
