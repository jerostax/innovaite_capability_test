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
