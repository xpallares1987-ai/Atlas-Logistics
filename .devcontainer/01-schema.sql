-- ==============================================================
-- Atlas Logistics ERP — Schema inicial de la BD de desarrollo
-- Se ejecuta automáticamente al inicializar el devcontainer,
-- o manualmente con: pnpm run db:reset
-- ==============================================================

-- Enums de estado de envíos
CREATE TYPE shipment_status AS ENUM (
  'DRAFT',
  'CONFIRMED',
  'DOCUMENTATION',
  'ON_BOARD',
  'BOOKED',
  'IN_TRANSIT',
  'ARRIVED',
  'CUSTOMS_CLEARED',
  'DELIVERED',
  'CANCELLED'
);

-- Enums de estado de cotizaciones
CREATE TYPE quote_status AS ENUM (
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED'
);

-- Enums de estado de facturas
CREATE TYPE invoice_status AS ENUM (
  'Paid',
  'Pending',
  'Overdue'
);

-- Enums de tipo de factura (AR = Accounts Receivable, AP = Accounts Payable)
CREATE TYPE invoice_type AS ENUM (
  'AR',
  'AP'
);

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL UNIQUE,
  role        VARCHAR(50)  NOT NULL DEFAULT 'USER',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Tabla de Envíos (Shipments)
CREATE TABLE IF NOT EXISTS shipments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number VARCHAR(100) NOT NULL UNIQUE,
  customer         VARCHAR(255) NOT NULL DEFAULT 'Unknown',
  origin           TEXT NOT NULL,
  destination      TEXT NOT NULL,
  equipment        VARCHAR(100) NOT NULL DEFAULT '1x 20DC',
  vessel           VARCHAR(255),
  voyage           VARCHAR(100),
  status           shipment_status NOT NULL DEFAULT 'DRAFT',
  user_id          UUID REFERENCES users(id),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Tabla de Tarifas (Rates — tarifas maestras de navieras)
CREATE TABLE IF NOT EXISTS rates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier             VARCHAR(100) NOT NULL,
  service_line        VARCHAR(100) NOT NULL,
  origin              TEXT NOT NULL,
  destination         TEXT NOT NULL,
  transit_time        INTEGER NOT NULL,
  valid_to            DATE NOT NULL,
  base_ocean_freight  REAL NOT NULL,
  baf                 REAL NOT NULL,
  pss                 REAL NOT NULL,
  thc                 REAL NOT NULL,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. Tabla de Cotizaciones (Quotes)
CREATE TABLE IF NOT EXISTS quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number    VARCHAR(100) NOT NULL UNIQUE,
  customer        VARCHAR(255) NOT NULL,
  origin          TEXT NOT NULL,
  destination     TEXT NOT NULL,
  equipment       VARCHAR(100) NOT NULL,
  buy_rate_total  REAL NOT NULL,
  sell_margin     REAL NOT NULL,
  sell_rate_total REAL NOT NULL,
  status          quote_status NOT NULL DEFAULT 'DRAFT',
  valid_to        DATE NOT NULL,
  user_id         UUID REFERENCES users(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. Tabla de Facturas (Invoices)
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  VARCHAR(100) NOT NULL UNIQUE,
  type            invoice_type NOT NULL,
  party           VARCHAR(255) NOT NULL,
  amount          REAL NOT NULL,
  currency        VARCHAR(10) NOT NULL DEFAULT 'USD',
  status          invoice_status NOT NULL DEFAULT 'Pending',
  due_date        DATE NOT NULL,
  shipment_id     UUID REFERENCES shipments(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_shipments_status   ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_customer ON shipments(customer);
CREATE INDEX IF NOT EXISTS idx_quotes_customer    ON quotes(customer);
CREATE INDEX IF NOT EXISTS idx_quotes_status      ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_type      ON invoices(type);
