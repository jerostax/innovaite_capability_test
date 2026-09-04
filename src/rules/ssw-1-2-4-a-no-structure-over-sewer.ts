import { Verdict, result, needsReview, type RuleResult } from "./types.ts";
import { polylineIntersectsPolygon, distPolygonToPolyline, type Point } from "../geometry/distance.ts";

// SSW 1.2.4 (a) - No building/structure over or across sewer.
// Reasoning and why this couldn't be run against the real drawing:
// docs/rules/ssw-1.2.4-a-no-structure-over-sewer.md
// Rule text and sample scenarios: data/rules/ssw-1-2-4-a-no-structure-over-sewer.json
//
// This is the one rule in the pack that is genuinely geometric: it needs
// the sewer centerline and the building footprint in the same coordinate
// space, plus the required setback distance -- a spatial test, not a
// label/value lookup like every other rule here.

export const ruleId = "SSW 1.2.4 (a)";

export interface SewerSetbackCheck {
  sewerCenterline: Point[] | null;
  buildingFootprint: Point[] | null;
  requiredSetback_m: number | null;
}

export function evaluate(check: SewerSetbackCheck): RuleResult {
  const { sewerCenterline, buildingFootprint, requiredSetback_m } = check;

  if (!sewerCenterline || !buildingFootprint || requiredSetback_m == null) {
    return needsReview(
      "Cannot evaluate: missing sewer centerline, building footprint, or required setback distance -- this rule needs real vector coordinates for both shapes, not just a visual impression from a rendered image."
    );
  }

  if (polylineIntersectsPolygon(sewerCenterline, buildingFootprint)) {
    return result(Verdict.NON_COMPLIANT, {
      confidence: 0.95,
      evidence: ["The sewer centerline crosses into (or through) the building footprint."],
      reasoning: ["The sewer passes directly under/through the building outline -- clear violation."],
    });
  }

  const clearance_m = distPolygonToPolyline(buildingFootprint, sewerCenterline);
  const compliant = clearance_m >= requiredSetback_m;

  return result(compliant ? Verdict.COMPLIANT : Verdict.NON_COMPLIANT, {
    confidence: 0.85,
    evidence: [
      `Minimum clearance between building footprint and sewer centerline: ${clearance_m.toFixed(2)}m. Required setback: ${requiredSetback_m}m.`,
    ],
    reasoning: [
      compliant
        ? `Clearance ${clearance_m.toFixed(2)}m >= required setback ${requiredSetback_m}m.`
        : `Clearance ${clearance_m.toFixed(2)}m < required setback ${requiredSetback_m}m.`,
    ],
  });
}
