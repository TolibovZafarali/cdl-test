# Three-subject application verification

Verified November 12, 2026 against the production build at http://localhost:4173/.

## Content

The application contains 422 questions and 1,264 choices:

| Subject | Available questions | Choices | Practice test | Full test |
| --- | ---: | ---: | ---: | ---: |
| General Knowledge | 289 | 867 | 50 | 289 |
| Air Brakes | 62 | 186 | 25 | 62 |
| Combination Vehicles | 71 | 211 | 20 | 71 |

Each imported English question, choice order, and original marked answer was compared with its source document. The unchanged documents are bundled under neutral filenames. Content and source hashes are asserted by the test suite.

The General Knowledge document omits numbers 41–50. Six other General Knowledge entries, three Air Brakes entries, and five Combination Vehicles entries are incomplete or lack a single defensible offered answer. They are excluded from scored tests and listed in each subject's source details. No missing questions or options were invented.

Seven General Knowledge, five Air Brakes, and nineteen Combination Vehicles keys are corrected with explanations and Missouri manual links. Other source-specific caveats appear in answer review. Independent review removed two unsupported Combination corrections before delivery. See the individual document audits for evidence.

## Automated checks

`npm test`: 55 passed, zero failed. `npm run build`: passed. JavaScript syntax checks passed.

Coverage includes source integrity, category boundaries, randomized and ordered sessions, 80% scoring boundaries for all six test lengths, immediate scoring and answer locking, explicit advancement, final-answer feedback persistence, skip/resume, malformed storage, legacy Air Brakes progress migration, all three offline documents and banks, and service-worker cache cleanup. The updated offline cache replaces version 4 with version 5.

## Browser verification

- General Knowledge: completed 50 questions; 40 correct passed.
- Air Brakes: completed 25 questions; 19 correct did not pass.
- Combination Vehicles: completed 20 questions offline; 16 correct passed.
- Every question in the three runs belonged to its selected subject, retained its original options, and appeared only once.
- Every selection immediately displayed Correct or Incorrect, marked the correct choice, and retained the question until Next.
- All choices locked after selection. Number keys could not change the saved first response during feedback.
- Save & exit, reload, and Continue test retained the selected wrong answer and its feedback.
- Reloaded the final feedback screen in all three subjects before explicitly opening results; this also worked offline.
- Verified number-key selection, Space activation, Enter advancement, and skip rotation.
- Ending an Air Brakes test during feedback counted the recorded correct answer and 24 unanswered questions, producing 1/25. Canceling the end dialog preserved feedback.
- Removed the browser test results after verification.
- Browser reported no uncaught errors.

## Layout and accessibility

Inspected desktop and mobile screenshots of unanswered questions and both correct and incorrect feedback. No horizontal overflow at 1280, 390, or 320 CSS pixels.

Automated WCAG A/AA checks found zero violations across 12 screen/width combinations: home, setup, and results on desktop, plus unanswered, correct, and incorrect question states at three widths. Feedback receives focus and includes explicit result text alongside the color indicators.

Current screenshots are available in `output/playwright/`: `study-question-{1280,390,320}.png`, `study-correct-{1280,390,320}.png`, and `study-incorrect-{1280,390,320}.png`.

## Production deployment

Deployed November 12, 2026 to [cdl-test-virid.vercel.app](https://cdl-test-virid.vercel.app/), Vercel project `cdl-test`.

- All 15 published files returned HTTP 200 without authentication and matched the local build byte for byte.
- Verified production content types, revalidation headers, content security policy, and MIME sniffing protection.
- On the public URL, checked correct and incorrect feedback, locked choices, saved feedback after reload, and scoring for all three subjects.
- Combination Vehicles also passed those checks offline; all three source documents remained downloadable offline.
- No uncaught browser errors. Test progress was cleared after verification.

## Uzbek Cyrillic interface

Localized navigation, subject names, feedback labels, dialogs, result review labels, dates, accessibility labels, and application metadata. All 39 explanatory notes and 24 exclusion reasons have Uzbek Cyrillic translations. Original English question stems, choices, and scoring keys remain unchanged; source-integrity tests still pass. English question and answer regions have explicit language attributes.

The 55 automated tests passed. Browser checks passed across 32 screen and width combinations, including all three subjects, expanded source notes, correct and incorrect feedback, saved progress, result review, and dialogs. No unintended English interface text, horizontal overflow, accessibility violations, or uncaught browser errors were found. Mobile screenshots are saved as `output/playwright/uzbek-home-390.png` and `output/playwright/uzbek-feedback-combination-vehicles.png`.

Offline cache version 6 includes the translation module and preserves existing saved sessions.

Published the localized version to the same production URL. All 16 deployed files matched the local build byte for byte. Verified the updated interface, unchanged English question and choices, immediate localized feedback, and feedback persistence after an offline reload on the live site.

## Randomized full tests

Updated November 13, 2026. New full tests shuffle the entire selected subject. The Uzbek mode description now says random order. Resuming an unfinished test retains its question order, answers, and skipped-question queue.

All 55 automated tests passed. Browser checks started two full tests for each subject: 289 General Knowledge questions, 62 Air Brakes questions, and 71 Combination Vehicles questions. Every run contained exactly the complete subject set, with no duplicates; all six runs were shuffled, and each subject's two runs had different orders. Save, reload, and resume preserved the generated order and recorded answer. No uncaught browser errors occurred. Offline cache version 7 delivers the update.

Deployed to the existing production URL and repeated these six full-test start/resume checks successfully on the live site. The deployed application script and service worker match the tested build.

## Randomized answer choices

Updated November 13, 2026. Every new practice and full test stores a shuffled choice order for each question. Submitted answers and scoring retain original source indices. Displayed letters, number-key shortcuts, feedback, and result review use the saved display positions. Existing sessions without choice-order data preserve their original presentation.

All 61 automated tests passed. Coverage includes two- and three-choice permutations, correct answers in every displayed position, immutable source banks, saved feedback/results, legacy sessions, and rejected malformed order maps. The three position-dependent choices in questions `gk-093`, `gk-285`, and `cv-028` update their letter references while preserving their meaning.

Browser checks passed in all six subject/mode combinations. Verified choice permutations, selection by mouse and number keys, correct/wrong feedback, saved progress, first-attempt scoring, and matching letters/text in result review. Additional deterministic browser checks covered the three positional references, both two-choice questions, completed tests, a legacy session, and final feedback after an offline reload. Offline cache version 8 includes the updated application and engine.

Published to the existing production URL. The application, engine, and service-worker files match the tested build, and all six subject/mode browser checks passed again on the live site with no uncaught errors.
