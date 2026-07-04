import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shipment } from '../types';
import { BASE_PATH } from '../config';

export class MapService {
  private static instance: L.Map | null = null;
  private static markers: (L.Marker | L.CircleMarker)[] = [];
  private static lines: L.Polyline[] = [];
  private static animationIntervals: ReturnType<typeof setInterval>[] = [];

  static init(containerId: string) {
    this.instance = L.map(containerId, { zoomControl: false }).setView([20, 0], 2);
    
    const standardMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    });
    
    const aerialMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });
    
    const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    });

    const maritimeOverlay = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      attribution: 'Map data: &copy; OpenSeaMap contributors'
    });

    const baseMaps = {
      "Standard (OSM)": standardMap,
      "Aerial / Satellite": aerialMap,
      "Dark Mode": darkMap
    };

    const overlayMaps = {
      "Maritime Marks": maritimeOverlay
    };

    standardMap.addTo(this.instance);
    L.control.layers(baseMaps, overlayMaps, { position: 'bottomleft' }).addTo(this.instance);
    L.control.zoom({ position: 'bottomright' }).addTo(this.instance);
  }

  // Geodesic Bezier Curve generator
  static getBezierPath(
    start: L.LatLngExpression,
    end: L.LatLngExpression,
    pointsCount = 50,
  ): L.LatLng[] {
    const startLatLng = Array.isArray(start)
      ? L.latLng(start[0], start[1])
      : L.latLng(start as L.LatLngLiteral | L.LatLng);
    const endLatLng = Array.isArray(end) ? L.latLng(end[0], end[1]) : L.latLng(end as L.LatLngLiteral | L.LatLng);

    // Midpoint
    const midLng = (startLatLng.lng + endLatLng.lng) / 2;
    const midLat = (startLatLng.lat + endLatLng.lat) / 2;

    // Offset proportional to length to form a geodesic curvature
    const dLng = endLatLng.lng - startLatLng.lng;
    const dLat = endLatLng.lat - startLatLng.lat;

    const offsetLat = -dLng * 0.15;
    const offsetLng = dLat * 0.15;

    const controlPoint = L.latLng(midLat + offsetLat, midLng + offsetLng);

    const path: L.LatLng[] = [];
    for (let i = 0; i <= pointsCount; i++) {
      const t = i / pointsCount;
      const lat =
        (1 - t) * (1 - t) * startLatLng.lat +
        2 * (1 - t) * t * controlPoint.lat +
        t * t * endLatLng.lat;
      const lng =
        (1 - t) * (1 - t) * startLatLng.lng +
        2 * (1 - t) * t * controlPoint.lng +
        t * t * endLatLng.lng;
      path.push(L.latLng(lat, lng));
    }
    return path;
  }

  static renderShipments(shipments: Shipment[]) {
    if (!this.instance) return;
    this.clearMap();
    const bounds = L.latLngBounds([]);

    shipments.forEach((s) => {
      if (!this.instance) return;

      const iconUrl =
        s.mode === 'air'
          ? `${BASE_PATH}/assets/icons/plane.svg`
          : s.mode === 'sea'
            ? `${BASE_PATH}/assets/icons/ship.svg`
            : `${BASE_PATH}/assets/icons/truck.svg`;

      const customIcon = L.icon({
        iconUrl,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
        className: `map-icon-${s.mode} animated-vessel-map-icon`,
      });

      // 1. Origin anchor dot
      const origin = L.circleMarker(s.originCoords, {
        radius: 5,
        color: '#64748b',
        fillColor: '#64748b',
        fillOpacity: 0.8,
      }).addTo(this.instance);

      // 2. Destination anchor dot
      const destination = L.circleMarker(s.destCoords, {
        radius: 5,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.8,
      }).addTo(this.instance);

      // 3. Compute curved path coordinates
      const bezierCoords = this.getBezierPath(s.originCoords, s.destCoords);

      // 4. Draw curved polyline trade lane
      const pathColor = s.mode === 'air' ? '#ec4899' : s.mode === 'sea' ? '#3b82f6' : '#10b981';
      const isUrgent = s.status === 'customs' || s.status === 'delayed';

      const line = L.polyline(bezierCoords, {
        color: isUrgent ? '#ef4444' : pathColor,
        weight: isUrgent ? 3 : 2,
        dashArray: isUrgent ? '4, 6' : '5, 8',
        opacity: 0.75,
      }).addTo(this.instance);

      // 5. Create moving animated marker
      const movingMarker = L.marker(s.originCoords, { icon: customIcon })
        .addTo(this.instance)
        .bindPopup(
          `<b>Ref: ${s.reference}</b><br>
           Ruta: ${s.origin} ➔ ${s.destination}<br>
           Modo: ${s.mode.toUpperCase()}<br>
           Status: <span class="origin-badge ${s.status === 'delivered' ? 'fr' : 'es'}">${s.status.toUpperCase()}</span>`,
        );

      // 6. Smooth loop animation interval along bezier path
      let step = 0;
      const intervalId = setInterval(() => {
        if (!this.instance || !movingMarker) return;
        step = (step + 1) % bezierCoords.length;
        movingMarker.setLatLng(bezierCoords[step]);
      }, 120);

      this.animationIntervals.push(intervalId);
      this.markers.push(origin, destination, movingMarker);
      this.lines.push(line);

      bounds.extend(s.originCoords);
      bounds.extend(s.destCoords);
    });

    if (shipments.length > 0) {
      this.instance.fitBounds(bounds, { padding: [80, 80] });
    }
  }

  private static clearMap() {
    if (!this.instance) return;

    // Clear animation interval loops
    this.animationIntervals.forEach(clearInterval);
    this.animationIntervals = [];

    // Remove markers & lines
    this.markers.forEach((m) => this.instance?.removeLayer(m));
    this.lines.forEach((l) => this.instance?.removeLayer(l));

    this.markers = [];
    this.lines = [];
  }
}
