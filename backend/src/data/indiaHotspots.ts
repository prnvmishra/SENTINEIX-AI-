import type { MapHotspot } from "@shared/types";
import { mockCaseDetails } from "./mockCases.js";

const baselineHotspots: MapHotspot[] = [
  { id: "hotspot-delhi", city: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.209, incidentCount: 342, severity: "high" },
  { id: "hotspot-mumbai", city: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777, incidentCount: 298, severity: "high" },
  { id: "hotspot-hyderabad", city: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867, incidentCount: 211, severity: "high" },
  { id: "hotspot-chennai", city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, incidentCount: 156, severity: "medium" },
  { id: "hotspot-kolkata", city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, incidentCount: 187, severity: "medium" },
  { id: "hotspot-ahmedabad", city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, incidentCount: 122, severity: "medium" },
  { id: "hotspot-bhopal", city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126, incidentCount: 74, severity: "low" },
  { id: "hotspot-patna", city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, incidentCount: 96, severity: "medium" },
  { id: "hotspot-guwahati", city: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362, incidentCount: 58, severity: "low" },
  { id: "hotspot-chandigarh", city: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794, incidentCount: 67, severity: "low" },
  { id: "hotspot-kochi", city: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673, incidentCount: 88, severity: "medium" },
];

const caseHotspots: MapHotspot[] = mockCaseDetails.map((caseDetail) => ({
  ...caseDetail.hotspot,
  incidentCount: 40 + Math.round(caseDetail.finalScore * 1.5),
}));

export const indiaHotspots: MapHotspot[] = [...baselineHotspots, ...caseHotspots];

export function listHotspots(): MapHotspot[] {
  return indiaHotspots;
}
