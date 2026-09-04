# Write-up — AI-Enabled Compliance Review of Sewerage & Sanitary Works Plans

This is the consolidated write-up for the InnovAIte capability assessment
brief. It summarizes the thinking behind the whole exercise; the detailed
reasoning for each rule lives in `docs/rules/*.md`, cross-cutting
decisions in `docs/design-decisions.md`, and every CAD abbreviation
decoded along the way in `docs/glossary.md` — this document ties them
together rather than repeating them.

## 1. How I read the problem

The brief separates two things that are easy to conflate: a **rule
engine** (given a structured description of a drawing element, decide if
it satisfies a rule — mostly deterministic once the rule is correctly
interpreted) and an **extraction pipeline** (turning a 2D CAD drawing into
that structured description in the first place — the genuinely hard,
ambiguous part). The project is built as two separate stages connected by
a fixed data contract (`data/rules/*.json` and `data/plans/*.json` in,
`src/rules/*.evaluate()` out), so the rule engine can be trusted
independently of how good the extraction is on any given drawing — which
mattered a lot here, because extraction turned out to be the real
bottleneck.

Before writing any rule code, all five rule cards and both sample
drawings were read in full. Two things surfaced immediately:

- **Don't trust filenames to identify a rule -- read the `Rule ID` field
  inside the document instead.** Before the official "Capability Testing
  Pack" was available, a small number of individual files were received
  whose names didn't match their actual content. The official pack itself
  is internally consistent (verified directly) and every rule in this
  project is built from it; the point stands regardless: a filename was
  wrong at least once during this exercise, so the engine never keys off
  one.
- **The rule text and its own worked examples sometimes disagree with
  each other** (see Annex A(b) below). Worked numeric examples were
  treated as more reliable than prose, on the reasoning that a scenario
  with concrete numbers is less likely to contain a drafting slip than a
  formula typed out in English — but every such resolution is flagged
  explicitly rather than picked silently.

## 2. The five rules, and the judgement calls behind each

Full reasoning, drawing evidence, and traceability to code/tests for each
rule: `docs/rules/*.md`. Verdicts against both sample drawings
(`data/plans/plan-div-sanitised4.json`, the first drawing, and
`data/plans/plan-annexA-sanitised2.json`, the second):

| Rule | Drawing 1 (`(div)`) | Drawing 2 (`Annex A`) | Key judgement call |
|---|---|---|---|
| **SSW 1.2.1(b)** — IC top level vs. manhole top level | **COMPLIANT** (110.460m vs 110.450m, 10mm margin) | `NEEDS_REVIEW` (an IC exists, but no unambiguous connecting manhole — see below) | Used the drawing's *new/proposed* levels, not the existing ones, since the rule governs what will be built |
| **Annex A(a)** — backfill material | `NEEDS_REVIEW` (no "RC Trench" element) | `NEEDS_REVIEW` (an "RC Trench" exists, but no backfill material is specified anywhere on the drawing) | See the RC Trench vs. RC Sump decision below |
| **Annex A(b)** — minimum trench width | `NEEDS_REVIEW` (no "RC Trench" element) | `NEEDS_REVIEW` (width is known — 750mm — but depth/diameter/haunching are not) | Two conflicting formulas for T resolved by testing both against the rule card's own worked example (900+T=1500 only reconciles with the simple definition); missing haunching data treated as `NON_COMPLIANT` (a design failure) rather than `NEEDS_REVIEW` (an extraction failure) once pipe diameter exceeds 300mm |
| **Annex A(c)** — removable trench cover | `NEEDS_REVIEW` (no "RC Trench" element) | `NEEDS_REVIEW` (an "RC Trench" exists, but no cover is described anywhere on the drawing) | Same RC Trench vs. RC Sump decision |
| **SSW 1.2.4(a)** — no structure over sewer | `NEEDS_REVIEW` | `NEEDS_REVIEW` | The one genuinely geometric rule (shape-vs-shape, not label-vs-value) — engine built and unit-tested; real geometry extraction was investigated (not assumed possible) and found to be genuine CAD-data-reconstruction work, not a quick step (see Section 3) |

**The RC Trench vs. RC Sump decision**, made once and reused (via a
shared `requireElementType()` precondition) across Annex A(a)/(b)/(c):
Drawing 1 doesn't show an element explicitly labelled "RC Trench" with
construction details — it repeatedly shows "RC Sump w/ removable M/S
grating cover" instead. RC Trench and RC Sump are a related but
physically different element (a trench protects a *running* pipe over a
length; a sump is a *compact* collection point, and may carry different
construction standards not visible in this sample). Rather than assume
the two are interchangeable and risk a false `COMPLIANT`, every rule
specific to "RC Trench" checks the element's labelled type first and
returns `NEEDS_REVIEW` if it doesn't match — flagging the terminology
mismatch for a human rather than guessing. This was a decision made
collaboratively during the exercise (see Section 4) after weighing both
options explicitly.

Drawing 2, unlike drawing 1, *does* contain a real "RC Trench" element —
found once real DXF text search became available (see Section 3), after
an earlier screenshot-based search for it had been abandoned. It's still
`NEEDS_REVIEW` on all three Annex A rules, but for a different, more
specific reason: the callout text itself ("NEW 750MM WIDE RC TRENCH OVER
EXTG MINOR SEWER LINE **TO PE'S DETAIL**") explicitly defers the
construction specification to a separate Professional Engineer's detail
drawing that isn't part of this sample. Width (750mm) is the one value
this callout does give directly.

## 3. Reading the drawings: the real difficulty, and what was actually tried

This is the part of the exercise most representative of the real problem,
and where several genuine tooling walls were hit and worked through — all
documented rather than glossed over (full detail: `docs/design-decisions.md`,
"Extraction method hierarchy" and "DXF extraction: parser vs. targeted
search").

Four methods were tried, in order of rigor, and the outcome changed
mid-exercise as tooling was found:

1. **DXF (vector CAD data)** — at first, seemed unreachable: no CAD
   software was available besides the free Autodesk DWG TrueView viewer,
   which does not support DXF export (only DWG-version conversion and
   DWF/DWFx/PDF). **Later obtained** using **ODA File Converter**, a free
   tool from the Open Design Alliance built specifically for DWG↔DXF
   conversion — a genuinely different tool from DWG TrueView, tried after
   revisiting this limitation rather than accepting it as final. Converted
   both sample drawings successfully.
2. **PDF text extraction (mechanical, no vision)** — attempted for both
   drawings; worked (non-blank) for one, blank for the other (a
   screen-oriented plot style producing invisible colors on white paper).
   **Verified, not assumed**: even in the PDF that rendered, the extracted
   text layer does not contain the sewer/drainage annotations at all —
   confirmed by searching the extracted text for "IC"/"MH"/"T.L." and
   finding nothing, most likely because that layer uses an AutoCAD SHX
   font that rasterizes to curves on PDF export instead of embedding as
   text.
3. **Vision reading of a rendered image** — used for every value
   originally recorded for drawing 1, before DXF was available. Later
   cross-checked against the real DXF and found to match exactly (see
   below) — the manual reading was accurate, just slower and less
   reliable in principle than exact source text.
4. **DXF raw-text search** (`src/extraction/dxf-search.ts`) — once real
   DXF files existed, this became the most reliable method: exact source
   text, not a vision read of a raster image. A first attempt used a
   general-purpose DXF-parsing npm library to get a structured model of
   every entity, and was abandoned after finding it doesn't support the
   `MLEADER` entity type (where all the target callouts turned out to
   live), among other problems — see `docs/design-decisions.md` for the
   full postmortem. Replaced with a much narrower, `grep`-equivalent text
   search, which is what actually extracted every value in both
   `data/plans/*.json` files.

**Net result**: both sample drawings now have real, exact-source-text
data (`data/plans/plan-div-sanitised4.json` and
`plan-annexA-sanitised2.json`), cross-validated against the original
vision reading where both exist — every value matched exactly.

SSW 1.2.4(a) is the exception, and it's worth being precise about why,
because the reasoning changed once actually investigated rather than
assumed. The DXF files do contain `LWPOLYLINE` geometry (confirmed: 239
such entities in one drawing alone), so the first assumption was that
extracting the specific sewer-centerline and building-footprint polylines
would be a scoped, mechanical follow-up. **Investigating that directly
(with `dxf-parser`, which correctly handles `LWPOLYLINE`/`INSERT` — this
isn't the `MLEADER` problem from before) found otherwise**: the building
has no single outline at all — its walls exist as ~28 separate 4-vertex
rectangles (one per wall segment) spread across several layers, which
would need to be traced into one polygon, a real reconstruction problem.
And the one layer whose name looked right for the sewer
(`A-_SEWR----_--`) turned out to contain a single block-reference
(`INSERT`) at position `(166043907, 78733665)` — hundreds of millions of
units away from every real site coordinate elsewhere in the same file
(tens of thousands) — almost certainly a stray or mislabelled block, not
the actual sewer line. Out of 123 layers total, neither name-matching nor
the two most plausible candidates pointed at usable geometry; getting
this right would need systematic, visually-cross-referenced layer
inspection, not a quick script. The drawing shows a "1M SEWER SETBACK
LINE" and the building appears, by eye, to respect it — but "appears to,
on a screenshot" is not a computed distance, and this project does not
report a verdict it cannot actually compute.

## 4. How this was actually built: working with Claude Code

Per the brief's own terms ("any language, framework, model or third-party
service may be used, provided its use is declared") and consistent with
using generative AI tools as a normal part of software development: this
project was built in an interactive pairing session with **Claude Code**
(Anthropic's CLI coding assistant), not solo and not by delegating the
reasoning wholesale. The actual division of labor:

**What Claude did**: read the drawings (vision first, then DXF text
search once that tooling existed), wrote the TypeScript implementation of
decisions once they were made, explained CAD vocabulary and domain
concepts (inspection chambers vs. manholes, what a haunching is, what "T"
represents physically, what DXF/CAD/grep mean), and executed/verified the
mechanics (running tests, git operations, cross-checking that documented
file references actually exist on disk).

**What I did**: made every rule-interpretation judgement call, and can
defend each one — for example: verifying the Annex A(b) T-formula
ambiguity myself by computing both candidate formulas against the rule
card's worked example (2400mm vs. 1500mm) rather than accepting either
uninspected; explicitly choosing to treat the RC Sump/RC Trench mismatch
as `NEEDS_REVIEW` rather than a silent equivalence, after being walked
through both options; proposing the `requireElementType()` refactor to
avoid duplicating that same check three times, once the pattern repeated
across two rules; and directing which parts of the exercise to prioritise
(e.g. choosing not to spend real API credit finishing the vision
extraction script — see `docs/design-decisions.md`).

Also caught real problems in the *documentation itself* by pushing back
rather than accepting a written claim at face value: questioning whether
"no DXF" had actually been exhausted (leading to trying ODA File
Converter, which worked, after DWG TrueView's inability to export DXF had
been treated as final); catching several places where a limitation
scoped to "the one drawing we checked" had been written as if it applied
to "both drawings"; and catching a stale README description of a
`src/geometry/` folder that didn't exist yet at the time. Each of these
is a real correction to a document I would otherwise have signed my name
to — worth being able to describe concretely, not just claim generically
that "I reviewed the documentation."

This mirrors, deliberately, how I already work day to day — the AI
generative skills on my CV aren't decorative: this project used the same
pairing workflow, with the same expectation that I understand and can
defend every decision, not just that the code runs.

## 5. Limitations, stated proactively

- **Geometric coordinate extraction was investigated and found genuinely
  hard, not just unbuilt.** DXF is no longer the blocker (see Section 3)
  -- both drawings have real DXF files with `LWPOLYLINE` geometry in them
  -- but this drawing's building has no single outline (walls exist as
  ~28 disjoint rectangles across several layers) and the layer that
  looked like the sewer turned out to be a stray/mislabelled block
  reference at an implausible position, not the real sewer line. Getting
  this right needs real CAD-data reconstruction (resolving block
  references, tracing a building outline from fragments, visually
  cross-referencing layers), not a quick script -- confirmed by actually
  trying, not assumed from the outset.
- **The geometric rule was never tested against real drawing data**, as a
  direct consequence of the point above. Its engine is complete and
  unit-tested against synthetic coordinates (including a regression test
  for a real intersection-detection bug found while building it — see
  `docs/rules/ssw-1.2.4-a-no-structure-over-sewer.md`), ready to run the
  moment usable coordinates exist.
- **Drawing 2's "RC Trench" defers its own specification.** The one
  element in this project explicitly labelled "RC Trench" was found on
  drawing 2, but its own callout text says "TO PE'S DETAIL" — the actual
  backfill/cover/depth/diameter values live on a separate Professional
  Engineer's detail drawing not included in this sample. This isn't a
  search failure (backfill/cover/haunching vocabulary was specifically
  searched for and returned zero matches) -- the drawing set genuinely
  doesn't contain that information.
- **Drawing 2 has no unambiguous IC/MH pairing.** It has an inspection
  chamber ("EXT'G IC TO BE RETAINED AND MADE GOOD") but no "LAST IC"/"LAST
  MH" naming convention like drawing 1's, and the only nearby manhole text
  found is on a wildly different elevation scale (~2m vs. the IC's 29.5m)
  -- almost certainly unrelated. Left unpaired rather than guessed.
- **The vision-extraction API script has never been run** for real (see
  `docs/design-decisions.md` for the cost reasoning) — it's written and
  type-checked against the current Anthropic SDK's documented patterns,
  but its output has never been observed. It's also no longer the primary
  extraction path (DXF search superseded it once DXF became available),
  so this is a smaller gap than it was earlier in the project.
- **Confidence scores are hand-estimated, not calibrated** — they reflect
  extraction-method reliability (a proxy), not a measured error rate.

## 6. What I'd do differently with more time

- Try every free/open alternative tool before treating a limitation as
  final. "DWG TrueView can't export DXF" was true; "DXF is unreachable"
  wasn't — ODA File Converter, a different free tool, closed that gap
  after it had already been written up as the project's single biggest
  limitation. The lesson isn't "get DXF earlier" (which did happen, just
  later than ideal) -- it's to keep separate "this specific tool can't do
  X" from "X isn't possible," and revisit the latter before accepting it.
- Same lesson, smaller scale: the second drawing's "RC Trench" was
  abandoned as an unfindable screenshot lead, then found in seconds once
  better tooling (DXF search) existed. A documented limitation is a
  snapshot of what was true *then*, not a permanent verdict -- worth
  re-checking once the tooling that produced it has changed.
- Actually reconstruct the sewer-centerline/building-footprint geometry
  SSW 1.2.4(a) needs -- now understood to require resolving `INSERT`
  block references correctly and tracing a building outline from ~28
  disjoint wall-segment rectangles, likely cross-referenced against the
  visual drawing to identify the right layers among 123 candidates. Real
  scoped work, now that the investigation has defined what it actually
  involves, rather than a vague "wire up the coordinates" TODO.
- Get the actual "PE's detail" drawing referenced by drawing 2's RC
  Trench callout, if it exists in a fuller set -- would resolve Annex
  A(a)/(b)/(c) for that element with real data instead of `NEEDS_REVIEW`.
- Finish and actually run the vision-extraction script once a small API
  budget is justified, now specifically as a fallback for whatever DXF
  text search can't find (a value shown only graphically, with no text
  label at all), and compare its output against the DXF-confirmed values
  already recorded, to get a real (not estimated) confidence baseline.

## 7. Running it

```bash
npm install
npm test          # 23 tests: every rule against its own rule card's sample
                   # scenarios, plus real values extracted from both drawings
npm run typecheck  # tsc --noEmit -- Node runs .ts files natively, this is
                   # a separate, real type-check
npm run adjudicate # full report: all 5 rules against every drawing in
                   # data/plans/*.json
```
