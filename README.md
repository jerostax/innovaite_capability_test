# InnovAIte Capability Test

AI-enabled compliance review of sewerage & sanitary works plans against the
*Code of Practice on Sewerage and Sanitary Works* — a capability assessment
exercise. This is not a finished, production-ready checker; it's a
proof-of-concept built one rule at a time, with the reasoning behind every
interpretation and judgement call documented alongside the code.

## Status

**5 of 5 rules implemented, tested, and documented.**

| Rule | Status |
|---|---|
| SSW 1.2.1(b) — IC top level vs. manhole top level | ✅ Done — **COMPLIANT** on drawing 1 (verified against real DXF values); `NEEDS_REVIEW` on drawing 2 (no paired manhole) |
| SSW Annex A(a) — Backfill material of RC trench | ✅ Done — `NEEDS_REVIEW` on both sample drawings, for two different reasons (see below) |
| SSW Annex A(b) — Minimum RC trench width | ✅ Done — two rule-card ambiguities resolved by calculation, not assumption |
| SSW Annex A(c) — Removable trench cover | ✅ Done — `NEEDS_REVIEW` on both sample drawings, for two different reasons (see below) |
| SSW 1.2.4(a) — No structure over/across a sewer | ✅ Done — the one geometric rule; engine built and tested, real geometry investigated and found genuinely hard to extract cleanly (see below) |

**Start here**: [`docs/write-up.md`](docs/write-up.md) — the consolidated
write-up (problem framing, all 5 rules summarized, the extraction methods
actually tried, limitations, and how this was built with Claude Code).
`npm run adjudicate` runs all 5 rules against every extracted drawing in
[`data/plans/`](data/plans/) and prints a report for each.

## How this project is organized

The design separates two stages: reading the drawing (hard, ambiguous)
and applying the rules (simple, deterministic, unit-tested per rule),
connected by [`data/plans/`](data/plans/) — one file per drawing, holding
everything actually extracted from it, consumed by
[`src/adjudicate.ts`](src/adjudicate.ts). Reading the drawing started out
as manual screenshot reading (no DXF/CAD tooling was available at first)
and later moved to real DXF text search once **ODA File Converter** (a
free tool, separate from Autodesk DWG TrueView) successfully converted
both sample drawings — see [`docs/design-decisions.md`](docs/design-decisions.md)
for the full story, including a real dead end (a general-purpose DXF
parsing library turned out not to support the entity type this project's
key data lives in).

- **[`data/plans/`](data/plans/)** — **both** sample drawings:
  [`plan-div-sanitised4.json`](data/plans/plan-div-sanitised4.json) and
  [`plan-annexA-sanitised2.json`](data/plans/plan-annexA-sanitised2.json).
  The second one includes the one element in this whole project
  explicitly labelled "RC Trench" — found via DXF search after an
  earlier screenshot-based search for it was abandoned (see
  [`docs/write-up.md`](docs/write-up.md), Section 5, for that history).
- **[`data/rules/`](data/rules/)** — one JSON file per rule: the rule
  text, how it was interpreted, the rule card's own sample scenarios, and
  every open ambiguity or judgement call, with reasoning.
- **[`src/rules/`](src/rules/)** — one TypeScript module per rule: a pure
  `evaluate()` function, `RuleResult` in →
  `{ verdict, confidence, evidence, reasoning }` out.
  [`types.ts`](src/rules/types.ts) also holds `requireElementType()`, a
  precondition shared by the three Annex A rules (a/b/c) — extracted once
  duplication showed up, rather than copy-pasted three times.
- **[`src/geometry/`](src/geometry/)** — 2D geometry helpers
  (point/segment/polygon distance, polyline/polygon intersection) used by
  the one rule that's spatial (SSW 1.2.4(a)) rather than a label/value
  lookup.
- **[`src/extraction/`](src/extraction/)** —
  [`dxf-search.ts`](src/extraction/dxf-search.ts) (+ CLI
  [`grep-dxf.ts`](src/extraction/grep-dxf.ts)): a `grep`-equivalent
  search over a DXF file's raw text — the tool actually used to extract
  both drawings' real data. Also
  [`vision-extract-ic-mh.ts`](src/extraction/vision-extract-ic-mh.ts), a
  Claude-API-based vision extraction script, written and type-checked but
  deliberately never executed (see
  [`docs/design-decisions.md`](docs/design-decisions.md)) and now a
  documented fallback rather than the primary extraction path, for
  whatever a text search can't find (e.g. a value that's only shown
  graphically, with no text label at all).
- **[`docs/rules/`](docs/rules/)** — one write-up per rule: the physical
  reasoning behind it, exactly where its values were read on the
  drawing, and every interpretation choice made, with justification.
- **[`docs/glossary.md`](docs/glossary.md)** — every CAD/drawing
  abbreviation decoded as it was encountered (IC, MH, TL, IL, FFL, RC,
  M/S, PUB, ...).
- **[`docs/design-decisions.md`](docs/design-decisions.md)** —
  cross-cutting choices that apply to more than one rule (confidence
  scoring, the extraction-method hierarchy actually tried, why the
  vision script was never run against a real key).

## Running it

```bash
npm install
npm test         # runs every rule's tests: the rule card's own sample
                  # scenarios, plus real values extracted from both drawings
npm run typecheck # tsc --noEmit — Node runs .ts files natively (no build
                  # step), this is a separate, real type-check
npm run adjudicate # runs all 5 rules against every data/plans/*.json
                  # drawing and prints a report for each
```

## Worked examples: what "documented reasoning" looks like here

**SSW 1.2.1(b)** requires an inspection chamber's top level to be at or
above the manhole it connects to (gravity flow). Drawing 1 labels both
directly: IC new top level 110.460m, MH new top level 110.450m →
**compliant**, 10mm margin. Drawing 2 has an inspection chamber but no
unambiguous connecting manhole, so it resolves to `NEEDS_REVIEW` instead.
Full reasoning, including the "existing vs. new level" interpretation
choice: [`docs/rules/ssw-1.2.1-b-ic-mh-level.md`](docs/rules/ssw-1.2.1-b-ic-mh-level.md).

**Annex A(c)** requires a removable trench cover with a lifting feature.
One sample drawing never shows an element labelled "RC Trench" — only
"RC Sump" (a related but different element). Rather than assume the two
are interchangeable, the rule checks the element's labelled type first and
returns `NEEDS_REVIEW` if it isn't "RC Trench" — flagging the terminology
mismatch for a human, instead of guessing. The *other* drawing does have a
real "RC Trench" element (750mm wide), but its cover isn't described
anywhere on that drawing either — so this rule still resolves to
`NEEDS_REVIEW` on both drawings, for two different, specific reasons.
Full reasoning: [`docs/rules/annex-a-c-trench-cover.md`](docs/rules/annex-a-c-trench-cover.md).

**Annex A(b)** (minimum trench width) has a rule card with two internal
ambiguities — two different definitions of a formula variable, and sample
scenarios where "missing data" is scored `NON_COMPLIANT` rather than
`NEEDS_REVIEW`. Both were resolved by calculating against the rule card's
own worked numeric examples rather than guessed. Drawing 2's real "RC
Trench" gives a width directly (750mm), but not the depth/diameter this
rule also needs, so it still resolves to `NEEDS_REVIEW`. Full reasoning:
[`docs/rules/annex-a-b-trench-width.md`](docs/rules/annex-a-b-trench-width.md).

**SSW 1.2.4(a)** (no structure over a sewer) is the only rule that's
genuinely geometric — comparing shapes in space rather than reading a
label. Its engine ([`src/geometry/distance.ts`](src/geometry/distance.ts)) is built and unit-tested,
including a regression test for a real intersection-detection bug found
while building it. Real DXF geometry now exists for both drawings, and
extracting real coordinates from it was investigated (not just assumed
possible): the building has no single outline (walls exist as ~28
disjoint rectangles across several layers), and the layer that looked
like the sewer turned out to be a stray/mislabelled block reference at
an implausible position, not the real sewer line. Genuine CAD-data
reconstruction work, not a quick wiring step. Full reasoning:
[`docs/rules/ssw-1.2.4-a-no-structure-over-sewer.md`](docs/rules/ssw-1.2.4-a-no-structure-over-sewer.md).

**The second drawing** (`Annex A - sanitised (2).dwg`) was searched for
by screenshot early in the project and given up on — the search was
picked back up once DXF search existed, and found the drawing's one
explicit "RC Trench" element (750mm wide) in seconds. A concrete example
of a limitation this project stated honestly turning out to be
temporary, not permanent — worth re-checking earlier-abandoned leads once
better tooling exists, rather than treating a documented limitation as
closed for good.
