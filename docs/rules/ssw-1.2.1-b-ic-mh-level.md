# Rule SSW 1.2.1(b) — Top level of manhole to inspection chamber

**Source**: Code of Practice on Sewerage and Sanitary Works, 3rd Edition (March 2025), Chapter 1.2.
**Full rule text**: "Top levels of Sanitary Drainage System shall be higher than the top level of the manholes to which the development connects."

## Why this rule exists (physical reasoning)

Wastewater flows by gravity, not by pump, in a standard sewer connection.
For water to actually flow from a private Inspection Chamber (IC) into the
public Manhole (MH) it connects to, the IC's top level cannot sit lower
than the MH's — otherwise the connection would need to push water uphill.

In practice the rule allows **equal** levels too (not just strictly
higher) — see Figure 02 in the rule card, and Scenario 01-Compliant-2.

## The check, in plain terms

```
IF inspection_chamber.top_level >= manhole.top_level:
    COMPLIANT
ELSE:
    NON_COMPLIANT
```

## Reading it off drawing 1

File: `(DXC x PUB) 1.2.1b, 1.1.3a, 1.2.4a, 1.2.4b, 4.2.1 (div) -sanitised (4).dwg`

Two annotated callout boxes near the property boundary give both values
directly (see [glossary.md](../glossary.md) for `IC`/`MH`/`TL` definitions).
Originally read from a zoomed screenshot; later cross-checked against a
real DXF (converted from the source DWG via ODA File Converter, see
`docs/design-decisions.md`) using `src/extraction/dxf-search.ts` — the
exact source text matches every value below, so the original manual
reading is now confirmed, not just assumed accurate:

| Element | Callout on drawing | Existing TL | New (proposed) TL |
|---|---|---|---|
| Inspection Chamber | "EXG'T LAST IC (TL TO BE TOPPED UP)" | 110.230 | **110.460** |
| Manhole | "EXG'T LAST MH (TL TO BE TOPPED UP TO MATCH FFL)" | 110.160 | **110.450** |

**Interpretation choice**: both elements have an *existing* level and a
*new/proposed* level (the drawing shows the chamber is being "topped up").
We used the **new** levels, because the rule is about the condition the
development will actually be built in, not its current as-found state.
This isn't spelled out explicitly in the rule text — it's an assumption,
noted here rather than applied silently.

## Reading it off drawing 2

File: `(DXC x PUB) 1.2.1b, 1.1.3a, 1.1.3 (bii), Annex A - sanitised (2).dwg`

This drawing has an inspection chamber ("EXT'G IC TO BE RETAINED AND MADE
GOOD", T.L. 29.500m), but no "LAST IC"/"LAST MH" naming convention like
drawing 1's to identify which manhole it connects to. The only nearby
manhole text found ("EXISTING MH (SEW)", with GIS IDs) is on a
completely different elevation scale (~2.0–2.2m, versus this IC's
29.500m) — almost certainly an unrelated reference, not the connecting
manhole. Rather than guess a pairing from proximity alone,
`manholeTopLevel_m` is left `null`.

## Verdict

```
Drawing 1: 110.460 (IC, new) >= 110.450 (MH, new)  →  COMPLIANT
           margin: 10mm
Drawing 2: IC found (T.L. 29.500m), no confirmed connecting manhole → NEEDS_REVIEW
```

## Traceability

- Rule logic: [`src/rules/ssw-1-2-1-b-ic-mh-top-level.ts`](../../src/rules/ssw-1-2-1-b-ic-mh-top-level.ts)
- Rule definition (JSON): [`data/rules/ssw-1-2-1-b-ic-mh-top-level.json`](../../data/rules/ssw-1-2-1-b-ic-mh-top-level.json)
- Tests (rule card scenarios + the real drawing values above): [`tests/ssw-1-2-1-b.test.ts`](../../tests/ssw-1-2-1-b.test.ts) -- run with `npm test`
