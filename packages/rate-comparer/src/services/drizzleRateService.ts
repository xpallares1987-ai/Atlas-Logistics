export interface Rate {
  id: string;
  carrier: string | null;
  containerType: string;
  baseOceanFreight: number;
  baf: number;
  pss: number;
  thc: number;
  serviceLine: string;
  transitTime: number;
  validTo: string;
}

export const drizzleRateService = {
  async fetchRates(
    origin: string,
    destination: string,
    containerType: string,
  ): Promise<Rate[]> {
    try {
      const params = new URLSearchParams();
      if (origin) params.append("origin", origin);
      if (destination) params.append("destination", destination);
      if (containerType) params.append("containerType", containerType);

      const response = await fetch(`/api/rates?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch rates from backend");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching rates via Drizzle service:", error);
      throw error;
    }
  },

  async fetchAnalytics(origin: string, destination: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (origin) params.append("origin", origin);
      if (destination) params.append("destination", destination);

      const response = await fetch(`/api/rates/analytics?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch analytics from backend");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching analytics via Drizzle service:", error);
      throw error;
    }
  },

  async saveQuote(
    rateData: any,
    customerId: string = "00000000-0000-0000-0000-000000000000",
  ): Promise<any> {
    try {
      // Create payload matching CreateQuoteSchema
      const payload = {
        quoteNumber: `QT-${Date.now()}`,
        customerId,
        equipment: rateData.containerType || "40HC",
        buyRateTotal: rateData.rate || 0,
        sellMargin: 10, // 10% margin for demo
        sellRateTotal: (rateData.rate || 0) * 1.1,
        status: "DRAFT",
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // valid for 30 days
      };

      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save quote to database");
      }
      return await response.json();
    } catch (error) {
      console.error("Error saving quote via Drizzle service:", error);
      throw error;
    }
  },

  async saveBooking(
    bookingData: any,
    customerId: string = "00000000-0000-0000-0000-000000000000",
  ): Promise<any> {
    try {
      const payload = {
        bookingReference: `BKG-${Date.now()}`,
        customerId,
        carrier: bookingData.carrierName || "Unknown",
        origin: bookingData.pol,
        destination: bookingData.pod,
        equipment: bookingData.containerType || "40HC",
        commodity: bookingData.commodity || "General Cargo",
        weight: bookingData.weight || 0,
        poNumber: bookingData.poNumber || "",
        status: "DRAFT",
        totalCost: bookingData.totalCost || 0,
      };

      // Depending on the backend this could be /api/bookings
      const response = await fetch("/api/operations/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save booking to database");
      }
      return await response.json();
    } catch (error) {
      console.error("Error saving booking via Drizzle service:", error);
      throw error;
    }
  },
};
