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

Neither sample drawing shows an element explicitly labelled **"RC Trench"**
with cover details. What both drawings repeatedly show instead is an
**"RC Sump w/ removable M/S grating cover"** — see
[glossary.md](../glossary.md) for what RC, M/S, and grating mean.

An RC Trench and an RC Sump are physically different things: a trench is a
long, narrow channel that protects a *running* pipe over a length; a sump
is a compact pit that collects water at a *single point*. They may be
governed by different construction standards that aren't visible from this
sample.

**Two options were considered:**

- **Treat RC Sump as equivalent to RC Trench for this rule** — same
  underlying logic applies (top access, removable cover with lifting
  feature), so evaluate the sump's grating cover against the rule directly.
- **Flag the terminology mismatch and stop** — the rule's title and text
  are specific to "trench", and this exercise is explicitly about three
  Annex A rules that together describe RC Trench *construction* as a
  coherent whole. Substituting a different element type is an assumption
  the rule engine shouldn't make silently.

**Decision: the second option.** The rule engine checks the element's
labelled type before evaluating anything about its cover — if it isn't
"RC Trench", the verdict is `NEEDS_REVIEW`, regardless of how compliant
the cover itself looks. This matches the brief's own guidance: *flag
uncertainty for human review rather than overclaim.* A false `COMPLIANT`
built on a guessed equivalence is worse than an honest "couldn't confirm
this rule applies here."

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
