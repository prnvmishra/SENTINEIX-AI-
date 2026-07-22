import type { GraphNodeType } from "./enums";

export interface FraudGraphNode {
  id: string;
  caseId: string;
  type: GraphNodeType;
  label: string;
  detail: string;
  riskScore: number;
  x: number;
  y: number;
}

export interface FraudGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight: number;
}

export interface GraphUpdate {
  caseId: string;
  nodes: FraudGraphNode[];
  edges: FraudGraphEdge[];
  campaignId: string | null;
  campaignLabel: string | null;
}
