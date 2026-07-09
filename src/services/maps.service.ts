// Maps Adapter (Clean Architecture)
// Adapts external APIs (Google Maps, OpenStreetMap, Mapbox) for Geocoding and Routing

export const mapsService = {
  /**
   * Mock Geocoding implementation
   */
  async geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    console.log(`[MapsService] Geocoding address: ${address}`);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Return mock coordinates based on string length to simulate variety
    return {
      lat: 30.0 + address.length * 0.1,
      lng: 120.0 - address.length * 0.1,
    };
  },

  /**
   * Mock Routing implementation
   */
  async getRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): Promise<any> {
    console.log(
      `[MapsService] Calculating route from [${originLat}, ${originLng}] to [${destLat}, ${destLng}]`,
    );
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      distanceMiles: 450,
      estimatedTimeHours: 12,
      path: [
        { lat: originLat, lng: originLng },
        { lat: (originLat + destLat) / 2, lng: (originLng + destLng) / 2 },
        { lat: destLat, lng: destLng },
      ],
    };
  },
};
