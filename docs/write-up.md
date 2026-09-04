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

- **Filenames didn't match rule contents.** The rule files as originally
  received had names like `SSW 1.2.1 (b) Top level of manhole to
  inspection chamber.docx`, but that file's actual content was Annex A(c)
  (trench cover) — verified against the correctly-named copies in the
  official "Capability Testing Pack" by file size. The engine identifies a
  rule by the `Rule ID` field read from inside the document, never by
  filename.
- **The rule text and its own worked examples sometimes disagree with
  each other** (see Annex A(b) below). Worked numeric examples were
  treated as more reliable than prose, on the reasoning that a scenario
  with concrete numbers is less likely to contain a drafting slip than a
  formula typed out in English — but every such resolution is flagged
  explicitly rather than picked silently.

## 2. The five rules, and the judgement calls behind each

Full reasoning, drawing evidence, and traceability to code/tests for each
rule: `docs/rules/*.md`. Summary of the interesting decisions:

| Rule | Verdict on the real drawing | Key judgement call |
|---|---|---|
| **SSW 1.2.1(b)** — IC top level vs. manhole top level | **COMPLIANT** (110.460m vs 110.450m, 10mm margin) | Used the drawing's *new/proposed* levels, not the existing ones, since the rule governs what will be built |
| **Annex A(a)** — backfill material | `NEEDS_REVIEW` | No element labelled "RC Trench" found — see the RC Trench vs. RC Sump decision below |
| **Annex A(b)** — minimum trench width | `NEEDS_REVIEW` (untestable on this drawing) — but internal ambiguities resolved by calculation | Two conflicting formulas for T resolved by testing both against the rule card's own worked example (900+T=1500 only reconciles with the simple definition); missing haunching data treated as `NON_COMPLIANT` (a design failure) rather than `NEEDS_REVIEW` (an extraction failure) once pipe diameter exceeds 300mm |
| **Annex A(c)** — removable trench cover | `NEEDS_REVIEW` | Same RC Trench vs. RC Sump decision |
| **SSW 1.2.4(a)** — no structure over sewer | `NEEDS_REVIEW` | The one genuinely geometric rule (shape-vs-shape, not label-vs-value) — engine built and unit-tested, never run on real coordinates (no DXF) |

**The RC Trench vs. RC Sump decision**, made once and reused (via a
shared `requireElementType()` precondition) across Annex A(a)/(b)/(c):
neither sample drawing shows an element explicitly labelled "RC Trench"
with construction details — both repeatedly show "RC Sump w/ removable
M/S grating cover" instead, a related but physically different element (a
trench protects a *running* pipe over a length; a sump is a *compact*
collection point, and may carry different construction standards not
visible in this sample). Rather than assume the two are interchangeable
and risk a false `COMPLIANT`, every rule specific to "RC Trench" checks
the element's labelled type first and returns `NEEDS_REVIEW` if it
doesn't match — flagging the terminology mismatch for a human rather than
guessing. This was a decision made collaboratively during the exercise
(see Section 4) after weighing both options explicitly.

## 3. Reading the drawings: the real difficulty, and what was actually tried

This is the part of the exercise most representative of the real problem,
and where a genuine tooling wall was hit — documented rather than glossed
over (full detail: `docs/design-decisions.md`, "Extraction method
hierarchy").

Three methods were tried, in order of rigor:

1. **DXF (vector CAD data)** — never obtained. No CAD software was
   available besides the free Autodesk DWG TrueView viewer, which does
   not support DXF export (only DWG-version conversion and DWF/DWFx/PDF).
2. **PDF text extraction (mechanical, no vision)** — attempted for both
   drawings; worked (non-blank) for one, blank for the other (a
   screen-oriented plot style producing invisible colors on white paper).
   **Verified, not assumed**: even in the PDF that rendered, the extracted
   text layer does not contain the sewer/drainage annotations at all —
   confirmed by searching the extracted text for "IC"/"MH"/"T.L." and
   finding nothing, most likely because that layer uses an AutoCAD SHX
   font that rasterizes to curves on PDF export instead of embedding as
   text.
3. **Vision reading of a rendered image** — the only one of the three
   that actually works for this layer, and the method used for every
   value in `data/plans/plan-div-sanitised4.json`.

**Net result**: no machine-readable vector geometry was ever obtained for
either sample drawing. Every value in the plan data was read by eye off
zoomed screenshots — which has a direct, honest consequence: the one
purely geometric rule (SSW 1.2.4(a)) could not be evaluated against real
coordinates, even though its engine (`src/geometry/distance.ts`) is fully
built and unit-tested. The drawing shows a "1M SEWER SETBACK LINE" and the
building appears, by eye, to respect it — but "appears to, on a
screenshot" is not a computed distance, and this project does not report
a verdict it cannot actually compute.

## 4. How this was actually built: working with Claude Code

Per the brief's own terms ("any language, framework, model or third-party
service may be used, provided its use is declared") and consistent with
using generative AI tools as a normal part of software development: this
project was built in an interactive pairing session with **Claude Code**
(Anthropic's CLI coding assistant), not solo and not by delegating the
reasoning wholesale. The actual division of labor:

**What Claude did**: read the drawings (vision — extracting labelled
values off screenshots, since no CAD tooling was available), wrote the
TypeScript implementation of decisions once they were made, explained CAD
vocabulary and domain concepts (inspection chambers vs. manholes, what a
haunching is, what "T" represents physically), and executed/verified the
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

This mirrors, deliberately, how I already work day to day — the AI
generative skills on my CV aren't decorative: this project used the same
pairing workflow, with the same expectation that I understand and can
defend every decision, not just that the code runs.

## 5. Limitations, stated proactively

- **No DXF** was ever obtained for either sample drawing — the single
  biggest limitation. Exact geometric extraction (needed for SSW 1.2.4(a)
  in particular) isn't possible without it.
- **The geometric rule was never tested against real drawing data.** Its
  engine is complete and unit-tested against synthetic coordinates
  (including a regression test for a real intersection-detection bug
  found while building it — see `docs/rules/ssw-1.2.4-a-no-structure-over-sewer.md`),
  ready to run the moment real coordinates are available.
- **No "RC Trench" construction section was found anywhere in the sample
  drawings** — only "RC Sump", a related but different element. Three of
  the five rules resolve to `NEEDS_REVIEW` on this drawing specifically
  because of that gap, not because the rule logic itself is incomplete.
- **The vision-extraction API script has never been run** for real (see
  `docs/design-decisions.md` for the cost reasoning) — it's written and
  type-checked against the current Anthropic SDK's documented patterns,
  but its output has never been observed.
- **Confidence scores are hand-estimated, not calibrated** — they reflect
  extraction-method reliability (a proxy), not a measured error rate.

## 6. What I'd do differently with more time

- Get DXF (or a working, legible PDF) before writing a single line of
  rule code, rather than discovering the gap mid-exercise — this cost the
  most time in the whole exercise, more than any of the rule logic.
- With real vector geometry, extraction would change character entirely:
  find text entities near a known block reference, associate them with
  the nearest polyline/polygon on a known layer, and fall back to vision
  only when the CAD data itself is ambiguous or absent — more scalable
  and more auditable than vision-only reading.
- Resolve the RC Trench vs. RC Sump terminology question with an actual
  reviewer rather than defaulting to `NEEDS_REVIEW` — and check whether
  RC Trench cross-sections exist elsewhere in a fuller drawing set that
  simply wasn't in this sample.
- Finish and actually run the vision-extraction script once a small API
  budget is justified, and compare its output against the manual reads
  already recorded, to get a real (not estimated) confidence baseline.

## 7. Running it

```bash
npm install
npm test          # 18 tests: every rule against its own rule card's sample
                   # scenarios, plus real values read off the sample drawing
npm run typecheck  # tsc --noEmit -- Node runs .ts files natively, this is
                   # a separate, real type-check
npm run adjudicate # full report: all 5 rules against the real extracted
                   # drawing data (data/plans/plan-div-sanitised4.json)
```
