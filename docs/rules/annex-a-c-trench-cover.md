# Rule Annex A(c) — Provision of removable trench cover

**Source**: Code of Practice on Sewerage and Sanitary Works, Annex A — Requirements for Construction of RC Trench. **2nd Edition (January 2019)** — note this rule card cites an older edition than the other two Annex A rules, both of which cite the 3rd Edition (March 2025). Possible sign this rule wasn't carried forward/updated, or the card is stale. Flagged for the reviewer rather than assumed either way.

**Full rule text**: "Access into the trench shall be from the top of the trench. The trench shall be covered with removable slabs or other hard covers with lifting feature."

## Why this rule exists (physical reasoning)

Two separate safety/maintenance requirements bundled into one rule:

1. **Top access only** — the trench must be reachable from above, not from the side or end, so maintenance doesn't require digging elsewhere.
2. **Removable cover with a lifting feature** — not just "can be removed" but removable *safely and repeatably*. Weight is part of it (concrete/steel covers are heavy), but the real reason for requiring a dedicated lifting feature (a handle, a lug, an eye) is that without one, a worker has no safe way to grip and lift the cover — they'd resort to prying it up with an improvised tool, risking injury or a dropped cover.

## The check, in plain terms

```
IF element is not labelled "RC Trench":
    NEEDS_REVIEW  (this rule may not even apply — see the decision below)
ELSE IF no cover is present:
    NON_COMPLIANT
ELSE IF cover is not (removable AND has a lifting feature):
    NON_COMPLIANT
ELSE:
    COMPLIANT
```

## The RC Trench vs. RC Sump decision

This rule is one of three (with Annex A(a)/(b)) gated on the element
being labelled "RC Trench" — full reasoning, the options weighed, and why
the sample drawing's "RC Sump" elements don't qualify:
[`design-decisions.md`](../design-decisions.md#rc-trench-vs-rc-sump-the-decision-behind-requireelementtype).

## Reading it off the sample drawing

File: `(DXC x PUB) 1.2.1b, 1.1.3a, 1.2.4a, 1.2.4b, 4.2.1 (div) -sanitised (4).dwg`

Two elements found, both labelled the same way:

| Element | Label on drawing | Cover described |
|---|---|---|
| Sump near boundary/discharge point | "OUTLINE OF NEW RC SUMP W/ REMOVABLE M/S GRATING COVER" | Present, removable (grating), lifting feature not explicitly drawn but inferred from "removable" |
| Sump near grid point 1/E | "OUTLINE OF RC SUMP W/ REMOVABLE M/S GRATING COVER" | Same as above |

Neither is labelled "RC Trench". Both resolve to `NEEDS_REVIEW` per the
decision above — the cover data was never even evaluated, because the
element-type check stops first.

## Verdict

```
elementType: "RC Sump"  !=  "RC Trench"  →  NEEDS_REVIEW
(the cover itself is never checked -- the type mismatch is caught first)
```

## Traceability

- Rule logic: [`src/rules/annex-a-c-trench-cover.ts`](../../src/rules/annex-a-c-trench-cover.ts)
- Rule definition (JSON): [`data/rules/annex-a-c-trench-cover.json`](../../data/rules/annex-a-c-trench-cover.json)
- Tests (rule card scenarios + the RC Sump non-match case): [`tests/annex-a-c-trench-cover.test.ts`](../../tests/annex-a-c-trench-cover.test.ts) — run with `npm test`
