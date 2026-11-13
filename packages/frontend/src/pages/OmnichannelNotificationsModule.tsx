/**
 * @file OmnichannelNotificationsModule.tsx
 * @description Orchestrator for Omnichannel Notifications & Driver Gateway (MS Teams Adaptive Cards 1.5, Telegram Driver Bot, and HMAC-SHA256 Audit Log).
 * @module @atlas/frontend/pages/OmnichannelNotificationsModule
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import {
  Header,
  TeamsStudio,
  TelegramDriver,
  AuditLog,
  DriverReport,
  DispatchOrder,
  useOmnichannelNotifications,
} from "../components/OmnichannelNotifications";

export default function OmnichannelNotificationsModule() {
  const {
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
    auditLogs,
    telegramMessages,
    telegramOrders,
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
  } = useOmnichannelNotifications();

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto text-slate-100">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        auditCount={auditLogs.length}
      />

      {activeTab === "TEAMS_STUDIO" && (
        <TeamsStudio
          selectedAnomaly={selectedAnomaly}
          onSelectAnomaly={handleSelectAnomaly}
          activeContext={activeContext}
          setActiveContext={setActiveContext}
          targetWebhookUrl={targetWebhookUrl}
          setTargetWebhookUrl={setTargetWebhookUrl}
          currentPayload={currentPayload}
          metadata={metadata}
          copiedJson={copiedJson}
          onCopyJson={handleCopyJson}
          isDispatching={dispatchMutation.isPending}
          onDispatch={() =>
            dispatchMutation.mutate({
              anomalyType: selectedAnomaly,
              context: activeContext,
              targetWebhookUrl: targetWebhookUrl || "INTERNAL_BUS",
            })
          }
        />
      )}

      {activeTab === "TELEGRAM_DRIVER" && (
        <TelegramDriver
          messages={telegramMessages}
          orders={telegramOrders}
          onOpenDriverModal={() => setIsDriverModalOpen(true)}
          onOpenOrderModal={() => setIsOrderModalOpen(true)}
        />
      )}

      {activeTab === "AUDIT_LOG" && (
        <AuditLog logs={auditLogs} onRefresh={handleRefreshAuditLog} />
      )}

      <DriverReport
        isOpen={isDriverModalOpen}
        onClose={() => setIsDriverModalOpen(false)}
        driverName={driverName}
        setDriverName={setDriverName}
        driverChatId={driverChatId}
        setDriverChatId={setDriverChatId}
        driverTruckId={driverTruckId}
        setDriverTruckId={setDriverTruckId}
        driverReportType={driverReportType}
        setDriverReportType={setDriverReportType}
        driverDetails={driverDetails}
        setDriverDetails={setDriverDetails}
        driverAmount={driverAmount}
        setDriverAmount={setDriverAmount}
        driverLocation={driverLocation}
        setDriverLocation={setDriverLocation}
        isSubmitting={driverReportMutation.isPending}
        onSubmit={() =>
          driverReportMutation.mutate({
            driverName,
            telegramChatId: driverChatId,
            truckId: driverTruckId,
            reportType: driverReportType,
            details: driverDetails,
            amountOrMinutes: driverAmount,
            location: driverLocation,
          })
        }
      />

      <DispatchOrder
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        orderDriverName={orderDriverName}
        setOrderDriverName={setOrderDriverName}
        orderChatId={orderChatId}
        setOrderChatId={setOrderChatId}
        orderTruckId={orderTruckId}
        setOrderTruckId={setOrderTruckId}
        orderPickup={orderPickup}
        setOrderPickup={setOrderPickup}
        orderDelivery={orderDelivery}
        setOrderDelivery={setOrderDelivery}
        orderCargo={orderCargo}
        setOrderCargo={setOrderCargo}
        orderContainer={orderContainer}
        setOrderContainer={setOrderContainer}
        isSubmitting={dispatchOrderMutation.isPending}
        onSubmit={() =>
          dispatchOrderMutation.mutate({
            driverName: orderDriverName,
            telegramChatId: orderChatId,
            truckId: orderTruckId,
            pickupLocation: orderPickup,
            deliveryLocation: orderDelivery,
            cargoDescription: orderCargo,
            containerNumber: orderContainer,
          })
        }
      />
    </div>
  );
}
