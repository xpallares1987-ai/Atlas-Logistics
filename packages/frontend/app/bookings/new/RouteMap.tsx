import React from 'react';
import { ComposableMap, Geographies, Geography, Line, Marker } from 'react-simple-maps';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface RouteMapProps {
  polCoordinates?: [number, number];
  podCoordinates?: [number, number];
  polName?: string;
  podName?: string;
}

export default function RouteMap({ polCoordinates, podCoordinates, polName, podName }: RouteMapProps) {
  return (
    <div className="w-full h-full bg-[#0A0A0B] border border-gray-800 rounded-lg overflow-hidden relative">
      <ComposableMap
        projectionConfig={{
          scale: 140,
        }}
        width={800}
        height={400}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#16161A"
                stroke="#2a2a35"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none", fill: "#1a1a24" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {polCoordinates && podCoordinates && (
          <Line
            from={polCoordinates}
            to={podCoordinates}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="4 4"
            className="animate-pulse"
          />
        )}

        {polCoordinates && (
          <Marker coordinates={polCoordinates}>
            <circle r={4} fill="#3b82f6" />
            <text
              textAnchor="middle"
              y={-10}
              style={{ fill: "#9ca3af", fontSize: "10px", fontWeight: "bold" }}
            >
              {polName || "POL"}
            </text>
          </Marker>
        )}

        {podCoordinates && (
          <Marker coordinates={podCoordinates}>
            <circle r={4} fill="#10b981" />
            <text
              textAnchor="middle"
              y={-10}
              style={{ fill: "#9ca3af", fontSize: "10px", fontWeight: "bold" }}
            >
              {podName || "POD"}
            </text>
          </Marker>
        )}
      </ComposableMap>
      
      {(!polCoordinates || !podCoordinates) && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 bg-[#0A0A0B]/80">
          Selecciona un POL y POD válidos para visualizar la ruta.
        </div>
      )}
    </div>
  );
}
