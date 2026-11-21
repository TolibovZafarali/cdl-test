# General Knowledge document audit

The supplied document contains 295 numbered English questions, despite the title's count of 305. Numbers 41–50 are absent. The document has no embedded question images or tables.

After the November 20, 2026 audit, the bank contains all **295 supplied questions and 886 choices**. Original numbers and marked source keys are retained. Most English wording and choice arrays are unchanged; the repairs below retain their original source text in metadata. List bullets and answer checkmarks are removed from visible choices. The duplicate heading for question 296 is represented once.

## Missing and restored entries

| Numbers | Status |
| --- | --- |
| 41–50 | Absent from the supplied document. |
| 16 | Restored: replace the fuel-quantity choice with valve clearance, following source question 281. All original choices were inspection items. [Manual reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=19). |
| 110 | Restored: remove “not” from one alternative, leaving a single false answer to the NOT-true prompt. [Manual reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=50). |
| 140 | Restored: combine electrical and burning-liquid fires into one correct answer; add an ordinary-combustibles distractor. [Manual reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=55). |
| 158 | Restored: replace the unsupported cross-state numeric premise with the applicable limit for the road and vehicle. This is a scope repair. [Manual reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=31). |
| 183 | Restored: combine sideways pull and trailer jackknife in the correct answer; replace the duplicate valid alternative. [Manual reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=44). |
| 297 | Restored: clarify the stem and correct “level” to “label.” [Manual reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=101). |

## Verified key corrections

The original marking is stored in `sourceAnswer`; scoring uses `answer`. The seven earlier key corrections below preserve question and choice wording. Question 241 now includes an additional precise answer rather than relying on its original approximation.

| Question | Source key | Scored key | Reference |
| --- | --- | --- | --- |
| 5 | B | C | [Implied consent](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=163) |
| 6 | A | C | [Sleepiness](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=43) |
| 97 | C | B | [Light inspection](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=21) |
| 153 | C | A | [Signaling slowing](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=27) |
| 174 | B | C | [Downgrade braking](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=48) |
| 231 | A | B | [Oversized loads](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=63) |
| 241 | C | D, added choice | [Minimum stopping distance](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=30) |
| 285 | C | B | [Brake failure](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=50) |

Question 241 preserves all three original choices and appends “At least 419 feet under ideal conditions.” The current manual gives that explicit minimum at 55 mph; the source's football-field comparison remains available as original text. Questions 36, 76, 157, and 202 retain their keys with context about ramp speed, following distance, and emergency ABS braking.

The [November 20 audit](question-audit-2026-11-20.md) records every repair and distinguishes authored practice text from the original source. This audit does not authenticate the document as a live-exam question bank.

## Integrity

- Source document: `source/general-knowledge.docx`.
- Original source SHA-256: `b292f310e2913290b98eff9b9026ddc164c364917250371a6d45de8993f75231`.
- Compact UTF-8 JSON of `[number, question, choices, sourceAnswer]` for the 295 scored questions after the documented repairs: `7d1eda08cbe49b1944282002e17b1cf9ad5f092ce57964abe0de5e532c54a34d`.
- All 295 source entries were extracted, and all 289 previously imported stems, choice arrays, and marked keys matched the document before these repairs, including the multiline format used from question 181 onward.
