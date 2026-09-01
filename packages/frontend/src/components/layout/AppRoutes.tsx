import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "../ProtectedRoute";
import { SkeletonLoader } from "../SkeletonLoader";

const Login = React.lazy(() => import("../../pages/Login"));
const DashboardModule = React.lazy(() => import("../../pages/DashboardModule"));
// @ts-ignore
const RateComparerModule = React.lazy(() => import("@atlas/rate-comparer"));
const ESGCarbonTrackerModule = React.lazy(
  () => import("../../pages/ESGCarbonTrackerModule"),
);
const ContainerPlannerModule = React.lazy(
  () => import("../../pages/ContainerPlannerModule"),
);
const HumanTasklistModule = React.lazy(
  () => import("../../pages/HumanTasklistModule"),
);
const ProfitabilityModule = React.lazy(
  () => import("../../pages/ProfitabilityModule"),
);
const GlobeTrackerModule = React.lazy(
  () => import("../../pages/GlobeTrackerModule"),
);
const DemurrageAlertsModule = React.lazy(
  () => import("../../pages/DemurrageAlertsModule"),
);
const LclConsolidationModule = React.lazy(
  () => import("../../pages/LclConsolidationModule"),
);
const DynamicPricingModule = React.lazy(
  () => import("../../pages/DynamicPricingModule"),
);
const DocumentVaultModule = React.lazy(
  () => import("../../pages/DocumentVaultModule"),
);
// @ts-ignore
const WarehouseOpsModule = React.lazy(() =>
  // @ts-ignore
  import("@atlas/mfe-warehouse/src/WarehouseOps").then((m) => ({
    default: m.default,
  })),
);
const SailingSchedulesModule = React.lazy(
  () => import("../../pages/SailingSchedulesModule"),
);
const BookingManagementModule = React.lazy(
  () => import("../../pages/BookingManagementModule"),
);
const CustomsClearanceModule = React.lazy(
  () => import("../../pages/CustomsClearanceModule"),
);
const AirCargoModule = React.lazy(() => import("../../pages/AirCargoModule"));
const IncotermsContractsModule = React.lazy(
  () => import("../../pages/IncotermsContractsModule"),
);
const CargoClaimsModule = React.lazy(
  () => import("../../pages/CargoClaimsModule"),
);
const RoadFreightModule = React.lazy(
  () => import("../../pages/RoadFreightModule"),
);
const TreasurySettlementsModule = React.lazy(
  () => import("../../pages/TreasurySettlementsModule"),
);
const ColdChainModule = React.lazy(() => import("../../pages/ColdChainModule"));
const CbamModule = React.lazy(() => import("../../pages/CbamModule"));
const RailFreightModule = React.lazy(
  () => import("../../pages/RailFreightModule"),
);
const CustomsWarehouseModule = React.lazy(
  () => import("../../pages/CustomsWarehouseModule"),
);
const FuelEuMaritimeModule = React.lazy(
  () => import("../../pages/FuelEuMaritimeModule"),
);
const TradeFinanceModule = React.lazy(
  () => import("../../pages/TradeFinanceModule"),
);
const AeoSecurityModule = React.lazy(
  () => import("../../pages/AeoSecurityModule"),
);
const CharteringLaytimeModule = React.lazy(
  () => import("../../pages/CharteringLaytimeModule"),
);
const GeneralAverageModule = React.lazy(
  () => import("../../pages/GeneralAverageModule"),
);
const DangerousGoodsModule = React.lazy(
  () => import("../../pages/DangerousGoodsModule"),
);
const InvoicingModule = React.lazy(() => import("../../pages/InvoicingModule"));
const AgentSettlementsModule = React.lazy(
  () => import("../../pages/AgentSettlementsModule"),
);
const CustomerPortalModule = React.lazy(
  () => import("../../pages/CustomerPortalModule"),
);
const WorkflowManagerModule = React.lazy(
  () => import("../../pages/WorkflowManagerModule"),
);
const SettingsModule = React.lazy(() => import("../../pages/SettingsModule"));
const PrivacyPolicy = React.lazy(() => import("../../pages/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("../../pages/TermsOfService"));
const PublicTracking = React.lazy(() => import("../../pages/PublicTracking"));

export const AppRoutes = () => {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 h-full w-full">
          <SkeletonLoader height="8rem" borderRadius="1rem" />
          <SkeletonLoader height="3rem" borderRadius="0.5rem" count={3} />
          <div className="flex-1">
            <SkeletonLoader height="100%" borderRadius="1rem" />
          </div>
        </div>
      }
    >
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Core Modules - Accessible by internal roles */}
        <Route
          path="/"
          element={
            <ProtectedRoute
              allowedRoles={[
                "ADMIN",
                "EXECUTIVE",
                "MANAGER",
                "SALES",
                "OPERATIONS",
              ]}
            >
              <DashboardModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quotes"
          element={
            <ProtectedRoute
              allowedRoles={[
                "ADMIN",
                "EXECUTIVE",
                "MANAGER",
                "SALES",
                "OPERATIONS",
              ]}
            >
              <RateComparerModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pricing"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "EXECUTIVE", "MANAGER", "SALES"]}
            >
              <DynamicPricingModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/globe"
          element={
            <ProtectedRoute
              allowedRoles={[
                "ADMIN",
                "EXECUTIVE",
                "MANAGER",
                "SALES",
                "OPERATIONS",
              ]}
            >
              <GlobeTrackerModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedules"
          element={
            <ProtectedRoute
              allowedRoles={[
                "ADMIN",
                "EXECUTIVE",
                "MANAGER",
                "SALES",
                "OPERATIONS",
              ]}
            >
              <SailingSchedulesModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute
              allowedRoles={[
                "ADMIN",
                "EXECUTIVE",
                "MANAGER",
                "SALES",
                "OPERATIONS",
              ]}
            >
              <BookingManagementModule />
            </ProtectedRoute>
          }
        />

        {/* Finance & Compliance - High Privilege */}
        <Route
          path="/invoices"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "EXECUTIVE", "MANAGER"]}>
              <InvoicingModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settlements"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "EXECUTIVE", "MANAGER"]}>
              <AgentSettlementsModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customs"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "OPERATIONS"]}>
              <CustomsClearanceModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/air-freight"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "MANAGER", "OPERATIONS", "EXECUTIVE"]}
            >
              <AirCargoModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts"
          element={
            <ProtectedRoute
              allowedRoles={[
                "ADMIN",
                "MANAGER",
                "OPERATIONS",
                "EXECUTIVE",
                "SALES",
              ]}
            >
              <IncotermsContractsModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/claims"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "MANAGER", "OPERATIONS", "EXECUTIVE"]}
            >
              <CargoClaimsModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/road-freight"
          element={
            <ProtectedRoute
              allowedRoles={[
                "ADMIN",
                "MANAGER",
                "OPERATIONS",
                "EXECUTIVE",
                "DRIVER",
              ]}
            >
              <RoadFreightModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/treasury"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "MANAGER", "OPERATIONS", "EXECUTIVE"]}
            >
              <TreasurySettlementsModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cold-chain"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "MANAGER", "OPERATIONS", "EXECUTIVE"]}
            >
              <ColdChainModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cbam"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "MANAGER", "OPERATIONS", "EXECUTIVE"]}
            >
              <CbamModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rail-freight"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "MANAGER", "OPERATIONS", "EXECUTIVE"]}
            >
              <RailFreightModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customs-warehouse"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "MANAGER", "OPERATIONS", "EXECUTIVE"]}
            >
              <CustomsWarehouseModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fueleu-maritime"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "MANAGER", "OPERATIONS", "EXECUTIVE"]}
            >
              <FuelEuMaritimeModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trade-finance"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "MANAGER", "OPERATIONS", "EXECUTIVE"]}
            >
              <TradeFinanceModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/aeo-security"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "MANAGER", "OPERATIONS", "EXECUTIVE"]}
            >
              <AeoSecurityModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chartering-laytime"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "MANAGER", "OPERATIONS", "EXECUTIVE"]}
            >
              <CharteringLaytimeModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/general-average"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "MANAGER", "OPERATIONS", "EXECUTIVE"]}
            >
              <GeneralAverageModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dangerous-goods"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "MANAGER", "OPERATIONS", "EXECUTIVE"]}
            >
              <DangerousGoodsModule />
            </ProtectedRoute>
          }
        />

        {/* Analytics */}
        <Route
          path="/profitability"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "EXECUTIVE", "MANAGER"]}>
              <ProfitabilityModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/esg-tracker"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "EXECUTIVE", "MANAGER", "OPERATIONS"]}
            >
              <ESGCarbonTrackerModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/demurrage"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "OPERATIONS"]}>
              <DemurrageAlertsModule />
            </ProtectedRoute>
          }
        />

        {/* Operations */}
        <Route
          path="/planner"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "OPERATIONS"]}>
              <ContainerPlannerModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lcl"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "OPERATIONS"]}>
              <LclConsolidationModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warehouse"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "OPERATIONS"]}>
              <WarehouseOpsModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute
              allowedRoles={[
                "ADMIN",
                "EXECUTIVE",
                "MANAGER",
                "SALES",
                "OPERATIONS",
              ]}
            >
              <HumanTasklistModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute
              allowedRoles={[
                "ADMIN",
                "EXECUTIVE",
                "MANAGER",
                "SALES",
                "OPERATIONS",
              ]}
            >
              <DocumentVaultModule />
            </ProtectedRoute>
          }
        />

        <Route
          path="/workflows"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <WorkflowManagerModule />
            </ProtectedRoute>
          }
        />

        {/* External Portal */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "CUSTOMER"]}>
              <CustomerPortalModule />
            </ProtectedRoute>
          }
        />
        <Route path="/track/:referenceNumber?" element={<PublicTracking />} />

        {/* Global Settings */}
        <Route path="/settings" element={<SettingsModule />} />

        {/* Legal Pages */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

        {/* Fallback 404 Route */}
        <Route
          path="*"
          element={
            <div className="flex items-center justify-center h-full text-slate-500 font-medium">
              404 - Page Not Found
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
};
