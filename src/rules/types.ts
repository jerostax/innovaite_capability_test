export type VerdictValue = "COMPLIANT" | "NON_COMPLIANT" | "NEEDS_REVIEW";

export const Verdict = {
  COMPLIANT: "COMPLIANT",
  NON_COMPLIANT: "NON_COMPLIANT",
  NEEDS_REVIEW: "NEEDS_REVIEW",
} as const;

export interface RuleResult {
  verdict: VerdictValue;
  confidence: number;
  evidence: string[];
  reasoning: string[];
}

export function result(
  verdict: VerdictValue,
  opts: { confidence: number; evidence?: string[]; reasoning?: string[] }
): RuleResult {
  return {
    verdict,
    confidence: opts.confidence,
    evidence: opts.evidence ?? [],
    reasoning: opts.reasoning ?? [],
  };
}

export function needsReview(reasonList: string | string[]): RuleResult {
  return result(Verdict.NEEDS_REVIEW, {
    confidence: 0,
    reasoning: Array.isArray(reasonList) ? reasonList : [reasonList],
  });
}

/**
 * Shared precondition for every Annex A rule (a/b/c): each one is written
 * against a specific labelled element type ("RC Trench"), and none of them
 * should silently evaluate a different element type (e.g. "RC Sump") as if
 * it were a match. Returns a NEEDS_REVIEW RuleResult if the check fails,
 * or null if the caller should proceed with its own rule-specific logic.
 *
 * See docs/rules/annex-a-c-trench-cover.md ("The RC Trench vs. RC Sump
 * decision") for the reasoning this codifies.
 */
export function requireElementType(
  elementType: string | null,
  expected: string
): RuleResult | null {
  if (!elementType) {
    return needsReview(
      "Could not determine what type of element this is (no label read from the drawing) -- cannot confirm this rule even applies."
    );
  }

  if (elementType.trim().toLowerCase() !== expected.toLowerCase()) {
    return needsReview(
      `This rule's text and title are specific to "${expected}". This element is labelled "${elementType}" on the drawing -- different terminology, and possibly a different construction standard. Flagging for human review of whether the rule applies, rather than assuming it does.`
    );
  }

  return null;
}
