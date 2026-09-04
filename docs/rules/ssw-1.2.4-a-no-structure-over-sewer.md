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
centerline and the building footprint, in the same coordinate space.

**Update**: real DXF files now exist for both sample drawings (converted
via ODA File Converter — see `docs/design-decisions.md`, "DXF extraction:
parser vs. targeted search"). At that point the plan was to identify the
specific sewer-centerline and building-footprint polylines and extract
their coordinates — expected to be a scoped, mechanical follow-up. **It
turned out not to be**, and this was actually investigated (with
`dxf-parser`, which handles `LWPOLYLINE`/`INSERT` correctly, unlike the
`MLEADER` case documented in `docs/design-decisions.md`), not just
assumed to be hard:

- **The building has no single outline.** Its walls exist as ~28
  separate 4-vertex `LWPOLYLINE` rectangles (one per wall segment, each
  representing that wall's thickness) spread across several layers
  (`A-_WALL----_N`, `A-_SITEWALL_E-`, etc.). There is no ready-made
  polygon for "the building footprint" — one would have to be
  reconstructed by tracing the outer boundary of ~28 disjoint rectangles,
  a real geometric reconstruction problem in its own right, not a lookup.
- **The layer that looks like the sewer isn't.** A layer literally named
  `A-_SEWR----_--` exists and contains exactly one entity — but it's an
  `INSERT` (a block reference) named `"sewer setback"`, inserted at
  position `(166043907, 78733665)` with a 100x scale and a ~196° rotation.
  Real site coordinates elsewhere in the same drawing are in the tens of
  thousands, not hundreds of millions — this insertion point is not
  anywhere on the actual site. Resolving the referenced block's internal
  geometry (a handful of `LINE`/`LWPOLYLINE` entities on layers like
  `MH_Line`) and applying that transform did not produce anything
  resembling the sewer line visible in the drawing. Most likely a stray
  or mislabelled block, not the real sewer geometry — the layer name was
  misleading.
- **The drawing has 123 layers total**, and neither name-matching
  (`/sewer|drain|boundary/i`) nor the two "obvious" candidates above
  actually pointed at usable geometry. Correctly identifying the right
  layers would need systematic layer-by-layer inspection cross-referenced
  against the visual drawing (e.g. matching on-screen colors to layers),
  not a quick script.

**Conclusion**: this is real, substantial CAD-data-modeling work — not
the "scoped, achievable follow-up" it was described as right after DXF
access was obtained. That earlier framing undersold the difficulty; this
is the corrected, investigated assessment. Still `NEEDS_REVIEW`:

- The rule engine itself is fully built and unit-tested (23/23 tests
  passing across all 5 rules, including this one, all against synthetic
  coordinates) and is ready the moment usable coordinates exist.
- It has never run against real drawing geometry, and won't without
  either a much deeper CAD-reverse-engineering effort (resolving block
  references correctly, reconstructing building outlines from wall
  fragments, verifying layers visually) or a source drawing that draws
  the sewer centerline and building outline as single, cleanly-labelled
  polylines to begin with.

## Verdict

```
sewerCenterline: investigated in the real DXF -- the layer that looked
                 right (A-_SEWR----_--) turned out to be a mislabelled/
                 stray block, not the real sewer geometry
buildingFootprint: investigated in the real DXF -- exists only as ~28
                    disjoint wall-segment rectangles, no single outline
→ NEEDS_REVIEW
```

## Traceability

- Geometry engine: [`src/geometry/distance.ts`](../../src/geometry/distance.ts)
- Rule logic: [`src/rules/ssw-1-2-4-a-no-structure-over-sewer.ts`](../../src/rules/ssw-1-2-4-a-no-structure-over-sewer.ts)
- Rule definition (JSON): [`data/rules/ssw-1-2-4-a-no-structure-over-sewer.json`](../../data/rules/ssw-1-2-4-a-no-structure-over-sewer.json)
- Tests (rule card scenarios, the intersection-bug regression test, and the missing-geometry case): [`tests/ssw-1-2-4-a-no-structure-over-sewer.test.ts`](../../tests/ssw-1-2-4-a-no-structure-over-sewer.test.ts) — run with `npm test`
