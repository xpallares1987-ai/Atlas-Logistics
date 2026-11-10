import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Clock, ShieldCheck } from "lucide-react";

export interface RoutePoint {
  name: string;
  lat: number;
  lon: number;
  city?: string;
  unLocode?: string;
  isTerminal?: boolean;
}

export interface DrayageRouteMapProps {
  origin: RoutePoint;
  destination: RoutePoint;
  distanceKm?: number;
  className?: string;
}

export const DrayageRouteMap: React.FC<DrayageRouteMapProps> = ({
  origin,
  destination,
  distanceKm,
  className = "h-80 w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (
      isNaN(origin.lat) ||
      isNaN(origin.lon) ||
      isNaN(destination.lat) ||
      isNaN(destination.lon)
    ) {
      return;
    }

    // Initialize or re-center Leaflet map
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([origin.lat, origin.lon], 10);

      // CARTO Voyager tile layer with API Key and OSM fallback
      const cartoApiKey =
        (typeof import.meta !== "undefined" &&
          (import.meta as any).env?.VITE_CARTO_API_KEY) ||
        (typeof process !== "undefined" && process.env?.CARTO_API_KEY) ||
        "";

      const tileUrl = cartoApiKey
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${cartoApiKey}`
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: "abcd",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      });

      tileLayer.on("tileerror", () => {
        tileLayer.setUrl("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
      });

      tileLayer.addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing layers other than tile layer
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Custom Origin Marker (Port Terminal)
    const originIcon = L.divIcon({
      className: "custom-drayage-marker",
      html: `
        <div style="
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #06b6d4);
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="5" r="3"></circle>
            <line x1="12" y1="22" x2="12" y2="8"></line>
            <path d="M5 12H2a10 10 0 0 0 20 0h-3"></path>
          </svg>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    // Custom Destination Marker (Consignee Warehouse)
    const destIcon = L.divIcon({
      className: "custom-drayage-marker",
      html: `
        <div style="
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const originMarker = L.marker([origin.lat, origin.lon], {
      icon: originIcon,
    }).addTo(map);
    originMarker.bindPopup(`
      <div style="font-family: sans-serif; padding: 4px;">
        <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #4f46e5; letter-spacing: 0.05em;">Port Terminal / Origin</span>
        <h4 style="margin: 2px 0 4px 0; font-size: 13px; font-weight: 700; color: #0f172a;">${origin.name}</h4>
        <p style="margin: 0; font-size: 11px; color: #64748b;">${origin.city || ""} ${origin.unLocode ? `(${origin.unLocode})` : ""}</p>
      </div>
    `);

    const destMarker = L.marker([destination.lat, destination.lon], {
      icon: destIcon,
    }).addTo(map);
    destMarker.bindPopup(`
      <div style="font-family: sans-serif; padding: 4px;">
        <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #059669; letter-spacing: 0.05em;">Delivery Facility / Consignee</span>
        <h4 style="margin: 2px 0 4px 0; font-size: 13px; font-weight: 700; color: #0f172a;">${destination.name}</h4>
        <p style="margin: 0; font-size: 11px; color: #64748b;">${destination.city || ""} ${destination.unLocode ? `(${destination.unLocode})` : ""}</p>
      </div>
    `);

    // Route Polyline (Highway road style with dashed accent)
    const latlngs: [number, number][] = [
      [origin.lat, origin.lon],
      [destination.lat, destination.lon],
    ];

    // Background road casing
    L.polyline(latlngs, {
      color: "#312e81",
      weight: 6,
      opacity: 0.4,
    }).addTo(map);

    // Foreground highway trajectory
    L.polyline(latlngs, {
      color: "#4f46e5",
      weight: 4,
      dashArray: "8, 8",
      opacity: 0.9,
    }).addTo(map);

    // Fit map bounds to view both points
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [origin, destination]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const estDrivingHours = distanceKm
    ? Math.round((distanceKm / 65) * 60)
    : null;

  return (
    <div className={className}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Highway Telemetry HUD */}
      {distanceKm !== undefined && (
        <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-4 text-xs text-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Navigation size={15} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Road Distance
              </div>
              <div className="font-extrabold text-sm text-slate-100">
                {distanceKm.toFixed(1)} km
              </div>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-slate-800" />

          {estDrivingHours !== null && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Clock size={15} />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Est. Turn-Time
                </div>
                <div className="font-extrabold text-sm text-slate-100">
                  {estDrivingHours > 60
                    ? `${Math.floor(estDrivingHours / 60)}h ${estDrivingHours % 60}m`
                    : `${estDrivingHours} min`}
                </div>
              </div>
            </div>
          )}

          <div className="w-[1px] h-6 bg-slate-800" />

          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
            <ShieldCheck size={14} />
            <span>GLEC v3.0 Verified</span>
          </div>
        </div>
      )}
    </div>
  );
};
