# Write-up — AI-Enabled Compliance Review of Sewerage & Sanitary Works Plans

This is the short write-up for the InnovAIte capability assessment brief.
Detailed reasoning lives elsewhere so this can stay short: per-rule
reasoning in `docs/rules/*.md`, cross-cutting decisions in
`docs/design-decisions.md`, CAD vocabulary in `docs/glossary.md`.

## 1. How I read the problem

The brief separates two things easy to conflate: a **rule engine** (given
structured data, decide if it satisfies a rule — mostly deterministic)
and an **extraction pipeline** (turning a 2D CAD drawing into that
structured data — the genuinely hard, ambiguous part). The project is
built as two stages connected by a fixed data contract (`data/*.json` in,
`src/rules/*.evaluate()` out), so the rule engine stays trustworthy
independent of how good extraction is on any given drawing — which
mattered, since extraction turned out to be the real bottleneck.

Two things surfaced immediately on reading the materials: some rule files
received before the official pack was available had names that didn't
match their content (the official pack itself is consistent — the engine
identifies a rule by its internal `Rule ID`, never by filename), and the
rule cards' own prose sometimes disagrees with their own worked examples
(see Annex A(b) below — worked numbers were trusted over prose).

## 2. The five rules — results on both sample drawings

Full reasoning and traceability per rule: `docs/rules/*.md`.

| Rule | Drawing 1 (`(div)`) | Drawing 2 (`Annex A`) |
|---|---|---|
| **SSW 1.2.1(b)** — IC vs. manhole level | **COMPLIANT** (110.460m vs 110.450m) | `NEEDS_REVIEW` — IC found, no unambiguous connecting manhole |
| **Annex A(a)** — backfill material | `NEEDS_REVIEW` — no "RC Trench" element | `NEEDS_REVIEW` — RC Trench found, backfill not specified |
| **Annex A(b)** — minimum trench width | `NEEDS_REVIEW` — no "RC Trench" element | `NEEDS_REVIEW` — width known (750mm), depth/diameter not |
| **Annex A(c)** — removable trench cover | `NEEDS_REVIEW` — no "RC Trench" element | `NEEDS_REVIEW` — RC Trench found, cover not specified |
| **SSW 1.2.4(a)** — no structure over sewer | `NEEDS_REVIEW` | `NEEDS_REVIEW` — the one geometric rule; see Section 3 |

Two judgement calls worth naming: **RC Trench vs. RC Sump** — drawing 1
only shows "RC Sump" elements, a related but different thing from the
"RC Trench" every Annex A rule is written against, so those rules gate on
the element's labelled type and return `NEEDS_REVIEW` rather than assume
equivalence (full reasoning: `docs/design-decisions.md`). And **drawing
2's one real "RC Trench"** ("NEW 750MM WIDE RC TRENCH ... TO PE'S
DETAIL") explicitly defers its own construction spec to a separate
engineer's detail drawing not in this sample — width is the only value it
gives directly.

## 3. Reading the drawings: what was actually tried

Four methods, in order of rigor, with the outcome changing mid-exercise
as tooling was found (full story, including two real dead ends: an npm
DXF-parsing library and a first geometry-extraction attempt — both in
`docs/design-decisions.md`):

1. **DXF** — seemed unreachable (no CAD software, and the free DWG
   TrueView viewer doesn't export it), until **ODA File Converter**, a
   different free tool, converted both drawings successfully.
2. **PDF text extraction** — worked for one drawing, blank for the other;
   even where it worked, verified the sewer-annotation layer isn't in the
   extracted text at all (likely an AutoCAD SHX font issue).
3. **Vision reading** of screenshots — used for drawing 1 before DXF
   existed; later cross-checked against the real DXF and matched exactly.
4. **DXF raw-text search** (`src/extraction/dxf-search.ts`) — once real
   DXF existed, this became the reliable method and is what actually
   extracted every value in both `data/plans/*.json` files.

SSW 1.2.4(a) needs coordinates, not text, so text search doesn't cover
it. Investigating geometry extraction directly (not assuming it'd be
easy) found real obstacles: drawing 1's building has no single outline
(walls exist as ~28 disjoint rectangles), and the layer named like the
sewer turned out to be a stray, mislabelled block reference at an
implausible position. Real CAD-data reconstruction work, not a quick
follow-up — detail in `docs/rules/ssw-1.2.4-a-no-structure-over-sewer.md`.

## 4. How this was built: working with Claude Code

Per the brief's own terms (tool use may be declared) and how I already
work day to day: built in an interactive pairing session with Claude
Code, not solo. **Claude** read the drawings (vision, then DXF search),
wrote the implementation once decisions were made, and explained CAD
vocabulary. **I** made every interpretation judgement call and can defend
each — e.g. verifying the Annex A(b) formula ambiguity myself by
computing both candidates against the rule card's own numbers, and
proposing the `requireElementType()` refactor once the same check
repeated across two rules. I also caught real problems in the
documentation itself by pushing back rather than accepting claims at face
value — including whether "no DXF" had really been exhausted (it hadn't)
and an inaccurate write-up claim about which specific file was mislabeled
(traced to source and corrected). Full account: `docs/design-decisions.md`.

## 5. Limitations, stated proactively

- Geometric coordinate extraction for SSW 1.2.4(a) was investigated and
  found genuinely hard (see Section 3), not just unbuilt.
- Drawing 2's "RC Trench" defers its own spec to a document not included
  in this sample — not a search failure, the data genuinely isn't here.
- Drawing 2 has no unambiguous IC/MH pairing — left unpaired, not guessed.
- The vision-extraction script has never been run against the real API
  (cost reasoning in `docs/design-decisions.md`); no longer the primary
  extraction path anyway.
- Confidence scores are hand-estimated per rule, not calibrated by
  extraction method.

## 6. What I'd do differently with more time

- Try every free/open tool before calling a limitation final — ODA File
  Converter closed a gap already written up as the project's biggest.
- Re-check earlier abandoned leads once tooling improves — drawing 2's
  RC Trench was given up on once, then found in seconds later.
- Actually reconstruct the sewer/building geometry SSW 1.2.4(a) needs,
  now that the investigation has defined what that actually involves.
- Track down the "PE's detail" drawing drawing 2's RC Trench defers to.
- Run the vision-extraction script once a small API budget is justified,
  as a fallback for whatever DXF search can't find.

## 7. Running it

```bash
npm install
npm test          # 23 tests: rule-card scenarios + real drawing values
npm run typecheck  # tsc --noEmit -- separate, real type-check
npm run adjudicate # all 5 rules against every drawing in data/plans/*.json
```
