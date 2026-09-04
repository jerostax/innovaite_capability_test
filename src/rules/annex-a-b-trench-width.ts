import { Verdict, result, needsReview, requireElementType, type RuleResult } from "./types.ts";

// SSW Annex A (b) - Minimum RC trench width.
// Reasoning, the two open ambiguities, and how each was resolved:
// docs/rules/annex-a-b-trench-width.md
// Rule text and sample scenarios: data/rules/annex-a-b-trench-width.json

export const ruleId = "SSW Annex A (b)";

export interface TrenchWidthElement {
  /** What the drawing actually labels this element as, e.g. "RC Trench", "RC Sump". */
  elementType: string | null;
  sewerDepth_mm: number | null;
  sewerNominalDiameter_mm: number | null;
  haunchingThickness_mm: number | null;
  trenchWidth_mm: number | null;
}

function computeMinWidth(depth_mm: number, diameter_mm: number, haunching_mm: number) {
  // Table 11's ">3m / all sizes" row is blank in the source document
  // ("See Figure 2"). ASSUMPTION: it inherits the 900+T formula from the
  // row above regardless of diameter -- untested by any sample scenario
  // at depth > 3m with diameter <= 300mm. See the rule JSON.
  const useFlatWidth = diameter_mm <= 300 && depth_mm <= 3000;
  if (useFlatWidth) return { minWidth_mm: 750, formulaApplies: false };

  // T = 2*haunching + diameter (verified against Scenario 02-compliant's
  // worked numbers -- see openAmbiguities[0] in the rule JSON. The
  // alternative reading, with an extra "900mm +" folded into T itself,
  // does not reconcile with the worked example and is treated as a
  // drafting error in the source document.)
  const T = 2 * haunching_mm + diameter_mm;
  return { minWidth_mm: 900 + T, formulaApplies: true };
}

export function evaluate(element: TrenchWidthElement): RuleResult {
  const typeGate = requireElementType(element.elementType, "RC Trench");
  if (typeGate) return typeGate;

  const { sewerDepth_mm, sewerNominalDiameter_mm, haunchingThickness_mm, trenchWidth_mm } = element;

  const missing: string[] = [];
  if (sewerDepth_mm == null) missing.push("sewer depth");
  if (sewerNominalDiameter_mm == null) missing.push("sewer nominal diameter");
  if (trenchWidth_mm == null) missing.push("trench width");
  if (missing.length > 0) {
    return needsReview(
      `Element is labelled RC Trench, but cannot evaluate minimum width: missing ${missing.join(", ")}. Flag for human review rather than assuming a value.`
    );
  }

  // Once diameter > 300mm (or depth > 3m), the Code requires haunching
  // thickness to be specified. Its absence is treated as a design
  // failure (NON_COMPLIANT), not a data-extraction gap (NEEDS_REVIEW) --
  // this is a deliberate departure from every other rule in this
  // project. See openAmbiguities[1] in the rule JSON for the reasoning
  // and the worked-example evidence behind it.
  const formulaWillApply = !(sewerNominalDiameter_mm! <= 300 && sewerDepth_mm! <= 3000);
  if (formulaWillApply && (haunchingThickness_mm == null || haunchingThickness_mm === 0)) {
    return result(Verdict.NON_COMPLIANT, {
      confidence: 0.85,
      evidence: [
        `Sewer depth ${sewerDepth_mm}mm / diameter ${sewerNominalDiameter_mm}mm requires haunching thickness to be specified in the design; none was found.`,
      ],
      reasoning: [
        "Diameter > 300mm (or depth > 3m) makes haunching thickness a required design parameter (T = 2 x haunching + diameter). Its absence from the drawing is treated as a design/documentation failure, independent of whether the built width happens to satisfy the zero-haunching arithmetic minimum.",
      ],
    });
  }

  const { minWidth_mm, formulaApplies } = computeMinWidth(
    sewerDepth_mm!,
    sewerNominalDiameter_mm!,
    haunchingThickness_mm ?? 0
  );

  const compliant = trenchWidth_mm! >= minWidth_mm;

  return result(compliant ? Verdict.COMPLIANT : Verdict.NON_COMPLIANT, {
    confidence: 0.9,
    evidence: [
      `Sewer depth ${sewerDepth_mm}mm; diameter ${sewerNominalDiameter_mm}mm;` +
        (formulaApplies ? ` haunching ${haunchingThickness_mm}mm;` : "") +
        ` trench width ${trenchWidth_mm}mm.`,
    ],
    reasoning: [
      `Required minimum width for these parameters: ${minWidth_mm}mm.`,
      compliant
        ? `Built width ${trenchWidth_mm}mm >= required minimum ${minWidth_mm}mm.`
        : `Built width ${trenchWidth_mm}mm < required minimum ${minWidth_mm}mm.`,
    ],
  });
}
