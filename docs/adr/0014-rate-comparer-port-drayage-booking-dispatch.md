# 0014. Integración Integral de Cotización a Reserva con Drayage Portuario y Despacho Automatizado

- **Estado**: Aceptado
- **Fecha**: 2026-11-10
- **Contexto**: Atlas Logistics (`@atlas/rate-comparer`, `@atlas/ui`, Fastify Backend, SQLite/Drizzle)

## Contexto y Problema

1. **Desconexión entre Cotización Marítima y Acarreo Terrestre**:
   Los cotizadores de fletes tradicionalmente calculaban únicamente el tramo puerto a puerto (Port-to-Port), obligando a los transitarios y expedidores a calcular el acarreo de última milla (Port Drayage) de forma manual y aislada, sin trazabilidad unificada de costes ni emisiones de carbono.
2. **Requisitos de Integridad Referencial (`PRAGMA foreign_keys = ON;`)**:
   Toda reserva y orden de transporte debe persistirse en SQLite conectando entidades reales: puertos/terminales de origen, almacenes de destino en el Addresses Hub, navieras, empresas transportistas registradas (*hauliers*) y expediciones activas.
3. **Normativa de Sostenibilidad y Emisiones (ISO 14083 / GLEC Framework v3.0)**:
   Los clientes corporativos demandan la medición transparente y homologada de emisiones de CO₂ tanto Pozo-a-Rueda (*Well-to-Wheel*, WTW) como Combustión en Ruta (*Tank-to-Wheel*, TTW) combinando flete marítimo y acarreo terrestre.

## Decisión Arquitectónica

### 1. Extensión del Comparador de Tarifas (`@atlas/rate-comparer`)
- **Control Reactivo en Panel de Búsqueda**:
  - Toggle *"Añadir Drayage Portuario (Port-to-Door / Última Milla)"* en `RatesContent.tsx`.
  - Selector de almacenes interiores alimentado determinísticamente desde el **Addresses Hub** (`/api/addresses?type=WAREHOUSE`).
  - Cálculo instantáneo mediante `POST /api/drayage/quote` alimentado por enrutamiento OSRM y tarifas base + BAF terrestre + peajes Eurovignette.
- **Cotización Unificada Door-to-Door en `RateTable.tsx`**:
  - Suma del flete marítimo base, recargos navieros (BAF, THC, PSS) y el acarreo portuario en divisa activa (USD/EUR).
  - Distintivo *"Door-to-Door (Ocean + Drayage)"* por fila.
  - Sección expandible con desglose de costes terrestres, tiempos de giro (*turn-time*) y huella GLEC v3.0.
  - Visor cartográfico interactivo modal (`DrayageRouteModal.tsx`) con teselas CARTO Voyager (`CARTO_API_KEY`) y trazado OSRM.

### 2. Ciclo de Vida Transaccional y Materialización Automática (`booking-lifecycle.service.ts`)
- **Persistencia en SQLite**:
  - Al crearse la solicitud de reserva (`createBookingRequest`), el payload `drayageQuote` se guarda en `bookings.cargoDetails`.
  - Al confirmarse la reserva (`confirmBookingToShipment` o endpoint `POST /api/quotes/:id/accept-and-book`):
    1. Se crea la expedición en `shipments` con el contenedor, buque, viaje y precinto asignados.
    2. Se resuelve la terminal portuaria correspondiente al UN/LOCODE de descarga (ej. `addr_term_best_bcn` para `ESBCN` o `addr_term_apm_vlc` para `ESVLC`).
    3. Se resuelve la dirección del transportista asignado (*Haulier*) y la del almacén consignatario.
    4. Se inserta atómicamente la orden en `drayageTransportOrders` (`drayage_transport_orders`) con estado `DISPATCHED`, código correlativo `DRY-YYYYMM-XXXX`, pin de recogida de 4 dígitos, digest criptográfico QR SHA-256 y ventana horaria de carga.
    5. Se emite el evento de auditoría `DRAYAGE_DISPATCHED` en `shipmentEventLogs`.
    6. Se retorna el identificador y detalle de la orden para acceso directo con 1 clic hacia `/drayage`.

### 3. Cero Mocks y Cobertura Automatizada (`tests/rate-comparer-drayage-booking.test.ts`)
- Se implementó suite de pruebas de integración completa validando:
  - Creación de reserva PENDING con `drayageQuote`.
  - Confirmación y materialización en `drayageTransportOrders` con verificación de claves foráneas.
  - Comprobación de orden visible en `/api/drayage/orders?shipmentId=...`.
  - Flujo de 1 clic `accept-and-book` de cotización a expedición y despacho terrestre.

## Consecuencias

- **Positivas**:
  - Flujo unificado y sin fricciones desde la comparación de tarifas hasta el despacho de camiones portuarios en el sistema.
  - Conformidad estricta con ISO 14083 y GLEC Framework v3.0 para informes ESG de clientes.
  - Total cumplimiento de guardarraíles de base de datos (`PRAGMA foreign_keys = ON;`) y cero datos mock en la interfaz.
- **Mitigaciones**:
  - En caso de indisponibilidad temporal de OSRM externo, el motor de drayage conmuta automáticamente a la fórmula Haversine calibrada con factor de circuidad terrestre (1,25) garantizando cotización ininterrumpida.
