# Supplied document answer audit

The supplied document, bundled unchanged as `source/air-brakes.docx`, contains 65 numbered entries. After the November 20, 2026 audit, the app contains **63 scored questions with 189 choices**. The 62 previously imported stems, choices, and source keys match the document. Question 13 is restored with the disclosed repair below. Original numbering and marked keys are retained.

## Incomplete entries

- Question 12 contains answer fragments without a complete question or usable correct answer.
- Question 17 contains answer fragments without a complete question or usable correct answer.

These two entries are listed in `EXCLUDED_QUESTIONS` and remain excluded from scored tests. Neither language version supplies the missing question or identifiable correct answer, and no image or table resolves the gaps.

## Restored entry

Question 13 originally supplied only “5.” It is now scored with authored alternatives “2” and “10.” Its misleading reference to posted speed is clarified to the driver's chosen safe speed: release the brakes at about 5 mph below that speed. Original text and the one supplied answer remain in source metadata. [Downgrade braking, §5.4.6, PDF page 77](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=77).

See the [November 20 content audit](question-audit-2026-11-20.md) for source comparison, repair provenance, and the limitations of this practice material.

## Scoring corrections

The original marked answer is retained in `sourceAnswer`. The corrected `answer` is used for scoring, with the explanation and reference displayed in the answer review.

| Document question | Marked answer | Scored answer | Missouri manual reference |
| --- | --- | --- | --- |
| 2: Combination-vehicle applied-brake leakage | 3 psi | 4 psi | [Air leakage test, page 75](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=75) |
| 26: Compressor cut-out pressure | 160 psi | 125 psi | [Air compressor governor, page 69](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=69) |
| 38: Brake lag distance at 55 mph | 52 feet | 32 feet | [Stopping distance, page 76](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=76) |
| 39: Equipment on all air-brake vehicles | A backup hydraulic system | A supply pressure gauge | [Supply pressure gauges, page 70](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=70) |
| 55: Minimum pressure before driving with a dual system | 120 psi | 100 psi | [Dual air brake systems, page 73](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=73) |

## Retained answers with context

- **Question 4:** The document marks 60 psi, supported by [FMVSS 121 §S5.1.5](https://www.govinfo.gov/content/pkg/CFR-2024-title49-vol6/pdf/CFR-2024-title49-vol6-sec571-121.pdf#page=4). The [Missouri manual, page 71](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=71) specifies 55 psi. The original answer remains with an edition/equipment note; this is not treated as a proven incorrect source key.
- **Question 57:** The document marks 20 psi. Its review explains that spring-brake activation varies by vehicle, with a range of 20–45 psi and typically 20–30 psi. [Spring brakes, page 71](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=71).
- **Question 63:** The document's marked answer about changed emergency braking is retained with context: working ABS on all axles permits full brake application during an emergency. Normal braking remains the same, and ABS does not justify higher speeds or closer following. [Braking with ABS, page 76](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=76).
