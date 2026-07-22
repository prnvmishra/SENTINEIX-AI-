import { cbiDigitalArrestScenario } from "./cbiDigitalArrest.js";
import { customsParcelScamScenario } from "./customsParcelScam.js";
import { rbiAccountFreezeScenario } from "./rbiAccountFreeze.js";
import { incomeTaxEdScamScenario } from "./incomeTaxEdScam.js";
import type { ScenarioDefinition } from "../scenarioTypes.js";

export const scenarios: ScenarioDefinition[] = [
  cbiDigitalArrestScenario,
  customsParcelScamScenario,
  rbiAccountFreezeScenario,
  incomeTaxEdScamScenario,
];

export function getScenarioById(id: string): ScenarioDefinition | undefined {
  return scenarios.find((scenario) => scenario.id === id);
}

export function getDefaultScenario(): ScenarioDefinition {
  return scenarios[0];
}

export {
  cbiDigitalArrestScenario,
  customsParcelScamScenario,
  rbiAccountFreezeScenario,
  incomeTaxEdScamScenario,
};
