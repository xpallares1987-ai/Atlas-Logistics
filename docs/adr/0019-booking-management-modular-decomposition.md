# ADR 0019: Descomposición Modular de Booking Management y Desacoplamiento de Generación Documental PDF

* **Estado**: Aceptado
* **Fecha**: 2026-11-12
* **Autor**: Atlas Logistics Architecture Team & Antigravity Autonomous Agent
* **Contexto**: `packages/frontend/src/pages/BookingManagementModule.tsx`

---

## 1. Contexto y Problema

El módulo `BookingManagementModule.tsx` creció orgánicamente hasta alcanzar los 3.077 líneas de código en un único archivo monolítico. Concentraba:
1. Orquestación del estado de ciclo de vida de reservas relacionales SQLite (Fase 1: PENDING → Fase 2: CONFIRMED con generación atómica de Shipment e hitos).
2. Lógica de 4 perspectivas operativas de pestañas (Rate Lock & Spot Corridors, Radar de Deadlines Cut-Off, SI Studio EDI 304, Equipment Release con Terminal Gate Pass).
3. 2 modales transaccionales completos (`BookingConfirmModal` y `NewBookingRequestModal`).
4. Tres rutinas independientes de maquetación y descarga de documentos PDF (`downloadDraftBLModalPdf`, `downloadShippingInstructionsPdf`, `downloadDepotGatePassPdf`) implementadas con `jsPDF` y `jspdf-autotable`.

Esta acumulación generaba alta carga cognitiva, acoplamiento excesivo y dificultades de mantenimiento y pruebas unitarias aisladas para la generación documental.

---

## 2. Decisión de Diseño

Se aplicó una refactorización arquitectónica basada en tres pilares de decoupling:

1. **Extracción de Tipos y Contratos de Props (`packages/frontend/src/types/booking-management.types.ts`)**:
   - Centralización de `TabKey`, tipos de formularios (`BookingConfirmFormData`, `NewBookingFormData`), interfaces de props de pestañas (`BookingRateLockTabProps`, `BookingCutoffRadarTabProps`, `BookingSiStudioTabProps`, `BookingEquipmentReleaseTabProps`) y modales (`BookingConfirmModalProps`, `NewBookingRequestModalProps`).

2. **Extracción del Motor de Generación PDF (`packages/frontend/src/utils/booking-pdf.utils.ts`)**:
   - Desacoplamiento de las tres rutinas documentales de jsPDF:
     - `downloadDraftBLModalPdf`: Emisión oficial del borrador de conocimiento de embarque multimodal con marca de agua y hash de verificación SHA-256.
     - `downloadShippingInstructionsPdf`: Manifiesto formal DCSA v2.0 / EDI 304.
     - `downloadDepotGatePassPdf`: Pase de acceso al depósito con PIN de 4 dígitos e instrucciones para quiosco OCR.
   - Cobertura completa de pruebas unitarias en `tests/booking-pdf-utils.test.ts`.

3. **Descomposición en Componentes Especializados (`packages/frontend/src/components/bookings/`)**:
   - `BookingRateLockTab.tsx`: Comparador de tarifas spot y previsualización EDI 301.
   - `BookingCutoffRadarTab.tsx`: Semáforos de deadlines (Cargo, VGM, Aduana, SI) y tabla maestra de reservas.
   - `BookingSiStudioTab.tsx`: Editor de instrucciones de embarque, auditoría DCSA IA Flash-Lite, extracción multimodal y transmisión EDI 304.
   - `BookingEquipmentReleaseTab.tsx`: Control de liberación de contenedores, PIN de recogida y pase digital.
   - `modals/BookingConfirmModal.tsx`: Diálogo transaccional para confirmar reserva y enlazar direcciones B/L.
   - `modals/NewBookingRequestModal.tsx`: Creación de nuevas reservas de Fase 1.

---

## 3. Consecuencias y Beneficios

* **Reducción de Complejidad**: El archivo principal `BookingManagementModule.tsx` se redujo de **3.077 a 1.402 líneas (-54.4%)**.
* **Zero Mocks**: Se preserva la interacción en tiempo real con Fastify, SQLite y Drizzle ORM (`/api/bookings`, `/ocean-booking/details`, `/ocean-booking/.../shipping-instructions`).
* **Testabilidad**: Las rutinas PDF ahora se ejecutan de manera aislada con Vitest en `tests/booking-pdf-utils.test.ts` (3/3 pruebas pasando).
* **Bundle Optimizado**: Chunks de Vite divididos eficientemente, reduciendo el bundle de la vista a 79.76 kB (18.02 kB gzip).
