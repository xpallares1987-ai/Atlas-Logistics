const API_BASE_URL = "http://localhost:3000/api";

export class WmsService {
  public async getWarehouses() {
    const res = await fetch(`${API_BASE_URL}/wms/warehouses`);
    if (!res.ok) throw new Error("Failed to fetch warehouses");
    return res.json();
  }

  public async createWarehouse(data: any) {
    const res = await fetch(`${API_BASE_URL}/wms/warehouses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create warehouse");
    return res.json();
  }

  public async getStock(warehouseId?: number, shipmentId?: number) {
    let url = `${API_BASE_URL}/wms/stock?`;
    if (warehouseId) url += `warehouse_id=${warehouseId}&`;
    if (shipmentId) url += `shipment_id=${shipmentId}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch stock");
    return res.json();
  }

  public async receiveStock(data: any) {
    const res = await fetch(`${API_BASE_URL}/wms/movements/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to receive stock");
    return res.json();
  }

  public async dispatchStock(data: any) {
    const res = await fetch(`${API_BASE_URL}/wms/movements/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to dispatch stock");
    return res.json();
  }
}

export const wmsService = new WmsService();
