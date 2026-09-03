# Design Decisions

Cross-cutting choices that apply to more than one rule, recorded here instead
of being repeated in every `docs/rules/*.md` file.

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

1. **DXF (vector CAD data, exact text + coordinates)** -- never obtained.
   No CAD software was available in the environment besides the free
   Autodesk DWG TrueView viewer, which does not support DXF export (only
   DWG-version conversion and DWF/DWFx/PDF export). This is the format
   that would make extraction closest to mechanical/exact; its absence is
   the single biggest limitation of this project.
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
   -- the method that actually worked, and the one used for every value in
   `data/plans/plan-div-sanitised4.json` and
   `docs/rules/ssw-1.2.1-b-ic-mh-level.md`. Given step 2's verified result,
   this wasn't a shortcut taken instead of "real" document reading -- it
   was the only method of the three that could actually read this specific
   layer of these specific drawings.

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
