import { Verdict, result, needsReview, type RuleResult } from "./types.ts";

// SSW Annex A (c) - Provision of removable trench cover.
// Reasoning, the RC Trench vs RC Sump decision, and drawing evidence:
// docs/rules/annex-a-c-trench-cover.md
// Rule text and sample scenarios: data/rules/annex-a-c-trench-cover.json

export const ruleId = "SSW Annex A (c)";

export interface TrenchCoverElement {
  /** What the drawing actually labels this element as, e.g. "RC Trench", "RC Sump". */
  elementType: string | null;
  cover: {
    present: boolean | null;
    removable: boolean | null;
    hasLiftingFeature: boolean | null;
  } | null;
}

export function evaluate(element: TrenchCoverElement): RuleResult {
  if (!element.elementType) {
    return needsReview(
      "Could not determine what type of element this is (no label read from the drawing) -- cannot confirm this rule even applies."
    );
  }

  if (element.elementType.trim().toLowerCase() !== "rc trench") {
    return needsReview(
      `This rule's text and title are specific to "RC Trench". This element is labelled "${element.elementType}" on the drawing -- different terminology, and possibly a different construction standard. Flagging for human review of whether the rule applies, rather than assuming it does.`
    );
  }

  const cover = element.cover;
  if (!cover || cover.present == null) {
    return needsReview(
      "Element is labelled RC Trench, but no cover annotation/entity was found on or near it. Flag for human review."
    );
  }

  if (cover.present === false) {
    return result(Verdict.NON_COMPLIANT, {
      confidence: 0.85,
      evidence: ["No trench cover found over the RC Trench."],
      reasoning: ["Access into the trench must be from the top, via a cover; none is drawn."],
    });
  }

  if (cover.removable == null || cover.hasLiftingFeature == null) {
    return needsReview(
      "Trench cover is present, but its removability and/or lifting feature could not be determined from the drawing. Flag for human review rather than guessing."
    );
  }

  const compliant = cover.removable && cover.hasLiftingFeature;

  return result(compliant ? Verdict.COMPLIANT : Verdict.NON_COMPLIANT, {
    confidence: 0.85,
    evidence: [
      `Trench cover present. Removable: ${cover.removable}. Lifting feature: ${cover.hasLiftingFeature}.`,
    ],
    reasoning: [
      compliant
        ? "Cover is removable and has a lifting feature, as required."
        : !cover.removable
          ? "Cover is not removable -- required by the rule."
          : "Cover is removable but has no lifting feature -- required by the rule.",
    ],
  });
}
