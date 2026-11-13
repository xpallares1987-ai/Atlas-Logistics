/**
 * @file useOmnichannelNotifications.ts
 * @description Custom React hook managing MS Teams Adaptive Cards 1.5 studio, Telegram driver gateway, and HMAC-SHA256 webhook audit log.
 * @module @atlas/frontend/components/OmnichannelNotifications/hooks/useOmnichannelNotifications
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { useState } from "react";
import {
  useApiQuery,
  useApiMutation,
  useQueryClient,
} from "../../../hooks/useApiQuery";
import type {
  OperationalAnomalyType,
  AnomalyPayloadContext,
  WebhookAuditLog,
  TelegramDriverMessage,
  TelegramDispatchOrder,
} from "@atlas/shared";
import {
  generateAdaptiveCardPayload,
  getAnomalyMetadata,
  getSampleAnomalyContext,
} from "@atlas/shared";
import {
  DriverReportType,
  OmnichannelTabId,
} from "../../../types/omnichannel-notifications.types";

export const ANOMALY_TEMPLATES: Array<{
  type: OperationalAnomalyType;
  label: string;
}> = [
  {
    type: "COLD_CHAIN_TEMP_BREACH",
    label: "Excursión Térmica en Frío (Pharma/Reefer)",
  },
  {
    type: "CUSTOMS_CANAL_ROJO",
    label: "Canal Rojo Aduanero (Inspección Física)",
  },
  {
    type: "HAZMAT_VIOLATION",
    label: "Infracción IMDG / ADR Mercancías Peligrosas",
  },
  {
    type: "ETA_P1_CRITICAL_DELAY",
    label: "Retraso Crítico en Tránsito (> 48h)",
  },
  {
    type: "DEMURRAGE_DETENTION_SPIKE",
    label: "Vencimiento Inminente de Días Libres (D&D)",
  },
  {
    type: "GROSS_PROFIT_LEAKAGE",
    label: "Fuga de Margen de Beneficio Financiero",
  },
  {
    type: "BL_RELEASE_BLOCKED",
    label: "Bloqueo de e-BL por Facturas Impagadas",
  },
  {
    type: "SPAIN_FWD_REF_DUPLICATE",
    label: "Duplicidad de Referencia Transitaria",
  },
];

export function useOmnichannelNotifications() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<OmnichannelTabId>("TEAMS_STUDIO");
  const [copiedJson, setCopiedJson] = useState(false);

  // Studio State
  const [selectedAnomaly, setSelectedAnomaly] =
    useState<OperationalAnomalyType>("COLD_CHAIN_TEMP_BREACH");
  const [targetWebhookUrl, setTargetWebhookUrl] = useState("");
  const [activeContext, setActiveContext] = useState<AnomalyPayloadContext>(
    getSampleAnomalyContext("COLD_CHAIN_TEMP_BREACH"),
  );

  // New Driver Report Modal State
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [driverName, setDriverName] = useState("Antonio Ramos");
  const [driverChatId, setDriverChatId] = useState("@driver_antonio_bcn");
  const [driverTruckId, setDriverTruckId] = useState("TRK-7712-BXZ");
  const [driverReportType, setDriverReportType] =
    useState<DriverReportType>("YARD_DELAY");
  const [driverDetails, setDriverDetails] = useState(
    "Saturación en muelle de espera de terminal intermodal. Retraso estimado de 45 minutos.",
  );
  const [driverAmount, setDriverAmount] = useState<number | undefined>(45);
  const [driverLocation, setDriverLocation] = useState(
    "Barcelona Intermodal Hub",
  );

  // New Dispatch Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderDriverName, setOrderDriverName] = useState("Juan Carlos Mendoza");
  const [orderChatId, setOrderChatId] = useState("@driver_juan_scm");
  const [orderTruckId, setOrderTruckId] = useState("TRK-4821-LXZ");
  const [orderPickup, setOrderPickup] = useState(
    "Barcelona Rail Terminal (ZAL)",
  );
  const [orderDelivery, setOrderDelivery] = useState(
    "Barcelona Logistics Hub (ZAL Prat)",
  );
  const [orderCargo, setOrderCargo] = useState(
    "1x 40ft HC Bobinas Papel Kraft (24,800 kg)",
  );
  const [orderContainer, setOrderContainer] = useState("MSKU7729104");

  // Queries
  const { data: auditData } = useApiQuery<{
    success: boolean;
    logs: WebhookAuditLog[];
  }>(["teams-audit-log"], "/notifications/teams/audit-log");

  const { data: telegramMessagesData } = useApiQuery<{
    success: boolean;
    messages: TelegramDriverMessage[];
  }>(["telegram-messages"], "/notifications/telegram/messages");

  const { data: telegramOrdersData } = useApiQuery<{
    success: boolean;
    orders: TelegramDispatchOrder[];
  }>(["telegram-orders"], "/notifications/telegram/orders");

  // Mutations
  const dispatchMutation = useApiMutation<
    any,
    {
      anomalyType: OperationalAnomalyType;
      context: AnomalyPayloadContext;
      targetWebhookUrl: string;
    }
  >("/notifications/teams/dispatch", "POST", {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams-audit-log"] });
    },
  });

  const driverReportMutation = useApiMutation<any, any>(
    "/notifications/telegram/driver-report",
    "POST",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["telegram-messages"] });
        setIsDriverModalOpen(false);
      },
    },
  );

  const dispatchOrderMutation = useApiMutation<any, any>(
    "/notifications/telegram/dispatch-order",
    "POST",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["telegram-orders"] });
        queryClient.invalidateQueries({ queryKey: ["telegram-messages"] });
        setIsOrderModalOpen(false);
      },
    },
  );

  const handleSelectAnomaly = (type: OperationalAnomalyType) => {
    setSelectedAnomaly(type);
    setActiveContext(getSampleAnomalyContext(type));
  };

  const currentPayload = generateAdaptiveCardPayload(
    selectedAnomaly,
    activeContext,
  );
  const metadata = getAnomalyMetadata(selectedAnomaly, activeContext);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(currentPayload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleRefreshAuditLog = () => {
    queryClient.invalidateQueries({ queryKey: ["teams-audit-log"] });
  };

  return {
    activeTab,
    setActiveTab,
    copiedJson,
    selectedAnomaly,
    handleSelectAnomaly,
    targetWebhookUrl,
    setTargetWebhookUrl,
    activeContext,
    setActiveContext,
    currentPayload,
    metadata,
    handleCopyJson,
    auditLogs: auditData?.logs || [],
    telegramMessages: telegramMessagesData?.messages || [],
    telegramOrders: telegramOrdersData?.orders || [],
    dispatchMutation,
    driverReportMutation,
    dispatchOrderMutation,
    isDriverModalOpen,
    setIsDriverModalOpen,
    driverName,
    setDriverName,
    driverChatId,
    setDriverChatId,
    driverTruckId,
    setDriverTruckId,
    driverReportType,
    setDriverReportType,
    driverDetails,
    setDriverDetails,
    driverAmount,
    setDriverAmount,
    driverLocation,
    setDriverLocation,
    isOrderModalOpen,
    setIsOrderModalOpen,
    orderDriverName,
    setOrderDriverName,
    orderChatId,
    setOrderChatId,
    orderTruckId,
    setOrderTruckId,
    orderPickup,
    setOrderPickup,
    orderDelivery,
    setOrderDelivery,
    orderCargo,
    setOrderCargo,
    orderContainer,
    setOrderContainer,
    handleRefreshAuditLog,
  };
}
