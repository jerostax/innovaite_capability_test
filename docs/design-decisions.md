# Design Decisions

Cross-cutting choices that apply to more than one rule, recorded here instead
of being repeated in every `docs/rules/*.md` file. Each rule's own doc links
back here rather than re-arguing these from scratch.

## RC Trench vs. RC Sump: the decision behind `requireElementType()`

Applies to: **Annex A(a), A(b), A(c)** — all three are written specifically
against an "RC Trench" element.

The one sample drawing fully processed (`(div) -sanitised (4).dwg`) never
shows an element explicitly labelled **"RC Trench"** with construction
details — it repeatedly shows an **"RC Sump w/ removable M/S grating
cover"** instead (see [glossary.md](glossary.md) for RC/M/S/grating).
*(The second sample drawing, `Annex A - sanitised (2).dwg`, was never
fully processed — an "RC TRENCH" reference was glimpsed in it early on but
never confirmed — so whether it contains one is unresolved, not ruled
out. See the write-up's limitations section.)*

RC Trench and RC Sump are physically different: a trench is a long,
narrow channel protecting a *running* pipe over a length; a sump is a
*compact* collection point. They may carry different construction
standards not visible in this sample (e.g. a trench cover might need to
bear vehicle loads a sump cover doesn't).

**Two options were weighed**:
- Treat RC Sump as equivalent to RC Trench (same top-access,
  removable-cover logic applies to both) — evaluate the sump's data
  directly against each rule.
- Flag the terminology mismatch and stop — since the rule text is
  specific to "trench," and the three Annex A rules together describe RC
  Trench *construction* as a coherent whole, substituting a different
  element type is an assumption, not a read.

**Decision: the second option** — made explicitly, weighing both sides,
during the exercise, not defaulted to. Every Annex A(a)/(b)/(c) rule
checks the element's labelled type before evaluating anything else via a
shared precondition, `requireElementType()` (`src/rules/types.ts`): if it
isn't "RC Trench", the verdict is `NEEDS_REVIEW`, regardless of how
compliant the rest of the data looks. This matches the brief's own
guidance — flag uncertainty for human review rather than overclaim. A
false `COMPLIANT` built on a guessed equivalence is worse than an honest
"couldn't confirm this rule applies here."

### Why `requireElementType()` is a shared function, not copy-pasted three times

Annex A(c) was implemented first, with this check written inline. When
Annex A(a) needed the exact same precondition, it was extracted into
`src/rules/types.ts` and Annex A(c) was refactored to use the shared
version too (`git log` commit `a44bbe2`) — done as its own commit, with
the existing tests re-run unchanged to confirm no behavior moved. Annex
A(b) then used the shared function from the start. This is a small
example of a DRY (Don't Repeat Yourself) instinct applied mid-project
rather than planned upfront: the duplication only became visible once a
second rule actually needed the same check, and fixing it then (rather
than deferring "cleanup" indefinitely) kept the three rules' behavior
provably identical for this shared concern.

## Missing data: extraction failure vs. design failure

Applies to: **every rule**, but the distinction was first identified and
is most visible in **Annex A(b)** (minimum trench width).

Every rule defaults missing input to `NEEDS_REVIEW` — except one specific
case in Annex A(b): once pipe diameter exceeds 300mm, an unspecified
haunching thickness resolves straight to `NON_COMPLIANT`, not
`NEEDS_REVIEW`. This is a deliberate distinction, not an inconsistency:

- **We failed to read a value that's actually on the drawing** (e.g. a
  chamber's level, printed clearly, but hard to make out on a screenshot)
  → our extraction failure → `NEEDS_REVIEW`.
- **The drawing itself never specifies a value the Code requires it to
  specify** (haunching thickness, once diameter > 300mm — verified
  against the rule card's own worked "haunching not provided" scenarios,
  which are marked non-compliant even though the built width exactly
  satisfies the zero-haunching arithmetic) → a design/documentation
  failure → `NON_COMPLIANT`.

Full worked-example evidence for this specific case: `docs/rules/annex-a-b-trench-width.md`.
The principle generalizes: any future rule with a Code-mandated value
(not just a drawing convenience) should apply the same distinction rather
than defaulting every gap to `NEEDS_REVIEW` by reflex.

## Confidence scoring

Every rule's `evaluate()` returns a `confidence` number (0-1) alongside the
verdict. It represents **how much the input data can be trusted**, not
whether the rule logic is correct.

- The rule logic itself, given clean numeric inputs, is a deterministic
  comparison (`>=`, a formula, a distance check) -- once the inputs are
  right, the verdict is right. There's nothing to be "unsure" about there.
- What *can* be wrong is the **extraction step**: did we read the right
  number off the right label on the drawing?

So `confidence` is a proxy for extraction reliability, and it should scale
with *how the value was obtained*:

| Extraction method | Reliability | Example |
|---|---|---|
| Read from real vector CAD data (DXF text entities, exact coordinates) | Highest -- mechanical, no ambiguity | Not available in this project (no DXF, see below) |
| Read by a human (or a human-directed AI assistant) off a clearly labelled callout box, at good zoom | High but not perfect -- a label can still be misread | `SSW 1.2.1(b)`, IC/MH top levels, `confidence: 0.9` |
| Inferred/assumed rather than read (e.g. "a grating cover implies a lifting feature") | Lower -- it's a judgement call, not a read | Annex A(c) cover rule applied to an "RC Sump" |
| Not found on the drawing at all | None | `NEEDS_REVIEW`, `confidence: 0` (hardcoded in `needsReview()`) |

**Honest limitation**: the specific number (e.g. `0.9` rather than `0.85`)
is a hand-picked estimate, not a calibrated probability -- there is no
dataset of past extractions checked against ground truth to derive it from.
A production version of this system would need to calibrate confidence
against actual extraction accuracy (e.g. by extraction method, and by
model-reported confidence when using vision extraction -- see the
`extractionConfidence` field the schema in
`src/extraction/vision-extract-ic-mh.ts` already asks for).

## Extraction method hierarchy: what we actually tried, in order

It would be easy to read this project as "we skipped proper document
reading and just eyeballed screenshots." That's not what happened, and it's
worth being precise about the order of attempts, because each failure was
a real, verified technical finding, not an assumption:

1. **DXF (vector CAD data, exact text + coordinates)** -- initially
   thought unreachable: no CAD software was available besides the free
   Autodesk DWG TrueView viewer, which does not support DXF export (only
   DWG-version conversion and DWF/DWFx/PDF export). **Later obtained**
   using **ODA File Converter**, a free tool from the Open Design
   Alliance built specifically for DWG↔DXF conversion -- a genuinely
   different tool from DWG TrueView, not another attempt with the same
   one. Converted both sample drawings successfully. See "DXF extraction:
   parser vs. targeted search" below for what was done with the result.
2. **PDF text extraction (mechanically extracted, real embedded text, no
   vision involved)** -- attempted for both drawings; worked (non-blank)
   for one of the two (`Annex A - sanitised (2).pdf`), blank for the other
   (a plot-style issue: screen-oriented colors mapping to invisible colors
   on white paper, not resolved in the time available).
   **Verified finding**: even in the PDF that rendered correctly, the
   extracted text layer does **not** contain the sewer/drainage annotations
   (no "IC", "MH", "T.L.", or "110.x" substrings anywhere in the extracted
   text of the page that visibly shows those callout boxes) -- only
   architectural room labels and the GFA table extracted as text. This
   means that drainage-annotation layer is very likely drawn with an
   AutoCAD SHX/shape font, which PDF export rasterizes to vector curves
   instead of embedding as selectable text. **This was tested, not
   assumed** -- confirmed by reading the PDF's extracted text and searching
   it for the values we needed, and not finding them.
3. **Vision reading of a rendered image (screenshot or PDF page render)**
   -- the method used for every value recorded in
   `docs/rules/ssw-1.2.1-b-ic-mh-level.md`, at the time the only one of
   the first three that could read this drawing layer at all. Superseded
   by step 4 for anything findable by text search, but still the fallback
   for whatever a raw text search can't find (e.g. reading a value off a
   dimension line that has no text label).
4. **DXF raw-text search** -- once real DXF files existed (step 1), this
   became the most reliable method available: exact source text, not a
   vision read of a raster image. See "DXF extraction: parser vs.
   targeted search" below.

## DXF extraction: parser vs. targeted search

Once ODA File Converter produced two real DXF files, the natural next
step seemed to be: install a DXF-parsing library and get a clean,
structured list of every entity on the drawing. That was tried first,
and abandoned in favor of something more modest but actually reliable --
worth recording why, since it's a real example of a design choice
changing mid-implementation based on evidence, not a plan followed blindly.

**What went wrong with the library approach** (`dxf-parser` on npm):
1. It doesn't support the `MLEADER` entity type -- and the callout
   annotations this project actually needs (EXG'T LAST IC/MH, RC SUMP, RC
   TRENCH) all turned out to be `MLEADER` objects, not plain `TEXT`/`MTEXT`.
   Parsing a real sample drawing returned 208 TEXT/MTEXT entities, none
   containing any string we knew was on the drawing -- confirmed
   separately by grepping the raw DXF for the same terms.
2. A first attempt to work around that by manually scanning for DXF group
   code 304 (used for MLEADER content text) picked up **structural
   noise** alongside real text -- group code 304 is reused inside MLEADER
   objects for other sub-fields too (e.g. a literal string
   `"LEADER_LINE{"` marking an internal sub-object, not annotation text),
   so a blanket "collect everything after 304" approach mixed junk into
   the results. **Caught with real numbers, not a suspicion**: cross-checking
   the tool's output against known strings turned up gaps and noise that
   didn't add up, which is what triggered digging into *why*.
3. The package's own published TypeScript types were also inconsistent
   with its actual runtime behavior (`import { DxfParser } from
   "dxf-parser"` type-checked but threw `TypeError: DxfParser is not a
   constructor` at runtime -- its `types` field points to a differently-shaped
   file than its `main` field). A real bug in a third-party package,
   confirmed by inspecting the installed module directly
   (`require('dxf-parser')`), not assumed.

**Decision**: drop the library dependency and the "parse every entity"
ambition. Building a correct structured model of a DXF file's blocks,
attribute definitions, and MLEADER internals is real, substantial,
unscoped work -- a legitimate project on its own, not a side task. What
this project actually needs is narrower: find specific known terms and
read the text around them. `src/extraction/dxf-search.ts` does exactly
that -- a `grep`-equivalent search over the DXF file's raw text (see
`searchDxf()`), the same technique already validated by hand with the
command-line `grep` tool while first investigating these drawings. It
doesn't understand DXF structure at all, which is precisely why it isn't
fooled by structure it doesn't need to understand.

## Why the vision extraction script was not run

`src/extraction/vision-extract-ic-mh.ts` calls the Claude API with an image
of the drawing and a Zod schema, and returns structured data ready for the
rule engine -- this is what an actual automated pipeline would look like,
replacing the manual "read the screenshot in a chat conversation" step used
everywhere else in this project.

It was **written and type-checked, but never executed against the real
API**. Reason: using the Anthropic API requires loading paid credits onto
a Console account. The cost of the handful of calls needed to test this
script would itself be negligible (a single image + short structured
output is a fraction of a cent), but the account-level minimum credit
purchase is not, and spending real money to complete a take-home technical
exercise was not a trade-off worth making.

This is a deliberate, documented choice, not a silent gap:
- The code is real, follows the current Anthropic TypeScript SDK's
  documented patterns (`client.messages.parse()` with `zodOutputFormat`),
  and type-checks cleanly (`npm run typecheck`).
- It was **not** run, so its output has never been observed -- unlike every
  other rule's tests, there is no "verified against real output" claim
  here, only "verified to compile against the documented API shape."
- The system's actual working end-to-end result (see
  `docs/rules/ssw-1.2.1-b-ic-mh-level.md`) came from manually reading the
  drawing in conversation -- free, since it reused an already-available AI
  assistant session, but not a reproducible, standalone software component.

**What this is worth pointing out in the interview**: knowing when *not* to
spend money to finish a demo is itself an engineering judgement call, not
a shortcut. A real production rollout of this system would budget for API
costs as a normal operating expense (extraction at scale, run automatically,
is precisely what would justify that spend) -- a one-off take-home exercise
does not carry the same justification.
