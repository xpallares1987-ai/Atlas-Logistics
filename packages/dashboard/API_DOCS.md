# API Reference: External Warehouses

This document provides technical specifications for the external warehouse API endpoints used by the Shipment-Dashboard.

## Base URL

`/api/external-warehouses`

## Endpoints

---

### 1. GET /stock

Retrieves unified stock data from `GetStock.xml`.

**Response (200 OK):**

```json
[
  {
    "Origin": "string",
    "Warehouse": "string",
    "Ext. Addr. Number": "string",
    "Product Code": "string",
    "Item Number": "string",
    "Description": "string",
    "Grammage": "string",
    "Diameter": 0,
    "Roll Width": 0.0,
    "Weight": 0.0,
    "Load Code": "string",
    "Customer Name": "string"
  }
]
```

---

### 2. GET /boarding

Retrieves filtered boarding list for the current year from `GetBoardingList.xml`.

**Response (200 OK):**

```json
[
  {
    "Origin": "string",
    "CustomerOrder": "string",
    "Warehouse": "string",
    "POL": "string",
    "Final Destination": "string",
    "Fecha Lim. Carga": "DD/MM/YYYY",
    "Delivery Date": "DD/MM/YYYY",
    "Forecast Arrival": "DD/MM/YYYY",
    "Bultos": "string",
    "Weight (Tons)": 0.0,
    "Ext. Addr. Number": "string"
  }
]
```

---

### 3. GET /receptions

Retrieves pending warehouse receptions from `GetPendingReceptionsList.xml`.

**Response (200 OK):**

```json
[
  {
    "Origin": "string",
    "Warehouse": "string",
    "Status": "string",
    "Load Code": "string",
    "Plate Number": "string",
    "Estimated Arrival at WH": "DD/MM/YYYY",
    "Ext. Addr. Number": "string",
    "Final Destination": "string",
    "Customer Order": "string",
    "Item Number": "string",
    "Reel Year": "string",
    "Paper Code": "string",
    "Product Description": "string",
    "Grammage (GM)": "string",
    "Diameter (CM)": "string",
    "Roll Width (CM)": "string",
    "Roll Length (CM)": "string",
    "Weight (Kgs)": 0
  }
]
```

## Common Error Response

All endpoints return a `500` status with the following structure if processing fails:

```json
{
  "error": "Error al procesar los datos de [endpoint_name]."
}
```
