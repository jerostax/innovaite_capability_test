import { test } from "node:test";
import assert from "node:assert/strict";

import * as backfillRule from "../src/rules/annex-a-a-backfill.ts";

// Cases transcribed from the rule card's own "Rule Scenario" section
// (data/rules/annex-a-a-backfill.json). elementType "RC Trench" throughout,
// since that's the textbook case the rule card describes.
test("Annex A(a) - sample scenarios from the rule card", () => {
  assert.equal(
    backfillRule.evaluate({ elementType: "RC Trench", backfillMaterial: "Sand" }).verdict,
    "COMPLIANT"
  );
  assert.equal(
    backfillRule.evaluate({ elementType: "RC Trench", backfillMaterial: "Soil" }).verdict,
    "NON_COMPLIANT"
  );
});

test("Annex A(a) - real-world label variation (case-insensitive match)", () => {
  assert.equal(
    backfillRule.evaluate({ elementType: "RC Trench", backfillMaterial: "CRUSHER RUN" }).verdict,
    "COMPLIANT"
  );
});

test("Annex A(a) - missing data degrades to review, not a guess", () => {
  assert.equal(
    backfillRule.evaluate({ elementType: "RC Trench", backfillMaterial: null }).verdict,
    "NEEDS_REVIEW"
  );
});

test("Annex A(a) - real plan finding: RC Sump is NOT treated as RC Trench", () => {
  // Same reasoning as Annex A(c): the sample drawing's "RC Sump" elements
  // are not evaluated as if they were "RC Trench", even when other data
  // (here: none) might otherwise be present. See
  // docs/rules/annex-a-a-backfill.md.
  const { verdict, reasoning } = backfillRule.evaluate({
    elementType: "RC Sump",
    backfillMaterial: null,
  });
  assert.equal(verdict, "NEEDS_REVIEW");
  assert.match(reasoning[0], /RC Trench/);
  assert.match(reasoning[0], /RC Sump/);
});
