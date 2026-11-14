# Combination Vehicles document audit

The supplied document contains 76 numbered English questions followed by Uzbek translations and explanations. The app imports 71 questions and 211 choices from it. Wording, choice order, numbering, and marked source answers are retained. Bullet prefixes and answer checkmarks are removed from visible choices. The inline parenthetical annotation in question 49 remains unchanged.

## Omitted entries

- **24:** No choice states the manual’s conditional chocking requirement: trailers without spring brakes, or when uncertain. [Reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=87).
- **30:** Malformed vehicle descriptions prevent reliable scoring.
- **43:** The stem requires avoiding another lane, while the turn-wide alternative addresses a maneuver that may enter one. The wording does not support reliable scoring. [Reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=81).
- **55:** Only one answer choice is supplied.
- **68:** Two options describe the same valid ABS indicator.

No questions or distractors were invented. The source has one supplementary coupling illustration in its explanatory material; it is not needed to answer a question and remains available in the original document.

## Scoring audit

The scored key differs from the marked source key for questions **1, 5, 13, 14, 15, 19, 22, 25, 29, 31, 34, 38, 40, 48, 49, 60, 64, 75, and 76**. Each change has a `correctionNote` and a link to the relevant page of the [Missouri CDL manual](https://dor.mo.gov/forms/CDL%20Manual.pdf). Original markings remain in `sourceAnswer`.

The audit documents specific corrections supported by the cited manual sections; it does not authenticate the document as an official live-exam question bank.

## Integrity

- Source document: `source/combination-vehicles.docx`.
- Source SHA-256: `77744733e174dfc8eba00d60c5bb22fabe287d3812f5c003588ad18d17fed1fe`.
- Canonical content SHA-256: `48bbb92e9f17736a9665f9a6c3211952c45cd924cb7d6af8b538d0ff04bbf474`.
- Canonical format: UTF-8 compact JSON array of `[number, question, choices, sourceAnswer]` for each imported entry, in document order.
