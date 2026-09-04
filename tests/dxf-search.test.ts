import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { searchDxf, cleanMTextFormatting } from "../src/extraction/dxf-search.ts";

// Small synthetic DXF-shaped fixture -- not one of the real project
// drawings (those live outside the repo and are too large/sensitive to
// commit as test fixtures), but shaped like the real group-code/value
// line pairs this module actually parses.
function makeFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "dxf-search-test-"));
  const path = join(dir, "fixture.dxf");
  writeFileSync(
    path,
    [
      "  0",
      "TEXT",
      "  1",
      "%%UEXG'T LAST MH",
      "  0",
      "TEXT",
      "  1",
      "NEW T.L 110.450",
      "304",
      "{\\Fisocp|c0;NEW 750MM WIDE RC TRENCH OVER EXTG MINOR SEWER LINE}",
    ].join("\n")
  );
  return path;
}

test("searchDxf finds a literal substring and reports the right line number", () => {
  const path = makeFixture();
  const matches = searchDxf(path, "RC TRENCH");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].lineNumber, 10);
  rmSync(path, { force: true });
});

test("searchDxf is case-insensitive by default (matches manual grep usage)", () => {
  const path = makeFixture();
  assert.equal(searchDxf(path, "rc trench").length, 1);
  rmSync(path, { force: true });
});

test("searchDxf treats plain strings as literal, not regex", () => {
  const path = makeFixture();
  // "T.L" as a literal should NOT match unrelated text via the regex
  // wildcard meaning of "." -- but it should match the real "T.L" text.
  const matches = searchDxf(path, "T.L");
  assert.equal(matches.length, 1);
  assert.match(matches[0].line, /NEW T\.L 110\.450/);
  rmSync(path, { force: true });
});

test("cleanMTextFormatting strips AutoCAD control codes to plain text", () => {
  const raw = "{\\Fisocp|c0;NEW 750MM WIDE RC TRENCH OVER EXTG MINOR SEWER LINE}";
  assert.equal(
    cleanMTextFormatting(raw),
    "NEW 750MM WIDE RC TRENCH OVER EXTG MINOR SEWER LINE"
  );
});

test("cleanMTextFormatting converts the diameter code and paragraph breaks", () => {
  assert.equal(cleanMTextFormatting("%%C150 PIPE\\PSECOND LINE"), "⌀150 PIPE SECOND LINE");
});
