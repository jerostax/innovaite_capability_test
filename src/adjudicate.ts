import * as backfillRule from "./rules/annex-a-a-backfill.ts";
import * as widthRule from "./rules/annex-a-b-trench-width.ts";
import * as coverRule from "./rules/annex-a-c-trench-cover.ts";
import * as icMhRule from "./rules/ssw-1-2-1-b-ic-mh-top-level.ts";
import * as sewerSetbackRule from "./rules/ssw-1-2-4-a-no-structure-over-sewer.ts";
import type { RuleResult } from "./rules/types.ts";
import type { TrenchBackfillElement } from "./rules/annex-a-a-backfill.ts";
import type { TrenchWidthElement } from "./rules/annex-a-b-trench-width.ts";
import type { TrenchCoverElement } from "./rules/annex-a-c-trench-cover.ts";
import type { IcMhPair } from "./rules/ssw-1-2-1-b-ic-mh-top-level.ts";
import type { SewerSetbackCheck } from "./rules/ssw-1-2-4-a-no-structure-over-sewer.ts";

// Runs all 5 rules against one extracted-drawing JSON file (data/plans/*.json)
// and prints a report. Each drawing element only goes through the rule(s)
// that actually apply to its type -- a trench-shaped element never gets
// pushed through the IC/MH or geometry rule, and vice versa.

interface TrenchInput extends TrenchBackfillElement, TrenchWidthElement, TrenchCoverElement {
  id: string;
}

interface Drawing {
  id: string;
  icMhPairs?: Array<IcMhPair & { id: string }>;
  trenches?: TrenchInput[];
  buildingVsSewerChecks?: Array<SewerSetbackCheck & { id: string }>;
}

function adjudicateTrench(trench: TrenchInput): Array<{ ruleId: string } & RuleResult> {
  return [
    { ruleId: backfillRule.ruleId, ...backfillRule.evaluate(trench) },
    { ruleId: widthRule.ruleId, ...widthRule.evaluate(trench) },
    { ruleId: coverRule.ruleId, ...coverRule.evaluate(trench) },
  ];
}

export function adjudicateDrawing(drawing: Drawing) {
  const results: Array<{ elementId: string; elementType: string; verdicts: Array<{ ruleId: string } & RuleResult> }> = [];

  for (const trench of drawing.trenches ?? []) {
    results.push({ elementId: trench.id, elementType: "trench", verdicts: adjudicateTrench(trench) });
  }
  for (const pair of drawing.icMhPairs ?? []) {
    results.push({
      elementId: pair.id,
      elementType: "icMhPair",
      verdicts: [{ ruleId: icMhRule.ruleId, ...icMhRule.evaluate(pair) }],
    });
  }
  for (const check of drawing.buildingVsSewerChecks ?? []) {
    results.push({
      elementId: check.id,
      elementType: "buildingVsSewer",
      verdicts: [{ ruleId: sewerSetbackRule.ruleId, ...sewerSetbackRule.evaluate(check) }],
    });
  }

  return { drawingId: drawing.id, results };
}

// CLI entry point: `node src/adjudicate.ts [path-to-plan.json]`
// With no argument, runs every data/plans/*.json file found -- both sample
// drawings now have one (see data/plans/plan-annexA-sanitised2.json).
const { readFileSync, readdirSync } = await import("node:fs");
const { fileURLToPath, pathToFileURL } = await import("node:url");
const { dirname, join } = await import("node:path");

// `file://${argv[1]}` breaks on Windows (backslashes, no leading slash) --
// pathToFileURL() builds a correct file: URL on every platform, which is
// what makes this "am I the entry point" check actually work here.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const plansDir = join(__dirname, "..", "data", "plans");
  const planPaths = process.argv[2]
    ? [process.argv[2]]
    : readdirSync(plansDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => join(plansDir, f));

  for (const planPath of planPaths) {
    const drawing: Drawing = JSON.parse(readFileSync(planPath, "utf8"));
    const report = adjudicateDrawing(drawing);

    console.log(`\nAdjudication report: ${report.drawingId}\n${"=".repeat(60)}`);
    for (const element of report.results) {
      console.log(`\n[${element.elementType}] ${element.elementId}`);
      for (const v of element.verdicts) {
        console.log(`  - ${v.ruleId}: ${v.verdict} (confidence ${v.confidence})`);
        for (const r of v.reasoning) console.log(`      reason: ${r}`);
        for (const e of v.evidence) console.log(`      evidence: ${e}`);
      }
    }
    console.log();
  }
}
