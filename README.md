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
| SSW 1.2.1(b) — IC top level vs. manhole top level | ✅ Done — verified against real values read off the sample drawing |
| SSW Annex A(a) — Backfill material of RC trench | ✅ Done — resolves to `NEEDS_REVIEW` on the sample drawing (see below) |
| SSW Annex A(b) — Minimum RC trench width | ✅ Done — two rule-card ambiguities resolved by calculation, not assumption |
| SSW Annex A(c) — Removable trench cover | ✅ Done — resolves to `NEEDS_REVIEW` on the sample drawing (see below) |
| SSW 1.2.4(a) — No structure over/across a sewer | ✅ Done — the one geometric rule; engine built and tested, never run on real geometry (no DXF) |

**Start here**: [`docs/write-up.md`](docs/write-up.md) — the consolidated
write-up (problem framing, all 5 rules summarized, the extraction methods
actually tried, limitations, and how this was built with Claude Code).
`npm run adjudicate` runs all 5 rules against the real extracted drawing
data (`data/plans/plan-div-sanitised4.json`) and prints a report.

## How this project is organized

The design separates two stages: reading the drawing (hard, ambiguous —
done so far by reading the drawing directly, since no DXF/CAD tooling was
available) and applying the rules (simple, deterministic, unit-tested per
rule), connected by `data/plans/*.json` — one file per drawing that's
actually been extracted, holding everything found in it, consumed by
`src/adjudicate.ts`.

- **`data/plans/`** — currently **1 of the 2** sample drawings:
  `plan-div-sanitised4.json`. The second drawing
  (`Annex A - sanitised (2).dwg`) was explored (it appeared to reference
  an "RC Trench"/"RC Sump" area during manual review) but no element on
  it was confidently pinned down and extracted within the time available
  — recorded as a scope limitation in `docs/write-up.md`, not silently
  dropped.
- **`data/rules/`** — one JSON file per rule: the rule text, how it was
  interpreted, the rule card's own sample scenarios, and every open
  ambiguity or judgement call, with reasoning.
- **`src/rules/`** — one TypeScript module per rule: a pure `evaluate()`
  function, `RuleResult` in → `{ verdict, confidence, evidence, reasoning }` out.
  `types.ts` also holds `requireElementType()`, a precondition shared by
  the three Annex A rules (a/b/c) — extracted once duplication showed up,
  rather than copy-pasted three times.
- **`src/geometry/`** — 2D geometry helpers (point/segment/polygon
  distance, polyline/polygon intersection) used by the one rule that's
  spatial (SSW 1.2.4(a)) rather than a label/value lookup.
- **`src/extraction/`** — a vision-based extraction script (calls the
  Claude API on a drawing image, returns structured data). Written and
  type-checked, deliberately never executed — see
  `docs/design-decisions.md`.
- **`docs/rules/`** — one write-up per rule: the physical reasoning behind
  it, exactly where its values were read on the drawing, and every
  interpretation choice made, with justification.
- **`docs/glossary.md`** — every CAD/drawing abbreviation decoded as it
  was encountered (IC, MH, TL, IL, FFL, RC, M/S, PUB, ...).
- **`docs/design-decisions.md`** — cross-cutting choices that apply to
  more than one rule (confidence scoring, the extraction-method hierarchy
  actually tried, why the vision script was never run against a real key).

## Running it

```bash
npm install
npm test         # runs every rule's tests: the rule card's own sample
                  # scenarios, plus real values read off the sample drawing
npm run typecheck # tsc --noEmit — Node runs .ts files natively (no build
                  # step), this is a separate, real type-check
npm run adjudicate # runs all 5 rules against data/plans/plan-div-sanitised4.json
                  # and prints a report
```

## Worked examples: what "documented reasoning" looks like here

**SSW 1.2.1(b)** requires an inspection chamber's top level to be at or
above the manhole it connects to (gravity flow). The sample drawing labels
both directly: IC new top level 110.460m, MH new top level 110.450m →
**compliant**, 10mm margin. Full reasoning, including the "existing vs.
new level" interpretation choice: `docs/rules/ssw-1.2.1-b-ic-mh-level.md`.

**Annex A(c)** requires a removable trench cover with a lifting feature.
The sample drawing never shows an element labelled "RC Trench" — only
"RC Sump" (a related but different element). Rather than assume the two
are interchangeable, the rule checks the element's labelled type first and
returns `NEEDS_REVIEW` if it isn't "RC Trench" — flagging the terminology
mismatch for a human, instead of guessing. Full reasoning:
`docs/rules/annex-a-c-trench-cover.md`.

**Annex A(b)** (minimum trench width) has a rule card with two internal
ambiguities — two different definitions of a formula variable, and sample
scenarios where "missing data" is scored `NON_COMPLIANT` rather than
`NEEDS_REVIEW`. Both were resolved by calculating against the rule card's
own worked numeric examples rather than guessed. Full reasoning:
`docs/rules/annex-a-b-trench-width.md`.

**SSW 1.2.4(a)** (no structure over a sewer) is the only rule that's
genuinely geometric — comparing shapes in space rather than reading a
label. Its engine (`src/geometry/distance.ts`) is built and unit-tested,
including a regression test for a real intersection-detection bug found
while building it, but was never run against real drawing geometry: no
DXF (vector CAD data) was ever obtainable in this environment. Full
reasoning: `docs/rules/ssw-1.2.4-a-no-structure-over-sewer.md`.
