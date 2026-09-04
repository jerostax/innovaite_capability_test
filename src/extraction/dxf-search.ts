import { readFileSync } from "node:fs";

// Searches a DXF file's raw text for a term and returns each match with
// surrounding context -- the same technique already used (via the `grep`
// command-line tool) to manually confirm real values on both sample
// drawings (EXG'T LAST IC/MH levels, RC SUMP labels, the RC TRENCH
// callout). This formalizes that into reusable, testable code.
//
// Why not a general "list every entity" DXF parser: tried that first
// (see git history / docs/design-decisions.md, "DXF extraction: parser
// vs. targeted search"). It broke down on real structural complexity --
// DXF group code 304 is reused for several unrelated purposes inside an
// MLEADER (real text, but also internal markers like "LEADER_LINE{"), and
// the callout text this project actually needs turned out to live partly
// inside block/attribute definitions (INSERT + embedded ATTRIB entities),
// not as flat TEXT/MTEXT entities a generic library call can just list.
// A full structured DXF object model is real, unscoped work. A targeted
// text search doesn't need to understand DXF's structure at all -- it
// only needs to find known terms and show what's near them, which is
// exactly what every extraction in this project has actually needed.

export interface DxfMatch {
  /** 1-indexed line number of the matching line in the raw DXF file. */
  lineNumber: number;
  /** The line that matched the search term. */
  line: string;
  /** Lines immediately before the match, in file order. */
  before: string[];
  /** Lines immediately after the match. */
  after: string[];
}

export interface SearchOptions {
  /** Lines of context to include before each match. Default 3. */
  contextBefore?: number;
  /** Lines of context to include after each match. Default 3. */
  contextAfter?: number;
  /** Case-sensitive search. Default false (matches how `grep -i` was used manually). */
  caseSensitive?: boolean;
}

/**
 * Grep-equivalent search over a DXF file's raw text. `term` may be a
 * plain substring or a RegExp.
 */
export function searchDxf(
  filePath: string,
  term: string | RegExp,
  options: SearchOptions = {}
): DxfMatch[] {
  const { contextBefore = 3, contextAfter = 3, caseSensitive = false } = options;

  const pattern =
    term instanceof RegExp
      ? term
      : new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), caseSensitive ? "" : "i");

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  const matches: DxfMatch[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      matches.push({
        lineNumber: i + 1,
        line: lines[i],
        before: lines.slice(Math.max(0, i - contextBefore), i),
        after: lines.slice(i + 1, i + 1 + contextAfter),
      });
    }
  }

  return matches;
}

/** Strips common AutoCAD MTEXT formatting control codes down to plain text. */
export function cleanMTextFormatting(raw: string): string {
  let text = raw;
  text = text.replace(/\\P/g, " "); // paragraph break
  text = text.replace(/%%C/g, "⌀"); // diameter symbol
  text = text.replace(/%%U/g, "").replace(/%%O/g, ""); // underline/overline toggles
  text = text.replace(/\\[A-Za-z][^;\\{}]*;/g, ""); // \Fname|...;  \W0.85;  \C256;  \pxql; etc.
  text = text.replace(/\\[A-Za-z]/g, ""); // leftover bare control letters
  text = text.replace(/[{}]/g, ""); // grouping braces
  return text.replace(/\s+/g, " ").trim();
}
