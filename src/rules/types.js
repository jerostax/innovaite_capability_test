export const Verdict = Object.freeze({
  COMPLIANT: "COMPLIANT",
  NON_COMPLIANT: "NON_COMPLIANT",
  NEEDS_REVIEW: "NEEDS_REVIEW",
});

export function result(verdict, { confidence, evidence = [], reasoning = [] }) {
  return { verdict, confidence, evidence, reasoning };
}

export function needsReview(reasonList) {
  return result(Verdict.NEEDS_REVIEW, {
    confidence: 0,
    reasoning: Array.isArray(reasonList) ? reasonList : [reasonList],
  });
}
