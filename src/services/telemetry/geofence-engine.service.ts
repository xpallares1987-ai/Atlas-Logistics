export interface Coordinates {
  lat: number;
  lng: number;
}

export class GeofenceEngineService {
  /**
   * Calculates great-circle distance between two points on the globe using Haversine formula (in meters)
   */
  static calculateDistanceMeters(
    point1: Coordinates,
    point2: Coordinates,
  ): number {
    const EARTH_RADIUS_METERS = 6371000;
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) *
        Math.cos(this.toRadians(point2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
  }

  /**
   * Checks if a point is within a circular geofence
   */
  static isInsideCircularGeofence(
    point: Coordinates,
    center: Coordinates,
    radiusMeters: number,
  ): boolean {
    const distance = this.calculateDistanceMeters(point, center);
    return distance <= radiusMeters;
  }

  /**
   * Checks if a point is inside a polygon using the Ray-Casting algorithm
   */
  static isInsidePolygon(point: Coordinates, polygon: Coordinates[]): boolean {
    if (!polygon || polygon.length < 3) return false;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat;
      const yi = polygon[i].lng;
      const xj = polygon[j].lat;
      const yj = polygon[j].lng;

      const intersect =
        yi > point.lng !== yj > point.lng &&
        point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Evaluates whether a location triggers a geofence (Circle or Polygon)
   */
  static evaluatePointAgainstGeofence(
    point: Coordinates,
    geofence: {
      centerLat: number;
      centerLng: number;
      radiusMeters: number;
      polygonCoordinatesJson?: string | null;
    },
  ): boolean {
    if (geofence.polygonCoordinatesJson) {
      try {
        const polyCoords: [number, number][] = JSON.parse(
          geofence.polygonCoordinatesJson,
        );
        const polygon: Coordinates[] = polyCoords.map(([lat, lng]) => ({
          lat,
          lng,
        }));
        return this.isInsidePolygon(point, polygon);
      } catch {
        // Fallback to circular evaluation if JSON parse fails
      }
    }

    return this.isInsideCircularGeofence(
      point,
      { lat: geofence.centerLat, lng: geofence.centerLng },
      geofence.radiusMeters,
    );
  }

  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
