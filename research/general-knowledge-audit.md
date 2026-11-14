# General Knowledge document audit

The supplied document contains 295 numbered English questions, despite the title's count of 305. Numbers 41–50 are absent. The document has no embedded question images or tables.

The bank imports 289 questions and 867 choices. English wording, choice order, original numbers, and marked source answers are retained. List bullets and answer checkmarks are removed from visible choices. The duplicate heading for question 296 is represented once. No missing options or questions were invented.

## Entries excluded from scored tests

| Numbers | Reason |
| --- | --- |
| 41–50 | Absent from the supplied document. |
| 16 | All supplied choices are included in pre-trip inspection. [Manual reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=21). |
| 110 | Two choices answer the NOT-true prompt. [Manual reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=50). |
| 140 | Both electrical and gasoline fires are valid choices. [Manual reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=55). |
| 158 | The cross-state speed-limit premise does not support one supplied value. |
| 183 | Both sideways pull and trailer jackknife are valid outcomes. [Manual reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=44). |
| 297 | The marked choice is “level”; no valid identification term is supplied. |

## Verified key corrections

The question and choices remain unchanged. The original marking is stored in `sourceAnswer`; scoring uses `answer`.

| Question | Source key | Scored key | Reference |
| --- | --- | --- | --- |
| 5 | B | C | [Implied consent](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=163) |
| 6 | A | C | [Sleepiness](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=43) |
| 97 | C | B | [Light inspection](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=21) |
| 153 | C | A | [Signaling slowing](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=27) |
| 174 | B | C | [Downgrade braking](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=48) |
| 231 | A | B | [Oversized loads](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=63) |
| 285 | C | B | [Brake failure](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=50) |

Questions 36, 76, 157, 202, and 241 retain the document's key with context in the answer review. These address safe ramp speed, following distance, emergency ABS braking, and the document's approximate stopping distance. This audit does not authenticate the document as a live-exam question bank.

## Integrity

- Source document: `source/general-knowledge.docx`.
- Original source SHA-256: `b292f310e2913290b98eff9b9026ddc164c364917250371a6d45de8993f75231`.
- Compact UTF-8 JSON of `[number, question, choices, sourceAnswer]` for the 289 imported questions: `3a5bd69f122cb9960c68ff1f8854bbd3f5de5f7ee56921ebf30d5ba356897f98`.
- All imported stems, three-choice arrays, and marked keys were checked against the document paragraphs, including the multiline format used from question 181 onward.
