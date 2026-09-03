# Glossary — Drawing Abbreviations

Sewerage/drainage drawings use standard industry abbreviations that are not
explained on the drawing itself. This file collects every abbreviation we
had to decode to read the sample plans, one entry at a time as we encounter
it — so the reasoning behind each reading is traceable later.

| Abbreviation | Meaning | Where we saw it |
|---|---|---|
| **IC** | Inspection Chamber — a small chamber, usually on private land, that allows access to the drainage pipe for inspection/clearing. | `(div) -sanitised (4).dwg`, callout "EXG'T LAST IC" |
| **MH** | Manhole — the larger, usually public, access point into the sewer network. | `(div) -sanitised (4).dwg`, callout "EXG'T LAST MH" |
| **EXG'T** / **EXT'G** | Existing — refers to something already built, as opposed to `NEW` (to be constructed). **Both spellings appear in the same drawing** ("EXG'T LAST IC" vs "EXT'G DOWNSTREAM MANHOLE") — a small but real example of the labelling inconsistency the brief warns about, even within a single file. | Same callouts as above |
| **LAST** | Here: the last IC or MH on the private drainage line before it connects into the public sewer. | Same callouts as above |
| **TL** | Top Level — the elevation (in metres) of the top of a chamber/manhole cover. | "EXT'G T.L. 110.230", "NEW T.L. 110.460" |
| **IL** | Invert Level — the elevation of the inside bottom of a pipe or chamber (where the water actually flows). | "EXT'G I.L. 109.230" |
| **FFL** | Finished Floor Level — the elevation of the completed building's floor. | "TL TO BE TOPPED UP TO MATCH FFL" |
| **RC** | Reinforced Concrete — concrete strengthened with internal steel bars. | "RC TRENCH", "RC SUMP" |
| **M/S** | Mild Steel — a common structural steel grade. | "REMOVABLE M/S GRATING COVER" |
| **Grating** | A mesh/grid-pattern cover (lets water/air through), as opposed to a solid slab. | "REMOVABLE M/S GRATING COVER" |

## Why this matters

The assessment brief explicitly calls out that different drawings can label
the same thing differently ("sewer lines, drains, manholes... may use
different symbols, line styles, abbreviations and annotation conventions").
Keeping this glossary separate from the rule logic means that if the next
drawing uses `EXT'G` instead of `EXG'T`, or spells out "Manhole" instead of
"MH", the fix is "add a row here", not "rewrite the extraction code".
