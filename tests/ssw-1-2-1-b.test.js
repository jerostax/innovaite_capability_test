import { test } from "node:test";
import assert from "node:assert/strict";

import * as icMhRule from "../src/rules/ssw-1-2-1-b-ic-mh-top-level.js";

// Cases transcribed from the rule card's own "Rule Scenario" section
// (data/rules/ssw-1-2-1-b-ic-mh-top-level.json).
test("SSW 1.2.1(b) - sample scenarios from the rule card", () => {
  assert.equal(
    icMhRule.evaluate({ inspectionChamberTopLevel_m: 110.5, manholeTopLevel_m: 110.2 }).verdict,
    "COMPLIANT"
  );
  assert.equal(
    icMhRule.evaluate({ inspectionChamberTopLevel_m: 110.2, manholeTopLevel_m: 110.2 }).verdict,
    "COMPLIANT"
  );
  assert.equal(
    icMhRule.evaluate({ inspectionChamberTopLevel_m: 110.0, manholeTopLevel_m: 110.2 }).verdict,
    "NON_COMPLIANT"
  );
});

test("SSW 1.2.1(b) - missing data degrades to review, not a guess", () => {
  assert.equal(
    icMhRule.evaluate({ inspectionChamberTopLevel_m: null, manholeTopLevel_m: 110.2 }).verdict,
    "NEEDS_REVIEW"
  );
});

test("SSW 1.2.1(b) - real values read off the sample drawing (EXG'T LAST IC vs EXG'T LAST MH)", () => {
  const { verdict } = icMhRule.evaluate({
    inspectionChamberTopLevel_m: 110.46,
    manholeTopLevel_m: 110.45,
  });
  assert.equal(verdict, "COMPLIANT");
});
