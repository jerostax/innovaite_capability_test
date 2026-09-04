// CLI: search a DXF file for a term, print each match with context.
// Usage: node src/extraction/grep-dxf.ts <path-to.dxf> <term>
import { searchDxf, cleanMTextFormatting } from "./dxf-search.ts";

const [, , dxfPath, term] = process.argv;

if (!dxfPath || !term) {
  console.error("Usage: node src/extraction/grep-dxf.ts <path-to.dxf> <term>");
  process.exit(1);
}

const matches = searchDxf(dxfPath, term);
console.log(`${matches.length} match(es) for "${term}"\n`);

for (const m of matches) {
  console.log(`--- line ${m.lineNumber} ---`);
  console.log(cleanMTextFormatting(m.line));
}
