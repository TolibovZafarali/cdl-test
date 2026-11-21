# Combination Vehicles document audit

The supplied document contains 76 numbered English questions followed by Uzbek translations and explanations. After the November 20, 2026 audit, the app contains all **76 questions and 225 choices**. All 71 previously imported English stems, choice arrays, and source keys matched the upload. Original numbering and marked source answers remain available; repairs to five restored entries are documented below. Bullet prefixes and answer checkmarks are removed from visible choices. The inline parenthetical annotation in question 49 remains unchanged.

## Restored entries

- **24:** Replace the overbroad “Always” option with the conditional chocking requirement: no spring brakes, or uncertainty about their presence. [Reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=87).
- **30:** Repair malformed vehicle descriptions using source question 72. Score the single 45-foot trailer, supported by the exact configuration comparison in [NCHRP Report 198, Table 7, printed page 36](https://onlinepubs.trb.org/onlinepubs/nchrp/nchrp_rpt_198.pdf).
- **43:** Clarify the premise as a right turn that cannot be completed without entering another lane. The correct action is to finish the turn wide. This repairs the ambiguous scenario; it does not establish a certain answer to the original wording. [Reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=81).
- **55:** Keep the sole supplied answer “open”; add “closed” and “neutral” following source question 51. [Reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=87).
- **68:** Remove the redundant second valid ABS-lamp description, leaving the original correct answer and red-lamp distractor. [Reference](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=85).

The added alternatives and wording repairs are disclosed in feedback, with original source text retained in metadata. The source has one supplementary coupling illustration in its explanatory material; it is not needed to answer a question and remains available in the original document. No numbered Combination Vehicles entry remains excluded.

## Scoring audit

The nineteen prior corrections remain supported: **1, 5, 13, 14, 15, 19, 22, 25, 29, 31, 34, 38, 40, 48, 49, 60, 64, 75, and 76**. Question **72** also changes from the two short trailers to the single 45-foot trailer. [NCHRP Report 198, Table 7, printed page 36](https://onlinepubs.trb.org/onlinepubs/nchrp/nchrp_rpt_198.pdf) compares 5.4 feet of offtracking for the 45-foot single with 3.0 feet for the 27-foot doubles at a 165-foot turning radius.

With restored questions **24, 30, and 43**, scored indices differ from original markings on **23 entries**. The latter entries include repaired choices or a clarified scenario, so this total is not a count of incorrect keys in unchanged questions. Original markings remain in `sourceAnswer`; correction and content notes distinguish the changes. See the [November 20 audit](question-audit-2026-11-20.md).

The audit documents specific corrections supported by the cited manual sections; it does not authenticate the document as an official live-exam question bank.

## Integrity

- Source document: `source/combination-vehicles.docx`.
- Source SHA-256: `77744733e174dfc8eba00d60c5bb22fabe287d3812f5c003588ad18d17fed1fe`.
- Canonical content SHA-256 after documented repairs: `7bc4d3b493bfb2ecf11b00e8bea2484721d2e7a50468ed976295d4a655e01db8`.
- Canonical format: UTF-8 compact JSON array of `[number, question, choices, sourceAnswer]` for all 76 scored entries, in document order.
