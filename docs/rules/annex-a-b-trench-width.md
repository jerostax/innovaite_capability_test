# Rule Annex A(b) — Minimum RC trench width

**Source**: Code of Practice on Sewerage and Sanitary Works, 3rd Edition (March 2025), Annex A — Requirements for Construction of RC Trench, Table 11.

## The rule (Table 11)

| Sewer depth | Pipe diameter | Minimum trench width |
|---|---|---|
| ≤ 3m | ≤ 300mm | 750mm |
| ≤ 3m | > 300mm | 900 + T |
| > 3m | all sizes | *(blank in the source document — "See Figure 2")* |

Where **T** is not an abbreviation of a word — it's a formula variable
representing the combined width of the pipe plus its concrete haunching
on both sides:

```
T = (2 x haunching thickness) + pipe nominal diameter

   |<-haunch->|<--diameter-->|<-haunch->|
              |     PIPE     |
   |<----------------- T ------------------->|
```

`900 + T` then adds a fixed 900mm working margin on top of that core
width (most likely construction/access clearance, though the rule card
doesn't state this explicitly — a physical interpretation, not a
confirmed fact).

## Two ambiguities in the rule card, both resolved by calculation against the worked examples rather than assumed

### 1. Two different definitions of T in the same document

The main table defines `T = 2 x haunching + diameter`. One "Rule
Scenario" requirement block instead writes `T = 900mm + (2 x haunching) +
diameter` — an extra "900mm +" folded into T's own definition.

**Resolved by calculation**, using Scenario 02-compliant's own numbers
(diameter 350mm, haunching 125mm, stated result 1500mm):

- Simple definition: `T = 2*125 + 350 = 600`, width `= 900 + 600 = 1500mm` — **matches**.
- Definition with extra 900: `T = 900 + 2*125 + 350 = 1500`, width `= 900 + 1500 = 2400mm` — does not match.

The simple definition is used; the scenario text's extra "900mm +" is
treated as a drafting/copy-paste error in the source document.

### 2. "Haunching not provided" scenarios are non-compliant despite the arithmetic checking out

Scenarios 02-non-compliant and 03-non-compliant both read "haunching not
provided; trench width 1250mm" and are marked **NON-COMPLIANT**. But
`900 + 2*0 + 350 = 1250mm` — the built width *exactly equals* the
zero-haunching minimum. A naive "width >= computed minimum" check would
call this compliant.

**Interpretation**: once pipe diameter exceeds 300mm, the Code requires
haunching thickness to be specified as part of the design — its absence
is not something to treat as missing data we failed to extract, it's the
design itself failing to demonstrate compliance. This is a deliberate,
generalizable departure from every other rule's default (missing input →
`NEEDS_REVIEW`) — the "our extraction failure vs. a design/documentation
failure" distinction behind it, and why it's a project-wide principle and
not a one-off exception, is in
[`design-decisions.md`](../design-decisions.md#missing-data-extraction-failure-vs-design-failure).

Diameter ≤ 300mm never needs haunching at all (flat 750mm rule), so this
distinction only matters once diameter > 300mm.

### Still open: the blank ">3m" table row

No sample scenario covers depth > 3m with diameter ≤ 300mm, so whether
the flat 750mm rule or the 900+T formula applies there is untested
against ground truth. Assumed 900+T (inherits the row above), flagged as
an assumption rather than resolved with confidence — see the rule JSON.

## Reading it off the sample drawing

File: `(DXC x PUB) 1.2.1b, 1.1.3a, 1.2.4a, 1.2.4b, 4.2.1 (div) -sanitised (4).dwg`

Same as Annex A(a)/(c): no element labelled "RC Trench" was found — only
"RC Sump". Resolves to `NEEDS_REVIEW` via the shared `requireElementType()`
gate before any width arithmetic is attempted.

## Traceability

- Rule logic: [`src/rules/annex-a-b-trench-width.ts`](../../src/rules/annex-a-b-trench-width.ts)
- Rule definition (JSON): [`data/rules/annex-a-b-trench-width.json`](../../data/rules/annex-a-b-trench-width.json)
- Tests (rule card scenarios, both ambiguities, and the RC Sump non-match case): [`tests/annex-a-b-trench-width.test.ts`](../../tests/annex-a-b-trench-width.test.ts) — run with `npm test`
