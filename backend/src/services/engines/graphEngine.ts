import type { FraudGraphEdge, FraudGraphNode, GraphUpdate } from "@shared/types";
import type { ScenarioDefinition } from "../../data/scenarioTypes.js";

export function buildCaseGraph(scenario: ScenarioDefinition): GraphUpdate {
  const victimNode: FraudGraphNode = {
    id: `${scenario.id}-victim`,
    caseId: scenario.id,
    type: "victim",
    label: scenario.victimAlias,
    detail: `${scenario.city}, ${scenario.state}`,
    riskScore: 12,
    x: 80,
    y: 170,
  };

  const scammerNode: FraudGraphNode = {
    id: `${scenario.id}-scammer`,
    caseId: scenario.id,
    type: "scammer",
    label: scenario.scammerPhone,
    detail: `Impersonating ${scenario.impersonatedAuthority}`,
    riskScore: 92,
    x: 300,
    y: 90,
  };

  const muleNode: FraudGraphNode = {
    id: `${scenario.id}-mule`,
    caseId: scenario.id,
    type: "mule_account",
    label: scenario.muleAccount,
    detail: "Suspected money-mule account",
    riskScore: 78,
    x: 300,
    y: 250,
  };

  const campaignNode: FraudGraphNode = {
    id: scenario.campaignId,
    caseId: scenario.id,
    type: "campaign",
    label: scenario.campaignLabel,
    detail: "Linked across multiple active cases",
    riskScore: 96,
    x: 520,
    y: 170,
  };

  const edges: FraudGraphEdge[] = [
    {
      id: `${scenario.id}-edge-victim-scammer`,
      source: victimNode.id,
      target: scammerNode.id,
      label: "Incoming call",
      weight: 1,
    },
    {
      id: `${scenario.id}-edge-scammer-mule`,
      source: scammerNode.id,
      target: muleNode.id,
      label: "Fund transfer",
      weight: 2,
    },
    {
      id: `${scenario.id}-edge-mule-campaign`,
      source: muleNode.id,
      target: campaignNode.id,
      label: "Linked campaign",
      weight: 2,
    },
  ];

  return {
    caseId: scenario.id,
    nodes: [victimNode, scammerNode, muleNode, campaignNode],
    edges,
    campaignId: scenario.campaignId,
    campaignLabel: scenario.campaignLabel,
  };
}
