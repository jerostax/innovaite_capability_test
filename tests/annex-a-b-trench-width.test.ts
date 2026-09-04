import { test } from "node:test";
import assert from "node:assert/strict";

import * as widthRule from "../src/rules/annex-a-b-trench-width.ts";

// Cases transcribed from the rule card's own "Rule Scenario" section
// (data/rules/annex-a-b-trench-width.json). elementType "RC Trench"
// throughout, since that's the textbook case the rule card describes.
test("Annex A(b) - sample scenarios from the rule card", () => {
  const cases: Array<[Omit<Parameters<typeof widthRule.evaluate>[0], "elementType">, string]> = [
    [{ sewerDepth_mm: 3000, sewerNominalDiameter_mm: 300, haunchingThickness_mm: null, trenchWidth_mm: 750 }, "COMPLIANT"],
    [{ sewerDepth_mm: 3000, sewerNominalDiameter_mm: 300, haunchingThickness_mm: null, trenchWidth_mm: 700 }, "NON_COMPLIANT"],
    [{ sewerDepth_mm: 3000, sewerNominalDiameter_mm: 350, haunchingThickness_mm: 125, trenchWidth_mm: 1500 }, "COMPLIANT"],
    [{ sewerDepth_mm: 3000, sewerNominalDiameter_mm: 350, haunchingThickness_mm: null, trenchWidth_mm: 1250 }, "NON_COMPLIANT"],
    [{ sewerDepth_mm: 3500, sewerNominalDiameter_mm: 350, haunchingThickness_mm: 125, trenchWidth_mm: 1500 }, "COMPLIANT"],
    [{ sewerDepth_mm: 3500, sewerNominalDiameter_mm: 350, haunchingThickness_mm: null, trenchWidth_mm: 1250 }, "NON_COMPLIANT"],
  ];
  for (const [input, expected] of cases) {
    const { verdict } = widthRule.evaluate({ elementType: "RC Trench", ...input });
    assert.equal(verdict, expected, `input=${JSON.stringify(input)}`);
  }
});

test("Annex A(b) - the T-formula ambiguity resolves to the simple definition", () => {
  // Verified by calculation against Scenario 02-compliant: only
  // T = 2*haunching + diameter (not T = 900 + 2*haunching + diameter)
  // reconciles with the rule card's own stated result of 1500mm.
  const { verdict, reasoning } = widthRule.evaluate({
    elementType: "RC Trench",
    sewerDepth_mm: 3000,
    sewerNominalDiameter_mm: 350,
    haunchingThickness_mm: 125,
    trenchWidth_mm: 1500,
  });
  assert.equal(verdict, "COMPLIANT");
  assert.match(reasoning[0], /1500mm/);
});

test("Annex A(b) - missing haunching (diameter > 300mm) is NON_COMPLIANT, not NEEDS_REVIEW", () => {
  // The key distinction this rule makes: a required design parameter
  // that's absent from the drawing is a design failure (NON_COMPLIANT),
  // not a data-extraction gap (NEEDS_REVIEW) -- even though the built
  // width (1250mm) exactly satisfies the zero-haunching arithmetic.
  const { verdict } = widthRule.evaluate({
    elementType: "RC Trench",
    sewerDepth_mm: 3000,
    sewerNominalDiameter_mm: 350,
    haunchingThickness_mm: null,
    trenchWidth_mm: 1250,
  });
  assert.equal(verdict, "NON_COMPLIANT");
});

test("Annex A(b) - missing depth/diameter/width (our extraction failure) is NEEDS_REVIEW", () => {
  assert.equal(
    widthRule.evaluate({
      elementType: "RC Trench",
      sewerDepth_mm: null,
      sewerNominalDiameter_mm: 300,
      haunchingThickness_mm: null,
      trenchWidth_mm: 750,
    }).verdict,
    "NEEDS_REVIEW"
  );
});

test("Annex A(b) - real plan finding: RC Sump is NOT treated as RC Trench", () => {
  const { verdict, reasoning } = widthRule.evaluate({
    elementType: "RC Sump",
    sewerDepth_mm: null,
    sewerNominalDiameter_mm: null,
    haunchingThickness_mm: null,
    trenchWidth_mm: null,
  });
  assert.equal(verdict, "NEEDS_REVIEW");
  assert.match(reasoning[0], /RC Trench/);
  assert.match(reasoning[0], /RC Sump/);
});
