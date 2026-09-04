import { Verdict, result, needsReview, requireElementType, type RuleResult } from "./types.ts";

// SSW Annex A (a) - Backfill material of RC trench.
// Reasoning and drawing evidence: docs/rules/annex-a-a-backfill.md
// Rule text and sample scenarios: data/rules/annex-a-a-backfill.json

export const ruleId = "SSW Annex A (a)";

const ALLOWED_MATERIALS = new Set([
  "sand",
  "corey dust",
  "granite dust",
  "gravel",
  "crusher run",
  "recycled aggregates",
]);

export interface TrenchBackfillElement {
  /** What the drawing actually labels this element as, e.g. "RC Trench", "RC Sump". */
  elementType: string | null;
  backfillMaterial: string | null;
}

export function evaluate(element: TrenchBackfillElement): RuleResult {
  const typeGate = requireElementType(element.elementType, "RC Trench");
  if (typeGate) return typeGate;

  const raw = element.backfillMaterial;
  if (!raw) {
    return needsReview(
      "Element is labelled RC Trench, but no backfill material could be identified (missing label/annotation, or the label did not match a known material). Flag for human review rather than assuming compliance."
    );
  }

  const material = raw.trim().toLowerCase();
  const compliant = ALLOWED_MATERIALS.has(material);

  return result(compliant ? Verdict.COMPLIANT : Verdict.NON_COMPLIANT, {
    confidence: 0.9,
    evidence: [`RC trench backfill material read as: "${raw}"`],
    reasoning: [
      compliant
        ? `"${raw}" is in the approved list (sand, corey dust, granite dust, gravel, crusher run, recycled aggregates).`
        : `"${raw}" is not in the approved list (sand, corey dust, granite dust, gravel, crusher run, recycled aggregates).`,
    ],
  });
}
