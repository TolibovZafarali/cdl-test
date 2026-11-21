# Three-subject application verification record

## Newly added questions mode

The November 20 follow-up adds a `new` mode per subject: six General Knowledge, one Air Brakes, and five Combination Vehicles questions. The previously corrected questions 241 and 72 are not additions and stay outside this filtered mode. All twelve restored questions remain in the standard pools.

`npm test` passes all 130 tests. Local browser checks completed all three filtered tests with immediate feedback, correct scores, save/reload/resume, separate-tab missed retries, and Practice again retaining the selected mode. Full tests still contain all 434 questions. The mobile setup view has no horizontal overflow. Offline assets use cache `cdl-document-practice-v26`.

Production browser checks passed the same three new-mode flows with no page errors. All 18 published assets returned HTTP 200 and matched the local build by SHA-256. Offline new-mode loading, scoring, and feedback restoration passed for Air Brakes 13 with cache `cdl-document-practice-v26`.

Verified deployment: `dpl_2x9ZpPogvaEJSHJjjpq9rUGRZACP` ([deployment URL](https://cdl-test-ikq09onhu-zafaralis-projects-aa838686.vercel.app)), published at [cdl-test-virid.vercel.app](https://cdl-test-virid.vercel.app/). The preceding content-audit deployment remains `dpl_FuyWhxwEPVyLp7vT3oqNs4zaihhP`.

## November 20, 2026 verification

- `npm test`: 124 tests passed, including complete source-entry coverage, repaired choice provenance, translations, keyword cues, corrected scoring, and saved-choice migration.
- `npm run build`: passed. All 18 deployed files returned HTTP 200 and matched the local build byte-for-byte by SHA-256.
- Local and production browser checks covered all 12 restored entries plus General Knowledge 241 and Combination Vehicles 72. Immediate correct/incorrect feedback, translated answers, keyword cues, result scores, and saved three-choice migration passed with no page errors.
- Two full attempts per subject included all 295, 63, and 76 questions respectively, with newly shuffled question and answer orders. Numeric practice showed 73 questions and a 59-answer pass threshold.
- Mobile and desktop layouts were inspected. Production offline cache `cdl-document-practice-v25` contained all 18 registered URLs; offline Air Brakes full-test loading, scoring, and feedback restoration after refresh passed.
- Production: [cdl-test-virid.vercel.app](https://cdl-test-virid.vercel.app/). Verified deployment: `dpl_FuyWhxwEPVyLp7vT3oqNs4zaihhP` ([deployment URL](https://cdl-test-l0bmfmt5z-zafaralis-projects-aa838686.vercel.app)). The previous production deployment remains available as `dpl_DwNz27oLqixZGJ3KoxogDadB24FQ`.

The later sections preserve historical browser and release checks from November 12–13, 2026 at their original counts.

## Content

The application contains 434 questions and 1,300 choices:

| Subject | Available questions | Choices | Practice test | Full test |
| --- | ---: | ---: | ---: | ---: |
| General Knowledge | 295 | 886 | 50 | 295 |
| Air Brakes | 63 | 189 | 25 | 63 |
| Combination Vehicles | 76 | 225 | 20 | 76 |

Each of the 422 previously scored English questions, choice arrays, and original marked answers matched its source document. Twelve previously omitted entries have been restored with disclosed repairs. The unchanged documents are bundled under neutral filenames; original text for repaired entries is preserved separately from scored wording. See the [November 20 content audit](question-audit-2026-11-20.md) for evidence and source hashes.

The General Knowledge document omits numbers 41–50. Air Brakes 12 and 17 remain excluded because complete questions and identifiable correct answers are missing. Six General Knowledge, one Air Brakes, and five Combination Vehicles entries were repaired for scoring. Authored alternatives and changes to source wording are identified in content notes.

Scored indices differ from source markings on eight General Knowledge, five Air Brakes, and twenty-three Combination Vehicles entries. These totals include repaired wording and answer sets, as well as verified key corrections. Other source-specific caveats appear in answer review. See the individual document audits for evidence.

The following checks describe the earlier releases at their stated dates and original question counts. The initial checks used the production build at `http://localhost:4173/` on November 12, 2026.

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

Screenshots from that verification are available in `output/playwright/`: `study-question-{1280,390,320}.png`, `study-correct-{1280,390,320}.png`, and `study-incorrect-{1280,390,320}.png`.

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
