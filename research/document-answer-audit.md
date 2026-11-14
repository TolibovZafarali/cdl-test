# Supplied document answer audit

The latest supplied document, `CDL_Air Brakes_test_ing-o'zb_65.docx`, contains 65 numbered entries. The app imports 62 questions with 186 choices, preserving their English wording, original numbering, and choice order. The unchanged source is served as `source/air-brakes.docx`.

## Incomplete entries

- Question 12 contains answer fragments without a complete question or usable correct answer.
- Question 13 provides only one answer choice.
- Question 17 contains answer fragments without a complete question or usable correct answer.

These entries are listed in `EXCLUDED_QUESTIONS` and are excluded from scored tests. No replacement wording or distractors were invented.

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

- **Question 4:** The document marks 60 psi. The Missouri manual specifies warning before pressure falls below 55 psi. Because 55 psi is absent from the supplied choices, the original answer is retained with an edition note. [Low air pressure warning, page 71](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=71).
- **Question 57:** The document marks 20 psi. Its review explains that spring-brake activation varies by vehicle, with a range of 20–45 psi and typically 20–30 psi. [Spring brakes, page 71](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=71).
- **Question 63:** The document's marked answer about changed emergency braking is retained with context: working ABS on all axles permits full brake application during an emergency. Normal braking remains the same, and ABS does not justify higher speeds or closer following. [Braking with ABS, page 76](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=76).
