# Rule Annex A(a) — Backfill material of RC trench

**Source**: Code of Practice on Sewerage and Sanitary Works, 3rd Edition (March 2025), Annex A — Requirements for Construction of RC Trench.

**Full rule text**: "The RC trench shall comply with the following requirements: It shall be backfilled with sand or other approved granular material."

Approved materials (from the rule card's interpretation section): **sand,
corey dust, granite dust, gravel, crusher run, recycled aggregates**.

## Why this rule exists (physical reasoning)

Once a pipe is laid in a trench, the material packed back around it
matters for two reasons: it has to let water drain away from the pipe
rather than trap it (a loose granular material does that; ordinary dug-up
soil, especially clay-heavy soil, can trap water and cause the trench to
settle unevenly), and it has to support the pipe evenly without shifting
under load. Sand and the other approved granular materials compact
predictably and drain; plain "soil" (the rule card's own non-compliant
example) doesn't reliably do either.

## The check, in plain terms

```
IF element is not labelled "RC Trench":
    NEEDS_REVIEW  (same terminology gate as Annex A(c) — see below)
ELSE IF no backfill material is recorded:
    NEEDS_REVIEW
ELSE IF material is in {sand, corey dust, granite dust, gravel, crusher run, recycled aggregates}:
    COMPLIANT
ELSE:
    NON_COMPLIANT
```

## Reused decision: the same RC Trench vs. RC Sump gate as Annex A(c)

This rule is written against "RC Trench" specifically, exactly like
Annex A(c) — and the sample drawing has the same gap: no element is
labelled "RC Trench" anywhere, only "RC Sump". Rather than duplicate the
reasoning, this rule reuses the exact same precondition check
(`requireElementType()` in `src/rules/types.ts`), extracted into a shared
function once the second rule needed it (see the "RC Trench vs. RC Sump"
section of [`annex-a-c-trench-cover.md`](annex-a-c-trench-cover.md) for
the full reasoning behind why that gate exists at all).

## Reading it off the sample drawing

File: `(DXC x PUB) 1.2.1b, 1.1.3a, 1.2.4a, 1.2.4b, 4.2.1 (div) -sanitised (4).dwg`

The same two "RC Sump w/ removable M/S grating cover" elements as
Annex A(c). Neither is labelled "RC Trench" (fails the type gate), and —
independently — neither has any backfill material annotated on the
drawing at all (would fail the missing-data check too, if the type gate
didn't already stop it first). Two separate reasons this rule can't be
answered from this sample, either one sufficient on its own.

## Verdict

```
elementType: "RC Sump"  !=  "RC Trench"  →  NEEDS_REVIEW
(backfill material is never even checked -- the type mismatch is caught first)
```

## Traceability

- Rule logic: [`src/rules/annex-a-a-backfill.ts`](../../src/rules/annex-a-a-backfill.ts)
- Rule definition (JSON): [`data/rules/annex-a-a-backfill.json`](../../data/rules/annex-a-a-backfill.json)
- Tests (rule card scenarios + the RC Sump non-match case): [`tests/annex-a-a-backfill.test.ts`](../../tests/annex-a-a-backfill.test.ts) — run with `npm test`
