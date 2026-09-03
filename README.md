# InnovAIte Capability Test

AI-enabled compliance review of sewerage & sanitary works plans against the
*Code of Practice on Sewerage and Sanitary Works* — a capability assessment
exercise. This is not a finished, production-ready checker; it's a
proof-of-concept built one rule at a time, with the reasoning behind every
interpretation and judgement call documented alongside the code.

## Status

**2 of 5 rules implemented, tested, and documented.**

| Rule | Status |
|---|---|
| SSW 1.2.1(b) — IC top level vs. manhole top level | ✅ Done — verified against real values read off the sample drawing |
| SSW Annex A(c) — Removable trench cover | ✅ Done — resolves to `NEEDS_REVIEW` on the sample drawing (see below) |
| SSW Annex A(a) — Backfill material of RC trench | ⏳ Not started |
| SSW Annex A(b) — Minimum RC trench width | ⏳ Not started |
| SSW 1.2.4(a) — No structure over/across a sewer | ⏳ Not started |

Not yet built: a report that runs all rules against the full extracted
drawing data at once, and a consolidated write-up tying the whole
exercise together (per-rule reasoning currently lives in `docs/rules/`).

## How this project is organized

Two deliberately separate stages, connected by a fixed JSON contract:

```
READ THE DRAWING  →  structured JSON (data/plans/)  →  APPLY THE RULES (src/rules/)
     (hard, ambiguous — done by reading the drawing        (simple, deterministic —
      directly, since no DXF/CAD tooling was available)      unit-tested per rule)
```

- **`data/rules/`** — one JSON file per rule: the rule text, how it was
  interpreted, the rule card's own sample scenarios, and every open
  ambiguity or judgement call, with reasoning.
- **`src/rules/`** — one TypeScript module per rule: a pure `evaluate()`
  function, `RuleResult` in → `{ verdict, confidence, evidence, reasoning }` out.
- **`src/geometry/`** — 2D geometry helpers (point/segment/polygon
  distance, intersection) for the one rule that's genuinely spatial
  (SSW 1.2.4(a)) rather than a label/value lookup.
- **`src/extraction/`** — a vision-based extraction script (calls the
  Claude API on a drawing image, returns structured data). Written and
  type-checked, deliberately never executed — see
  `docs/design-decisions.md`.
- **`docs/rules/`** — one write-up per rule: the physical reasoning behind
  it, exactly where its values were read on the drawing, and every
  interpretation choice made, with justification.
- **`docs/glossary.md`** — every CAD/drawing abbreviation decoded as it
  was encountered (IC, MH, TL, IL, FFL, RC, M/S, ...).
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
```

## A worked example: what "documented reasoning" looks like here

Rule SSW 1.2.1(b) requires an inspection chamber's top level to be at or
above the manhole it connects to (gravity flow). The sample drawing labels
both directly: IC new top level 110.460m, MH new top level 110.450m →
**compliant**, 10mm margin. Full reasoning, including the "existing vs.
new level" interpretation choice: `docs/rules/ssw-1.2.1-b-ic-mh-level.md`.

Rule Annex A(c) requires a removable trench cover with a lifting feature.
The sample drawing never shows an element labelled "RC Trench" — only
"RC Sump" (a related but different element). Rather than assume the two
are interchangeable, the rule checks the element's labelled type first and
returns `NEEDS_REVIEW` if it isn't "RC Trench" — flagging the terminology
mismatch for a human, instead of guessing. Full reasoning:
`docs/rules/annex-a-c-trench-cover.md`.
