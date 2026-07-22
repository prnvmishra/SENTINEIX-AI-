export interface MapHotspot {
  id: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  incidentCount: number;
  severity: "low" | "medium" | "high";
}

export interface MapPing {
  caseId: string;
  hotspotId: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  timestampMs: number;
}
