import { useEffect, useRef, useState } from 'react';
import type L from 'leaflet';
import { LogisticsOverlay } from './LogisticsOverlay';

/**
 * Advanced Shipping Map component with Marker Clustering support.
 * Consolidated from Shipment-Dashboard into @torre/ui.
 */
export function ShippingMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Ports of Loading (POL) and Warehouses coordinates
  const locations = [
    { name: 'Shanghai Port (POL)', coords: [31.2304, 121.4737], type: 'pol' },
    { name: 'Valencia Port (POL)', coords: [39.4699, -0.3763], type: 'pol' },
    { name: 'Van Moer Warehouse (Antwerp)', coords: [51.2194, 4.4025], type: 'warehouse' },
    { name: 'Hamilton Warehouse (Vogt)', coords: [48.1351, 11.5820], type: 'warehouse' },
    { name: 'Spanish Warehouse (TLSA)', coords: [40.4168, -3.7037], type: 'warehouse' },
  ];

  // Shipping routes coordinates for polyline drawing
  const routes = [
    { from: 'Shanghai Port (POL)', to: 'Van Moer Warehouse (Antwerp)', path: [[31.2304, 121.4737], [10.0, 105.0], [5.0, 95.0], [12.0, 43.0], [35.0, 15.0], [51.2194, 4.4025]] },
    { from: 'Valencia Port (POL)', to: 'Hamilton Warehouse (Vogt)', path: [[39.4699, -0.3763], [43.0, 5.0], [48.1351, 11.5820]] },
    { from: 'Valencia Port (POL)', to: 'Spanish Warehouse (TLSA)', path: [[39.4699, -0.3763], [40.4168, -3.7037]] },
  ];

  useEffect(() => {
    // Dynamic import to prevent SSR compilation failure on leaflet
    let isMounted = true;
    
    const initMap = async () => {
      try {
        const L = await import('leaflet');
        // Import leaflet styles dynamically
        await import('leaflet/dist/leaflet.css');

        if (!isMounted || !mapContainerRef.current || mapRef.current) return;

        // Fix default Leaflet icon assets urls in bundler
        delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Initialize Leaflet Map
        const map = L.map(mapContainerRef.current).setView([25.0, 45.0], 2);
        mapRef.current = map;

        // Load marker cluster plugin and its CSS
        // Note: In a workspace setting, ensure 'leaflet.markercluster' is in dependencies
        await import('leaflet.markercluster');
        // @ts-ignore
        await import('leaflet.markercluster/dist/MarkerCluster.css');
        // @ts-ignore
        await import('leaflet.markercluster/dist/MarkerCluster.Default.css');

        // Apply dark-themed beautiful tile layout
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20,
        }).addTo(map);

        // Create a Marker Cluster Group for better UX
        // @ts-ignore - markerClusterGroup is added by the plugin
        const clusterGroup = L.markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          zoomToBoundsOnClick: true,
          polygonOptions: {
            fillColor: 'rgba(59, 130, 246, 0.2)',
            color: 'rgba(59, 130, 246, 0.4)',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.5
          }
        });

        // Plot Markers
        locations.forEach((loc) => {
          const customColor = loc.type === 'pol' ? '#3b82f6' : '#10b981';
          const htmlIcon = L.divIcon({
            html: `<div style="background-color: ${customColor}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${customColor}"></div>`,
            className: 'custom-leaflet-icon',
            iconSize: [14, 14],
          });

          const marker = L.marker(loc.coords as L.LatLngExpression, { icon: htmlIcon })
            .bindPopup(`<b>${loc.name}</b><br/>Type: ${loc.type === 'pol' ? 'Port of Loading' : 'External Warehouse'}`);
          
          clusterGroup.addLayer(marker);
        });

        // Add cluster group to map
        map.addLayer(clusterGroup);

        // Draw dashed route lanes and place shipping vessel simulations
        routes.forEach((route) => {
          L.polyline(route.path as L.LatLngExpression[], {
            color: '#3b82f6',
            weight: 2,
            dashArray: '5, 10',
            opacity: 0.5,
          }).addTo(map);

          // Ship simulation marker along the lane path
          const midPoint = route.path[Math.floor(route.path.length / 2)];
          const shipIcon = L.divIcon({
            html: `<div style="font-size: 1.5rem; text-shadow: 0 0 10px #3b82f6; cursor: pointer;">🚢</div>`,
            className: 'custom-ship-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          L.marker(midPoint as L.LatLngExpression, { icon: shipIcon })
            .bindPopup(`<b>Vessel Transit</b><br/>En-route: ${route.from} ➔ ${route.to}`)
            .addTo(map);
        });

        setLeafletLoaded(true);
      } catch (err) {
        console.error('Failed to load Leaflet:', err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '400px', borderRadius: '1.5rem', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
      {!leafletLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#94a3b8', zIndex: 10 }}>
          <span>Cargando Mapa de Seguimiento...</span>
        </div>
      )}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      <LogisticsOverlay />
    </div>
  );
}
