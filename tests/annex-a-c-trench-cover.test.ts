import { test } from "node:test";
import assert from "node:assert/strict";

import * as coverRule from "../src/rules/annex-a-c-trench-cover.ts";

// Cases transcribed from the rule card's own "Rule Scenario" section
// (data/rules/annex-a-c-trench-cover.json). All use elementType "RC Trench"
// since that's the textbook case the rule card itself describes.
test("Annex A(c) - sample scenarios from the rule card", () => {
  assert.equal(
    coverRule.evaluate({
      elementType: "RC Trench",
      cover: { present: true, removable: true, hasLiftingFeature: true },
    }).verdict,
    "COMPLIANT"
  );
  assert.equal(
    coverRule.evaluate({
      elementType: "RC Trench",
      cover: { present: false, removable: null, hasLiftingFeature: null },
    }).verdict,
    "NON_COMPLIANT"
  );
  assert.equal(
    coverRule.evaluate({
      elementType: "RC Trench",
      cover: { present: true, removable: false, hasLiftingFeature: false },
    }).verdict,
    "NON_COMPLIANT"
  );
});

test("Annex A(c) - missing element type or cover data degrades to review", () => {
  assert.equal(
    coverRule.evaluate({ elementType: null, cover: null }).verdict,
    "NEEDS_REVIEW"
  );
  assert.equal(
    coverRule.evaluate({
      elementType: "RC Trench",
      cover: { present: true, removable: null, hasLiftingFeature: null },
    }).verdict,
    "NEEDS_REVIEW"
  );
});

test("Annex A(c) - real plan finding: RC Sump is NOT treated as RC Trench", () => {
  // Both sample sumps on the drawing have a fully-described removable
  // grating cover -- if the rule silently treated "sump" as "trench" it
  // would read COMPLIANT here. It must not: the terminology mismatch is
  // itself the thing this rule needs to flag. See
  // docs/rules/annex-a-c-trench-cover.md for the reasoning.
  const { verdict, reasoning } = coverRule.evaluate({
    elementType: "RC Sump",
    cover: { present: true, removable: true, hasLiftingFeature: true },
  });
  assert.equal(verdict, "NEEDS_REVIEW");
  assert.match(reasoning[0], /RC Trench/);
  assert.match(reasoning[0], /RC Sump/);
});
