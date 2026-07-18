import { useEffect, useRef, useState, useMemo } from "react";
import type L from "leaflet";
import { LogisticsOverlay } from "./LogisticsOverlay";

import { useNominatimGeocoding } from "./hooks/useNominatimGeocoding";

/**
 * Advanced Shipping Map component with Marker Clustering support.
 * Consolidated from Shipment-Dashboard into @torre/ui.
 */
export function ShippingMap({
  shipments = [],
  searchQuery = "",
}: {
  shipments?: any[];
  searchQuery?: string;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  const { coordinates: searchedCoords } = useNominatimGeocoding(searchQuery);

  useEffect(() => {
    if (searchedCoords && mapRef.current) {
      mapRef.current.flyTo([searchedCoords.lat, searchedCoords.lon], 8, {
        animate: true,
        duration: 1.5,
      });
    }
  }, [searchedCoords]);

  // Ports of Loading (POL) and Warehouses coordinates
  const locations = useMemo(
    () => [
      { name: "Shanghai Port (POL)", coords: [31.2304, 121.4737], type: "pol" },
      { name: "Valencia Port (POL)", coords: [39.4699, -0.3763], type: "pol" },
      {
        name: "Van Moer Warehouse (Antwerp)",
        coords: [51.2194, 4.4025],
        type: "warehouse",
      },
      {
        name: "Hamilton Warehouse",
        coords: [48.1351, 11.582],
        type: "warehouse",
      },
      {
        name: "Spanish Warehouse (TLSA)",
        coords: [40.4168, -3.7037],
        type: "warehouse",
      },
    ],
    [],
  );

  // Shipping routes coordinates for polyline drawing
  const routes = useMemo(
    () => [
      {
        from: "Shanghai Port (POL)",
        to: "Van Moer Warehouse (Antwerp)",
        path: [
          [31.2304, 121.4737],
          [10.0, 105.0],
          [5.0, 95.0],
          [12.0, 43.0],
          [35.0, 15.0],
          [51.2194, 4.4025],
        ],
      },
      {
        from: "Valencia Port (POL)",
        to: "Hamilton Warehouse",
        path: [
          [39.4699, -0.3763],
          [43.0, 5.0],
          [48.1351, 11.582],
        ],
      },
      {
        from: "Valencia Port (POL)",
        to: "Spanish Warehouse (TLSA)",
        path: [
          [39.4699, -0.3763],
          [40.4168, -3.7037],
        ],
      },
    ],
    [],
  );

  useEffect(() => {
    // Dynamic import to prevent SSR compilation failure on leaflet
    let isMounted = true;
    let animationFrameId: number;

    const initMap = async () => {
      try {
        const L = await import("leaflet");
        // Expose L globally so leaflet.markercluster can augment it
        if (typeof window !== "undefined") {
          (window as any).L = L;
        }

        // Import leaflet styles dynamically
        // @ts-ignore
        await import("leaflet/dist/leaflet.css");

        if (!isMounted || !mapContainerRef.current || mapRef.current) return;

        // Fix default Leaflet icon assets urls in bundler
        delete (
          L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown }
        )._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        // Initialize Leaflet Map
        const map = L.map(mapContainerRef.current).setView([25.0, 45.0], 2);
        mapRef.current = map;

        // Load marker cluster plugin and its CSS
        // Note: In a workspace setting, ensure 'leaflet.markercluster' is in dependencies
        await import("leaflet.markercluster");
        // @ts-ignore
        await import("leaflet.markercluster/dist/MarkerCluster.css");
        // @ts-ignore
        await import("leaflet.markercluster/dist/MarkerCluster.Default.css");

        // Apply dark-themed beautiful tile layout
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 20,
          },
        ).addTo(map);

        // Create a Marker Cluster Group for better UX
        const clusterGroup = (L as any).markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          zoomToBoundsOnClick: true,
          polygonOptions: {
            fillColor: "rgba(59, 130, 246, 0.2)",
            color: "rgba(59, 130, 246, 0.4)",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.5,
          },
        });

        // Plot Markers
        locations.forEach((loc) => {
          const customColor = loc.type === "pol" ? "#3b82f6" : "#10b981";
          const htmlIcon = L.divIcon({
            html: `<div style="background-color: ${customColor}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${customColor}"></div>`,
            className: "custom-leaflet-icon",
            iconSize: [14, 14],
          });

          const marker = L.marker(loc.coords as L.LatLngExpression, {
            icon: htmlIcon,
          }).bindPopup(
            `<b>${loc.name}</b><br/>Type: ${loc.type === "pol" ? "Port of Loading" : "External Warehouse"}`,
          );

          clusterGroup.addLayer(marker);
        });

        // Add cluster group to map
        map.addLayer(clusterGroup);

        // Draw dashed route lanes and place shipping vessel simulations
        const activeVessels: {
          marker: L.Marker;
          path: number[][];
          progress: number;
          speed: number;
          route: (typeof routes)[0];
        }[] = [];

        routes.forEach((route) => {
          L.polyline(route.path as L.LatLngExpression[], {
            color: "#3b82f6",
            weight: 2,
            dashArray: "5, 10",
            opacity: 0.5,
          }).addTo(map);

          // Ship simulation marker along the lane path (only if no real shipments available)
          if (shipments.length === 0) {
            const shipIcon = L.divIcon({
              html: `<div style="font-size: 1.5rem; text-shadow: 0 0 10px #3b82f6; cursor: pointer;">🚢</div>`,
              className: "custom-ship-icon",
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });

            const marker = L.marker(route.path[0] as L.LatLngExpression, {
              icon: shipIcon,
            })
              .bindPopup(
                `<b>Vessel Transit</b><br/>En-route: ${route.from} ➔ ${route.to}<br/>Speed: 0.0 kts<br/>Heading: 000°`,
              )
              .addTo(map);

            activeVessels.push({
              marker,
              path: route.path,
              progress: 0,
              speed: 0.001 + Math.random() * 0.001,
              route,
            });
          }
        });

        // Plot real live shipments if available
        if (shipments.length > 0) {
          shipments.forEach((shipment) => {
            if (
              shipment.vesselLatitude != null &&
              shipment.vesselLongitude != null
            ) {
              const shipIcon = L.divIcon({
                html: `<div style="font-size: 1.5rem; text-shadow: 0 0 12px #10b981; cursor: pointer;">🚢</div>`,
                className: "custom-ship-icon",
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              });

              // Mock some speed/heading if not fully available
              const mockSpeed = (15 + Math.random() * 5).toFixed(1);

              const popupContent = `
                <div style="font-family: sans-serif; font-size: 12px;">
                  <b style="font-size: 14px; color: #1e293b;">Live Vessel (${shipment.carrier})</b><br/>
                  <span style="color: #64748b;">Ref: ${shipment.bookingReference}</span><br/><br/>
                  <b>Route:</b> ${shipment.pol} ➔ ${shipment.pod}<br/>
                  <b>Status:</b> <span style="color: #3b82f6;">${shipment.status.replace(/_/g, " ")}</span><br/>
                  <b>Speed:</b> ${mockSpeed} kts<br/>
                  <b>Updated:</b> ${shipment.coordinatesLastUpdated ? new Date(shipment.coordinatesLastUpdated).toLocaleString() : "Just now"}
                </div>
              `;

              L.marker(
                [
                  shipment.vesselLatitude,
                  shipment.vesselLongitude,
                ] as L.LatLngExpression,
                { icon: shipIcon },
              )
                .bindPopup(popupContent)
                .addTo(map);
            }
          });
        }

        let lastTime = performance.now();
        const animate = (time: number) => {
          if (!isMounted) return;
          const delta = time - lastTime;
          lastTime = time;

          activeVessels.forEach((vessel) => {
            vessel.progress += vessel.speed * (delta / 16);
            if (vessel.progress >= vessel.path.length - 1) {
              vessel.progress = 0; // Loop the simulation
            }

            const index = Math.floor(vessel.progress);
            const nextIndex = index + 1;
            const fraction = vessel.progress - index;

            const startNode = vessel.path[index];
            const endNode = vessel.path[nextIndex];

            const lat = startNode[0] + (endNode[0] - startNode[0]) * fraction;
            const lng = startNode[1] + (endNode[1] - startNode[1]) * fraction;

            vessel.marker.setLatLng([lat, lng] as L.LatLngExpression);

            // Calculate heading
            const latDiff = endNode[0] - startNode[0];
            const lngDiff = endNode[1] - startNode[1];
            let heading = Math.atan2(lngDiff, latDiff) * (180 / Math.PI);
            if (heading < 0) heading += 360;
            const headingStr = Math.round(heading).toString().padStart(3, "0");

            // Mock speed telemetry (base 15-20 knots + small fluctuation)
            const baseSpeed = 15 + vessel.speed * 1000;
            const mockSpeed = (baseSpeed + Math.sin(time / 1000) * 1.5).toFixed(
              1,
            );

            const popupContent = `<b>Vessel Transit</b><br/>En-route: ${vessel.route.from} ➔ ${vessel.route.to}<br/>Speed: ${mockSpeed} kts<br/>Heading: ${headingStr}°`;
            vessel.marker.setPopupContent(popupContent);
          });

          animationFrameId = requestAnimationFrame(animate);
        };
        animationFrameId = requestAnimationFrame(animate);

        setLeafletLoaded(true);
      } catch (err) {
        console.error("Failed to load Leaflet:", err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [locations, routes, shipments]);

  return (
    <div className="relative w-full h-[400px] rounded-2xl overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] bg-slate-900/40 backdrop-blur-xl group">
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent pointer-events-none z-10 rounded-2xl" />

      {!leafletLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-lg text-slate-400 z-20">
          <span className="flex items-center gap-3 font-medium tracking-wide">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            Initializing Tracking Map...
          </span>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full relative z-0" />
      <LogisticsOverlay />
    </div>
  );
}
