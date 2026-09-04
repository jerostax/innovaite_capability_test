import { test } from "node:test";
import assert from "node:assert/strict";

import * as sewerSetbackRule from "../src/rules/ssw-1-2-4-a-no-structure-over-sewer.ts";

// Synthetic coordinates -- no DXF was ever obtained for either sample
// drawing (see docs/rules/ssw-1.2.4-a-no-structure-over-sewer.md), so this
// rule's own sample scenarios ("a building near/over a sewer") can only be
// tested with invented geometry, not real plan data.

test("SSW 1.2.4(a) - sample scenarios (synthetic geometry)", () => {
  const sewerCenterline = [{ x: 0, y: 0 }, { x: 100, y: 0 }];

  const buildingFarEnough = [
    { x: 10, y: 5 }, { x: 20, y: 5 }, { x: 20, y: 15 }, { x: 10, y: 15 },
  ];
  const buildingTooClose = [
    { x: 10, y: 0.5 }, { x: 20, y: 0.5 }, { x: 20, y: 10 }, { x: 10, y: 10 },
  ];
  const buildingOverSewer = [
    { x: 10, y: -5 }, { x: 20, y: -5 }, { x: 20, y: 5 }, { x: 10, y: 5 },
  ];

  assert.equal(
    sewerSetbackRule.evaluate({ sewerCenterline, buildingFootprint: buildingFarEnough, requiredSetback_m: 3 }).verdict,
    "COMPLIANT"
  );
  assert.equal(
    sewerSetbackRule.evaluate({ sewerCenterline, buildingFootprint: buildingTooClose, requiredSetback_m: 3 }).verdict,
    "NON_COMPLIANT"
  );
  assert.equal(
    sewerSetbackRule.evaluate({ sewerCenterline, buildingFootprint: buildingOverSewer, requiredSetback_m: 3 }).verdict,
    "NON_COMPLIANT"
  );
});

test("SSW 1.2.4(a) - a sewer line passing through the building interior is caught even with no vertex inside it", () => {
  // Regression test for a real bug found while first building this
  // engine: a sewer running from x=0 to x=100 at y=0 passes straight
  // through a building spanning x=10..20, y=-5..5 -- but NEITHER of the
  // sewer's own endpoints ((0,0) and (100,0)) is itself inside that
  // building. A point-in-polygon check on the polyline's vertices alone
  // misses this; a proper segment-intersection test catches it.
  const sewerCenterline = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
  const buildingStraddlingTheLine = [
    { x: 10, y: -5 }, { x: 20, y: -5 }, { x: 20, y: 5 }, { x: 10, y: 5 },
  ];
  const { verdict } = sewerSetbackRule.evaluate({
    sewerCenterline,
    buildingFootprint: buildingStraddlingTheLine,
    requiredSetback_m: 3,
  });
  assert.equal(verdict, "NON_COMPLIANT");
});

test("SSW 1.2.4(a) - missing geometry (no DXF available) degrades to review", () => {
  assert.equal(
    sewerSetbackRule.evaluate({
      sewerCenterline: null,
      buildingFootprint: null,
      requiredSetback_m: null,
    }).verdict,
    "NEEDS_REVIEW"
  );
});
