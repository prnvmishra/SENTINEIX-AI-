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
  /** Suburb / neighbourhood when reverse-geocode provides it */
  locality?: string;
  /** Street / area line for investigators */
  addressLine?: string;
  /** Browser Geolocation accuracy in metres when available */
  accuracyMeters?: number;
  timestampMs: number;
}
