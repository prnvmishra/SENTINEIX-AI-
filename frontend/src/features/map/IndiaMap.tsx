import { useMemo } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import type { MapHotspot, MapPing } from "@shared/types";

const severityColor: Record<MapHotspot["severity"], string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#06b6d4",
};

const severityRadius: Record<MapHotspot["severity"], number> = {
  high: 11,
  medium: 8,
  low: 6,
};

function createPingIcon(): L.DivIcon {
  return L.divIcon({
    className: "map-ping-icon",
    html: `
      <span class="relative flex h-6 w-6 items-center justify-center">
        <span class="absolute inline-flex h-full w-full rounded-full bg-danger/60 animate-radar-pulse"></span>
        <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger shadow-[0_0_8px_2px_rgba(239,68,68,0.8)]"></span>
      </span>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function IndiaMap({ hotspots, activePings }: { hotspots: MapHotspot[]; activePings: MapPing[] }) {
  const pingIcon = useMemo(() => createPingIcon(), []);
  const latestPings = useMemo(() => activePings.slice(-6), [activePings]);

  return (
    <MapContainer
      center={[22.9734, 78.6569]}
      zoom={4.6}
      zoomSnap={0.2}
      minZoom={4}
      maxZoom={8}
      scrollWheelZoom={false}
      className="h-full w-full"
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap contributors &copy; CARTO"
      />

      {hotspots.map((hotspot) => (
        <CircleMarker
          key={hotspot.id}
          center={[hotspot.lat, hotspot.lng]}
          radius={severityRadius[hotspot.severity]}
          pathOptions={{
            color: severityColor[hotspot.severity],
            fillColor: severityColor[hotspot.severity],
            fillOpacity: 0.35,
            weight: 1.5,
          }}
        >
          <Popup>
            <div className="font-sans text-xs">
              <p className="font-semibold text-slate-100">
                {hotspot.city}, {hotspot.state}
              </p>
              <p className="text-slate-400">{hotspot.incidentCount} reported incidents</p>
              <p className="capitalize text-slate-500">Severity: {hotspot.severity}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {latestPings.map((ping, index) => (
        <Marker key={`${ping.hotspotId}-${ping.timestampMs}-${index}`} position={[ping.lat, ping.lng]} icon={pingIcon}>
          <Popup>
            <div className="font-sans text-xs">
              <p className="font-semibold text-slate-100">Live signal · {ping.city}</p>
              <p className="text-slate-400">{ping.state}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
