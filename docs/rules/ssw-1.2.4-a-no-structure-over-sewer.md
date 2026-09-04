# Rule SSW 1.2.4(a) — No building/structure over or across sewer

**Source**: Code of Practice on Sewerage and Sanitary Works, 3rd Edition (March 2025), Chapter 1.2.

**Full rule text**: "No structure or buildings shall be placed over or across any sewer without the approval of PUB." (PUB = Public Utilities Board, Singapore's national water agency — see [glossary.md](../glossary.md).)

## Why this rule is different from the other four

Every other rule in this project is a **label/value lookup**: read a
number or a word off the drawing (a level, a material name, a width), and
compare it to a threshold or a list. This rule asks a **spatial** question
instead: does the outline of a building come too close to (or actually
cross) the path of a sewer? Answering that needs the building's footprint
and the sewer's centerline as actual coordinates in the same space, and a
minimum-distance calculation — not a piece of text to read.

## The check, in plain terms

```
IF the sewer centerline crosses the building footprint at all:
    NON_COMPLIANT  (direct violation)
ELSE:
    compute the minimum distance between the building footprint and the sewer centerline
    IF that distance >= the required setback:
        COMPLIANT
    ELSE:
        NON_COMPLIANT
```

## The geometry engine (`src/geometry/distance.ts`)

Built from first principles (no geometry library needed for this):
point-to-segment distance, point-to-polyline distance, polygon-to-polyline
minimum distance, and a proper polygon/polyline intersection test.

**A real bug was found and fixed while building this**, not just
theorized about: an early version of the "does the sewer cross the
building" check only tested whether either of the sewer line's *own
endpoints* fell inside the building polygon (`pointInPolygon`). That
misses the case where a straight sewer line passes cleanly through a
building's interior without either of its endpoints landing inside it —
e.g. a sewer running the full width of a site will cross any building
placed in its path, even though the sewer's endpoints sit well outside
that building, off to either side. The fix (`polylineIntersectsPolygon`)
adds a proper segment-vs-segment intersection test against every edge of
the polygon, not just a vertex check. This is covered by
`tests/ssw-1-2-4-a-no-structure-over-sewer.test.ts` ("a sewer line passing
through the building interior is caught even with no vertex inside it") —
a regression test written specifically because this bug was caught once
and shouldn't come back silently.

## Why this couldn't be run against the real drawing

The sample drawing (`(div) -sanitised (4).dwg`) draws a **"1M SEWER
SETBACK LINE"** directly next to an existing sewer — so the required
setback distance (1m) is actually known from the drawing itself. The
building's party wall visually appears to stay outside that line in the
screenshots reviewed.

But "appears to, by eye, on a screenshot" is not a computed distance.
Running this rule for real needs actual coordinates for both the sewer
centerline and the building footprint, in the same coordinate space — and
as documented in `docs/design-decisions.md`, **no DXF was ever obtained**
for either sample drawing (no CAD software available, and the free DWG
TrueView viewer doesn't export DXF). Rather than eyeball a verdict and
report it as if it were computed, this resolves to `NEEDS_REVIEW`:

- The rule engine itself is fully built and unit-tested (18/18 tests
  passing across all 5 rules, including this one, all against synthetic
  coordinates).
- It has never run against real drawing geometry, because that geometry
  was never obtainable in this environment.
- If DXF access becomes available, this is the rule to prioritise
  finishing — the hard part (the geometry engine) is already done and
  tested; only the coordinate extraction is missing.

## Verdict

```
sewerCenterline: not available (no DXF)
buildingFootprint: not available (no DXF)
→ NEEDS_REVIEW
```

## Traceability

- Geometry engine: [`src/geometry/distance.ts`](../../src/geometry/distance.ts)
- Rule logic: [`src/rules/ssw-1-2-4-a-no-structure-over-sewer.ts`](../../src/rules/ssw-1-2-4-a-no-structure-over-sewer.ts)
- Rule definition (JSON): [`data/rules/ssw-1-2-4-a-no-structure-over-sewer.json`](../../data/rules/ssw-1-2-4-a-no-structure-over-sewer.json)
- Tests (rule card scenarios, the intersection-bug regression test, and the missing-geometry case): [`tests/ssw-1-2-4-a-no-structure-over-sewer.test.ts`](../../tests/ssw-1-2-4-a-no-structure-over-sewer.test.ts) — run with `npm test`
