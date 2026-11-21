# Supplied question-bank audit — November 20, 2026

The three latest uploads match the unchanged documents bundled as `source/general-knowledge.docx`, `source/air-brakes.docx`, and `source/combination-vehicles.docx`. The initial 422 scored entries matched their source English stems, choices, and marked keys. Twelve previously omitted entries are now restored with documented repairs, producing **434 scored questions and 1,300 choices**.

| Subject | Numbered source entries | Previously scored | Restored | Now scored | Choices |
| --- | ---: | ---: | ---: | ---: | ---: |
| General Knowledge | 295 | 289 | 6 | 295 | 886 |
| Air Brakes | 65 | 62 | 1 | 63 | 189 |
| Combination Vehicles | 76 | 71 | 5 | 76 | 225 |
| Total | 436 | 422 | 12 | 434 | 1,300 |

General Knowledge numbers **41–50 do not appear in its document**; its title's count of 305 is not the actual count. Air Brakes **12 and 17 remain excluded**: both contain answer fragments without a recoverable question or identifiable correct answer. Neither language version nor an image or table supplies the missing content. They cannot be restored without writing unrelated replacement questions.

## Restorations and scoring changes

The user authorized scoring ambiguous entries using judgment and adding alternatives to one-choice entries. The following are disclosed practice repairs, not claims that the revised text appeared in the uploaded documents. Original source documents and marked keys remain available. Changed stems and choices retain source text in metadata; feedback explains repairs in Uzbek Cyrillic.

| Entry | Change | Scored answer and evidence |
| --- | --- | --- |
| General 16 | Replace the fuel-quantity choice with valve clearance, following source question 281; all original options were inspection items. | Engine valve clearance. [Manual §2.1.5](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=19). |
| General 110 | Remove “not” from the second choice so the NOT-true prompt has only one false answer. | Do not wait until 20 mph to use the brakes. [§2.17.2](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=50). |
| General 140 | Combine the two valid fire types; replace the duplicate with ordinary combustible materials. | Electrical fires and burning liquids. [§2.21.3](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=55). |
| General 158 | Replace the unsupported cross-state numeric premise with the applicable-limit rule. This changes the question's scope. | The limit for that road and vehicle. [§2.6](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=31). |
| General 183 | Combine both valid wet-brake outcomes and supply one replacement distractor. | Sideways pull or trailer jackknife. [§2.13.2](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=44). |
| General 297 | Repair the malformed stem and “level” typo. | Label. [§9.3.2](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=101). |
| Air 13 | Clarify “posted speed” as the chosen safe speed; add authored alternatives 2 and 10 to the supplied 5. | Release at about 5 mph below safe speed. [§5.4.6](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=77). |
| Combination 24 | Replace “Always” with the specific chocking condition; retain the other source alternatives. | No spring brakes, or uncertain whether present. [§6.4.2, Step 3](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=87). |
| Combination 30 | Repair malformed vehicle descriptions using source question 72; correct the comparison key. | One 45-foot semitrailer, rather than two 27-foot trailers. [NCHRP Report 198, Table 7, printed page 36](https://onlinepubs.trb.org/onlinepubs/nchrp/nchrp_rpt_198.pdf). |
| Combination 43 | Clarify the condition as a right turn that cannot be completed without entering another lane. This changes the ambiguous original premise. | Turn wide while completing the turn. [§6.1.6](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=81). |
| Combination 55 | Add “closed” and “neutral” to the sole supplied “open” answer, following source question 51. | Open. [§6.4.2, Step 6](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=87). |
| Combination 68 | Remove the second valid ABS-lamp description; keep the original keyed answer and original red-lamp distractor. | Yellow ABS malfunction lamp. [§6.3.1](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=85). |
| General 241, existing | Append a fourth, precise answer while preserving all original choices and indices. This repairs a rough football-field approximation. | At least 419 feet at 55 mph under ideal conditions. [§2.6.1](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=30). |
| Combination 72, existing | Correct the answer index and its translation; preserve the English question and choices. | One 45-foot semitrailer. [NCHRP Report 198, Table 7, printed page 36](https://onlinepubs.trb.org/onlinepubs/nchrp/nchrp_rpt_198.pdf). |

NCHRP Report 198, Table 7 on printed page 36, reports 5.4 feet of offtracking for the 45-foot single-trailer configuration and 3.0 feet for the 27-foot doubles at a 165-foot turning radius. [FHWA Table VII-1](https://www.fhwa.dot.gov/reports/tswstudy/Vol3-Chapter7.pdf) independently supports the distinction between long singles and short doubles; overall combination length alone does not settle offtracking.

Previously corrected keys were rechecked: seven General Knowledge, five Air Brakes, and nineteen Combination Vehicles entries. After this work, `answer` differs from `sourceAnswer` on 8, 5, and 23 entries respectively. These counts include repairs to source wording and offered answers, so they are not counts of proven errors in otherwise unchanged questions.

Air Brakes 4 retains 60 psi: [FMVSS 121 §S5.1.5](https://www.govinfo.gov/content/pkg/CFR-2024-title49-vol6/pdf/CFR-2024-title49-vol6-sec571-121.pdf#page=4) supports that equipment threshold, while the [Missouri manual](https://dor.mo.gov/forms/CDL%20Manual.pdf#page=71) uses 55 psi. The edition note discloses the difference. Vehicle-dependent spring-brake pressure and emergency ABS qualifications also remain visible.

## Source integrity and limits

| Bundled document | SHA-256 |
| --- | --- |
| `source/general-knowledge.docx` | `b292f310e2913290b98eff9b9026ddc164c364917250371a6d45de8993f75231` |
| `source/air-brakes.docx` | `f929f606e808edfbe3fa11a9dae5f08572e377ba38691a0eb5e4667a918dd3e5` |
| `source/combination-vehicles.docx` | `77744733e174dfc8eba00d60c5bb22fabe287d3812f5c003588ad18d17fed1fe` |

The current official Missouri PDF has 172 pages and an August 2025 cover revision. Missouri manual links above use PDF page numbers; the NCHRP citation identifies its printed page and table without assuming a PDF page offset. The audit checks recoverable content and defensible scoring; it does **not authenticate these practice documents as official live-examination question banks**. Application checks and deployment evidence are separate from this content audit.
