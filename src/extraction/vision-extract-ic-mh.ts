// Vision-based extraction for rule SSW 1.2.1(b) - reads a drawing image and
// returns the top levels of a paired Inspection Chamber (IC) and Manhole (MH),
// ready to feed straight into src/rules/ssw-1-2-1-b-ic-mh-top-level.ts.
//
// SUPERSEDED as the primary extraction path: at the time this was written,
// DXF was unobtainable and PDF text extraction was verified to NOT contain
// this drawing layer's annotations -- vision was the only method tried
// that could read this layer at all. That has since changed: real DXF
// files now exist for both sample drawings (via ODA File Converter), and
// src/extraction/dxf-search.ts reads their exact source text -- including
// this exact IC/MH data -- more reliably and for free (no API cost). See
// docs/design-decisions.md, "Extraction method hierarchy" and "DXF
// extraction: parser vs. targeted search", for the full history.
//
// Still a legitimate, documented fallback for whatever DXF text search
// can't cover: a drawing with no DXF available at all, or a value that's
// only shown graphically (e.g. read off a dimension line) with no text
// label a text search could ever find.
//
// NOT EXECUTED as part of this project (see docs/design-decisions.md,
// "Why the vision extraction script was not run") -- it compiles and
// type-checks against the current Anthropic TS SDK's documented API shape,
// but has never been run against a real API key.
//
// To run for real: set ANTHROPIC_API_KEY, then
//   node src/extraction/vision-extract-ic-mh.ts path/to/plan-crop.png

import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { IcMhPair } from "../rules/ssw-1-2-1-b-ic-mh-top-level.ts";

// Mirrors IcMhPair (src/rules/ssw-1-2-1-b-ic-mh-top-level.ts), plus fields a
// human reviewer needs to sanity-check the read: which callout box each
// value came from, and the model's own confidence that it found the right
// labelled pair rather than an unrelated chamber/manhole on the drawing.
const IcMhExtractionSchema = z.object({
  inspectionChamberTopLevel_m: z
    .number()
    .nullable()
    .describe("The IC's proposed/new top level in metres, or null if not found on the drawing."),
  manholeTopLevel_m: z
    .number()
    .nullable()
    .describe("The MH's proposed/new top level in metres, or null if not found on the drawing."),
  icCalloutText: z
    .string()
    .describe("The exact text of the callout box the IC value was read from, verbatim."),
  mhCalloutText: z
    .string()
    .describe("The exact text of the callout box the MH value was read from, verbatim."),
  extractionConfidence: z
    .number()
    .min(0)
    .max(1)
    .describe("0-1: how sure the model is these two callouts are the correct, connected IC/MH pair."),
});

const EXTRACTION_PROMPT = `You are reading a Singapore sewerage/sanitary works drawing (an
"Inspection Chamber" [IC] connecting to a "Manhole" [MH] on the public sewer).

Find the callout box for the LAST inspection chamber before the public
connection (often labelled "EXG'T LAST IC" or "EXT'G LAST IC") and the
callout box for the manhole it connects to (often labelled "EXG'T LAST MH"
or "EXT'G LAST MH"). Both spellings ("EXG'T" and "EXT'G") mean "existing"
and can appear on the same drawing.

Each callout typically lists both an existing top level ("EXT'G T.L.") and
a proposed/new top level ("NEW T.L."). Extract the NEW (proposed) top level
for each -- that is the condition the rule (SSW 1.2.1(b)) actually governs,
since it is what will be built. If a callout has only one T.L. value with no
"existing vs new" distinction, use that value and note it in the callout text.

If you cannot confidently find both a labelled IC and its connecting MH, set
the corresponding field(s) to null rather than guessing -- a human should
review a page where this can't be read cleanly, per this project's design
(see docs/design-decisions.md, "needsReview" over guessing).`;

export async function extractIcMhPair(imagePath: string): Promise<IcMhPair> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

  const imageData = readFileSync(imagePath).toString("base64");
  const mediaType = imagePath.endsWith(".jpg") || imagePath.endsWith(".jpeg")
    ? "image/jpeg"
    : "image/png";

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageData } },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(IcMhExtractionSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("Extraction failed: model response did not match the expected schema.");
  }

  console.log(`[extraction] IC callout: "${parsed.icCalloutText}"`);
  console.log(`[extraction] MH callout: "${parsed.mhCalloutText}"`);
  console.log(`[extraction] confidence: ${parsed.extractionConfidence}`);

  return {
    inspectionChamberTopLevel_m: parsed.inspectionChamberTopLevel_m,
    manholeTopLevel_m: parsed.manholeTopLevel_m,
  };
}

// CLI entry point: `node src/extraction/vision-extract-ic-mh.ts <image>`
// `file://${argv[1]}` breaks on Windows (backslashes, no leading slash) --
// pathToFileURL() builds a correct file: URL on every platform. Caught
// while wiring up src/adjudicate.ts's own copy of this same pattern; see
// docs/design-decisions.md.
import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error("Usage: vision-extract-ic-mh.ts <path-to-drawing-crop.png>");
    process.exit(1);
  }
  const pair = await extractIcMhPair(imagePath);
  console.log(JSON.stringify(pair, null, 2));
}
