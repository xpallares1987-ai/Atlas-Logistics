# Atlas Logistics API Reference

**Version:** 1.0.0  
**Base URL:** `http://localhost:3001` (dev) | `https://api.atlas-logistics.com` (prod)  
**Authentication:** JWT Bearer Token (required for most endpoints)  
**Rate Limit:** 5000 requests/15 minutes (1000 in CI/test environments)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Core Endpoints](#core-endpoints)
3. [Air Cargo Module](#air-cargo-module)
4. [Ocean Shipping Module](#ocean-shipping-module)
5. [Road Freight Module](#road-freight-module)
6. [Customs & Compliance Module](#customs--compliance-module)
7. [Financial & Treasury Module](#financial--treasury-module)
8. [Operations & Warehouse Module](#operations--warehouse-module)
9. [Error Handling](#error-handling)
10. [Webhooks & Events](#webhooks--events)

---

## Authentication

### Login
**POST** `/api/auth/login`

Register or authenticate a user.

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!@#"
  }'
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "role": "USER",
    "tenantId": "tenant_xyz789"
  },
  "expiresIn": 86400
}
```

### Register
**POST** `/api/auth/register`

Create a new user account.

```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!@#",
  "role": "USER"
}
```

### Verify Token
**GET** `/api/auth/me`

Verify current JWT token and get user info.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "id": "usr_abc123",
  "email": "user@example.com",
  "role": "USER",
  "tenantId": "tenant_xyz789",
  "authenticated": true
}
```

---

## Core Endpoints

### Health Check
**GET** `/api/health` or `/health`

No authentication required.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600000,
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected"
}
```

### Metrics (Prometheus)
**GET** `/metrics`

Prometheus-compatible metrics endpoint. No authentication required.

---

## Air Cargo Module

### Create AWB (Airway Bill)
**POST** `/api/air-cargo/awb`

Create a new air cargo shipment with IATA-compliant Airway Bill.

```json
{
  "shipmentRef": "AIR-2024-001",
  "origin": "MAD",
  "destination": "LAX",
  "shipper": {
    "name": "Acme Corp",
    "address": "Madrid, Spain",
    "email": "shipping@acme.com"
  },
  "consignee": {
    "name": "West Coast Distributors",
    "address": "Los Angeles, USA",
    "email": "receiving@westcoast.com"
  },
  "pieces": 10,
  "weight": 500,
  "volumetricWeight": 600,
  "chargeable": 600,
  "dangerous": false
}
```

**Response (201 Created):**
```json
{
  "id": "awb_xyz789",
  "mawbNumber": "005-1234567-8",
  "hawbNumber": "005-1234567-1",
  "status": "BOOKED",
  "chargeableWeight": 600,
  "charges": {
    "baseFare": 1200,
    "surcharges": 150,
    "total": 1350
  },
  "pdf": "https://api.atlas-logistics.com/api/air-cargo/awb/awb_xyz789/pdf"
}
```

### Get AWB
**GET** `/api/air-cargo/awb/:awbId`

Retrieve AWB details.

**Response:**
```json
{
  "id": "awb_xyz789",
  "mawbNumber": "005-1234567-8",
  "hawbNumber": "005-1234567-1",
  "status": "IN_TRANSIT",
  "createdAt": "2024-01-15T10:00:00Z",
  "estimatedDelivery": "2024-01-18T14:00:00Z"
}
```

---

## Ocean Shipping Module

### Create Ocean Booking
**POST** `/api/ocean-booking/bookings`

Create a new ocean freight booking.

```json
{
  "shipmentRef": "OCN-2024-001",
  "vesselName": "MSC GÜLSÜN",
  "voyage": "001W",
  "serviceType": "FCL",
  "origin": "DEHAM",
  "destination": "USLA",
  "commodity": "Electronics",
  "containers": [
    {
      "number": "MAEU123456",
      "type": "40HC",
      "weight": 28000
    }
  ],
  "shipper": {
    "name": "Exporter GmbH",
    "address": "Hamburg, Germany"
  },
  "consignee": {
    "name": "Importer Inc",
    "address": "Long Beach, USA"
  }
}
```

**Response:**
```json
{
  "id": "booking_abc123",
  "bookingRef": "BOOKING-20240115-001",
  "status": "CONFIRMED",
  "cutOffDate": "2024-01-18T18:00:00Z",
  "estimatedDeparture": "2024-01-20T00:00:00Z",
  "estimatedArrival": "2024-02-05T00:00:00Z",
  "totalCost": 2500,
  "billOfLading": "DRAFT"
}
```

### List Sailing Schedules
**GET** `/api/schedules?origin=DEHAM&destination=USLA&limit=20&page=1`

Search available sailing schedules.

**Query Parameters:**
- `origin` - Port code (LOCODE)
- `destination` - Port code (LOCODE)
- `limit` - Results per page (default: 20)
- `page` - Page number (default: 1)
- `serviceType` - FCL/LCL/BREAK-BULK (optional)

**Response:**
```json
{
  "data": [
    {
      "id": "schedule_001",
      "vesselName": "MSC GÜLSÜN",
      "voyage": "001W",
      "origin": "DEHAM",
      "destination": "USLA",
      "departure": "2024-01-20T00:00:00Z",
      "arrival": "2024-02-05T00:00:00Z",
      "capacity": "23756 TEU",
      "transitTime": "16 days",
      "rate": {
        "fcl20": 1200,
        "fcl40": 2000,
        "fcl40hc": 2400
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 127,
    "totalPages": 7
  }
}
```

### Create Bill of Lading (B/L)
**POST** `/api/dcsa/v3/bill-of-ladings`

Create official ocean transport document.

```json
{
  "bookingId": "booking_abc123",
  "shipperSignature": true,
  "consigneeNotified": true,
  "shippingMarks": ["FRAGILE", "HANDLE WITH CARE"],
  "packages": 100,
  "packageType": "CASE",
  "description": "Electronics Components"
}
```

**Response:**
```json
{
  "id": "bl_xyz789",
  "blNumber": "MSC210001234",
  "status": "RELEASED",
  "issueDate": "2024-01-20T10:00:00Z",
  "pdf": "https://api.atlas-logistics.com/api/dcsa/v3/bill-of-ladings/bl_xyz789/pdf"
}
```

---

## Road Freight Module

### Create Road Shipment
**POST** `/api/road-freight/shipments`

Create a road freight shipment (CMR).

```json
{
  "shipmentRef": "ROAD-2024-001",
  "shipper": {
    "name": "Shipper Corp",
    "address": "Madrid, Spain",
    "contact": "contact@shipper.es"
  },
  "consignee": {
    "name": "Receiver Ltd",
    "address": "Paris, France",
    "contact": "contact@receiver.fr"
  },
  "origin": "Madrid",
  "destination": "Paris",
  "commodity": "Machinery",
  "weight": 15000,
  "volume": 45,
  "pallets": 10,
  "distance": 1045,
  "serviceType": "FTL"
}
```

**Response:**
```json
{
  "id": "shipment_abc123",
  "cmrNumber": "CMR-20240115-001",
  "status": "PENDING_PICKUP",
  "driver": {
    "name": "John Doe",
    "phone": "+34 612 345 678",
    "license": "ES1234567"
  },
  "vehicle": {
    "registration": "MAD-1234-AB",
    "capacity": "24000 kg",
    "type": "SEMI-TRUCK"
  },
  "pickupDate": "2024-01-16T08:00:00Z",
  "deliveryDate": "2024-01-17T18:00:00Z"
}
```

---

## Customs & Compliance Module

### Create DUA (Customs Declaration)
**POST** `/api/customs/dua`

Create a DUA/SAD customs declaration for import/export.

```json
{
  "shipmentId": "shipment_abc123",
  "type": "IMPORT",
  "importerName": "Importer Inc",
  "exporterName": "Exporter Corp",
  "incoterm": "CIF",
  "totalAmount": 50000,
  "currency": "EUR",
  "items": [
    {
      "description": "Electronics Components",
      "hsCode": "847130",
      "quantity": 100,
      "unit": "UNIT",
      "unitPrice": 500,
      "totalPrice": 50000,
      "origin": "CN",
      "weightGross": 500,
      "weightNet": 450
    }
  ]
}
```

**Response:**
```json
{
  "id": "dua_xyz789",
  "duaNumber": "07000000001/2024",
  "status": "DRAFT",
  "taricCalculation": {
    "tariff": 2500,
    "vat": 10500,
    "total": 13000
  },
  "xml": "https://api.atlas-logistics.com/api/customs/dua/dua_xyz789/xml",
  "pdf": "https://api.atlas-logistics.com/api/customs/dua/dua_xyz789/pdf"
}
```

### Validate TARIC Codes
**POST** `/api/customs/taric-validate`

Validate HS codes and calculate tariffs.

```json
{
  "hsCode": "847130",
  "origin": "CN",
  "importCou": "ES",
  "quantity": 100
}
```

**Response:**
```json
{
  "hsCode": "847130",
  "description": "Electronic components",
  "duty": 0.05,
  "vat": 0.21,
  "antiDumping": 0.10,
  "totalRate": 0.36,
  "estimatedCost": 18000
}
```

---

## Financial & Treasury Module

### 3-Way Match Reconciliation
**POST** `/api/treasury/3-way-match`

Reconcile invoice, booking, and transport document.

```json
{
  "invoiceId": "inv_abc123",
  "bookingId": "booking_xyz789",
  "documentId": "awb_123456",
  "tolerance": 0.02
}
```

**Response:**
```json
{
  "status": "MATCHED",
  "variance": 0.015,
  "invoiceAmount": 2500,
  "bookingAmount": 2538,
  "documentAmount": 2500,
  "discrepancies": []
}
```

### Get Exchange Rates
**GET** `/api/treasury/rates?base=EUR&symbols=USD,GBP,CNY`

Get current FX rates.

**Response:**
```json
{
  "base": "EUR",
  "date": "2024-01-15",
  "rates": {
    "USD": 1.0850,
    "GBP": 0.8634,
    "CNY": 7.8264
  }
}
```

---

## Operations & Warehouse Module

### Create Warehouse Task
**POST** `/api/warehouse/tasks`

Create a warehouse operation task.

```json
{
  "taskType": "INBOUND",
  "shipmentId": "shipment_abc123",
  "warehouseId": "warehouse_001",
  "priority": "HIGH",
  "description": "Receive and store 10 pallets",
  "assignee": "operator_123"
}
```

**Response:**
```json
{
  "id": "task_abc123",
  "taskNumber": "TASK-20240115-001",
  "status": "ASSIGNED",
  "createdAt": "2024-01-15T10:00:00Z",
  "dueAt": "2024-01-15T16:00:00Z"
}
```

### Get Warehouse Dashboard
**GET** `/api/dashboard/warehouse`

Real-time warehouse metrics.

**Response:**
```json
{
  "occupancy": 0.75,
  "availableSpace": 250,
  "totalCapacity": 1000,
  "inboundTasks": 12,
  "outboundTasks": 8,
  "alerts": 2
}
```

---

## Error Handling

All errors follow standardized format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid email format",
  "correlationId": "corr_abc123xyz789",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Codes

| Code | Meaning | Cause |
|------|---------|-------|
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate or conflicting data |
| 422 | Unprocessable | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected error |

---

## Webhooks & Events

### Subscribe to Events
**WebSocket** `ws://localhost:3001/api/events`

Subscribe to real-time events.

```javascript
const ws = new WebSocket('ws://localhost:3001/api/events');

ws.addEventListener('message', (event) => {
  const eventData = JSON.parse(event.data);
  console.log('Received event:', eventData);
});
```

### Event Types

- `SHIPMENT_CREATED`
- `SHIPMENT_UPDATED`
- `SHIPMENT_DELIVERED`
- `BOOKING_CONFIRMED`
- `INVOICE_RECEIVED`
- `CUSTOMS_CLEARED`
- `ALERT_TRIGGERED`

---

## Rate Limiting

All endpoints are rate-limited to **5000 requests per 15 minutes**.

**Response Headers:**
```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1705315200
```

When limit exceeded (429):
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded"
}
```

---

## CORS Policy

Default allowed origins:
- `http://localhost:3000`
- `http://localhost:5173`
- `http://localhost:3100`
- `https://atlas-logistics.web.app`
- `https://atlas-logistics.firebaseapp.com`

Custom origins via `CORS_ORIGIN` environment variable (comma-separated).

---

## Pagination

List endpoints support pagination:

```
GET /api/shipments?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 127,
    "totalPages": 7,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Authentication Details

### JWT Token Structure

All JWT tokens include:
- `userId` - User ID
- `tenantId` - Tenant/Organization ID
- `role` - User role (USER, ADMIN, OPERATOR)
- `iat` - Issued at timestamp
- `exp` - Expiration timestamp (24 hours)

### Token Refresh

Currently tokens expire after 24 hours. Re-authenticate to get new token.

---

## End-to-End Encryption (E2EE)

For sensitive operations, enable E2EE with header:

```
X-Atlas-Encrypted-Payload: true
```

Request and response bodies will be encrypted using zero-knowledge envelope protocol from `@atlas/shared`.

---

**Last Updated:** 2024-01-15  
**Next Review:** 2024-02-15
