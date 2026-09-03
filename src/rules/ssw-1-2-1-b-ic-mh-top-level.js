import { Verdict, result, needsReview } from "./types.js";

// SSW 1.2.1 (b) - Top level of manhole to inspection chamber.
// Reasoning and drawing evidence: docs/rules/ssw-1.2.1-b-ic-mh-level.md
// Rule text and sample scenarios: data/rules/ssw-1-2-1-b-ic-mh-top-level.json

export const ruleId = "SSW 1.2.1 (b)";

/**
 * @param {object} pair - { inspectionChamberTopLevel_m, manholeTopLevel_m }
 */
export function evaluate(pair) {
  const { inspectionChamberTopLevel_m, manholeTopLevel_m } = pair;

  if (inspectionChamberTopLevel_m == null || manholeTopLevel_m == null) {
    return needsReview(
      "Cannot evaluate: missing top level for the inspection chamber and/or the manhole it connects to."
    );
  }

  const compliant = inspectionChamberTopLevel_m >= manholeTopLevel_m;
  const diff = (inspectionChamberTopLevel_m - manholeTopLevel_m).toFixed(3);

  return result(compliant ? Verdict.COMPLIANT : Verdict.NON_COMPLIANT, {
    confidence: 0.9,
    evidence: [
      `Inspection chamber top level: ${inspectionChamberTopLevel_m}m. Connecting manhole top level: ${manholeTopLevel_m}m.`,
    ],
    reasoning: [
      compliant
        ? `IC top level is ${Math.abs(diff)}m ${diff == 0 ? "equal to" : "higher than"} the MH top level -- compliant (equal is explicitly allowed by the rule's own Figure 02 / Scenario 01-Compliant-2).`
        : `IC top level is ${Math.abs(diff)}m LOWER than the MH top level -- non-compliant.`,
    ],
  });
}
