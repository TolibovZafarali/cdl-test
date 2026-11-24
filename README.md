# CDL practice

A simple Missouri CDL study app with General Knowledge, Air Brakes, and Combination Vehicles questions from the supplied Word documents. The interface uses warm white surfaces, dark green accents, clear typography, and a straightforward flow from subject selection to practice and answer review.

Live application: [cdl-test-virid.vercel.app](https://cdl-test-virid.vercel.app/).

The interface is in Uzbek Cyrillic. Each question appears in English with its Uzbek Cyrillic translation directly below it, including during results review. Answer choices appear in English. A correct response also shows the Uzbek answer translation in feedback and review. Choices are shuffled for every new test; letter references such as “Both A and B” follow the displayed positions in the question, feedback, and review. Explanations, navigation, dialogs, dates, and accessibility labels are localized.

## Run

Requires Node.js 20 or newer. No package installation is needed.

```sh
npm start
```

Open [http://localhost:4173](http://localhost:4173).

```sh
npm test
npm run build
npm run preview
```

The build produces a static website in `dist/`. Serve it over HTTP; use HTTPS outside localhost for offline support.

## Deploy

The Vercel project is `cdl-test` in `zafaralis-projects-aa838686`. `vercel.json` builds and publishes only `dist/`, preserves the security headers, and requires browsers to revalidate application files. `.vercelignore` excludes local credentials, test output, and research from uploads.

```sh
npx vercel deploy --prod --scope zafaralis-projects-aa838686
```

## Question sets

The app contains **434 questions and 1,300 answer choices**. Original numbering and marked source keys are retained. Most English wording and choices are unchanged; documented repairs make incomplete or ambiguous entries scoreable, and two one-choice entries have added practice alternatives. Displayed choices are shuffled, with position-dependent references adjusted to preserve their meaning. Answer checkmarks are removed from choices displayed during a test.

| Subject | Random practice | Correct to pass | All questions | Correct to pass |
| --- | ---: | ---: | ---: | ---: |
| General Knowledge | 50 | 40 | 295 | 236 |
| Air Brakes | 25 | 20 | 63 | 51 |
| Combination Vehicles | 20 | 16 | 76 | 61 |

Random practice draws from the selected subject. All questions includes the entire selected subject in a newly shuffled order on every new attempt. Resuming an unfinished test retains its saved order. Each test requires at least 80% correct. Selecting an answer immediately locks and scores your first choice, marks correct and incorrect choices, and shows the correct answer for review. Next question moves forward when you are ready; the final question also stays visible until you choose See results. Number keys select an answer, and Enter continues from feedback. Skip returns an unanswered question to the end of the queue. Save & exit preserves progress, including the feedback currently on screen. Results show missed questions and allow review of every answer. Unanswered questions count against the score when ending early. From any result with missed questions, open a fresh test of just those questions in a new browser tab. The retry and its result stay in that tab, including after a refresh.

In the full General Knowledge test (**Барча саволлар**), **Билмайман** (I don't know) records an unsure question and immediately moves on. Marked questions earn no score credit and remain in the full-test denominator. At the end, **Билмаган саволларимни машқ қилиш** opens exactly those marked questions in a new tab. **Шу тўпламни такрорлаш** repeats the entire same set, even after a perfect result; correct answers never remove questions. Each repetition reshuffles the questions and their answer choices. Save/resume and refresh preserve progress; completed full-test results keep the link for reopening the set. The ordinary missed-question retry remains separate.

Every subject offers **Ўхшаш сўзли саволлар** (Similar wording): 27 General Knowledge, 19 Air Brakes, and 30 Combination Vehicles questions. The 35 reviewed groups in `data/wording-groups.js` use literal English wording, rather than topic similarity: near-identical prompts (including true/NOT true, brakes on/off, and different speeds), and matching answer phrases that are correct for one question and incorrect for another. Each match records the exact phrase and, for answer matches, the original choice index. No questions or answer keys are changed. An attempt includes every question in that subject's curated pool, once each, in shuffled order. Practice again keeps the mode and pool and reshuffles questions and choices; saving/resuming retains the current order. After answering or in result review, **Ўхшаш саволларни солиштириш** expands the matching questions with shared wording highlighted and every answer choice visible. Correct/incorrect labels describe an option's role in that particular question, especially when the prompt asks for a false statement. These comparisons remain collapsed until requested and are also available offline.

Every subject and test mode offers a **Таянч сўзлар** (keyword hints) switch. It is off by default and remembers its setting across subjects, visits, and retry tabs. When enabled, it highlights one or two carefully selected English words, numbers, or short phrases in each question and its correct answer, including before answering, in feedback, and during results review. The switch is also available during a test and in review. All 434 questions have individually selected cues. Short prompts and answers keep a single cue where extra highlighting would add little value. Uzbek translations stay unchanged.

Each subject also offers **Янги қўшилган саволлар** (Newly added questions), containing only the questions restored in the November 20 content audit: six General Knowledge questions (16, 110, 140, 158, 183, 297), one Air Brakes question (13), and five Combination Vehicles questions (24, 30, 43, 55, 68). These questions remain in the existing pools. New-question attempts shuffle questions and choices, show immediate feedback, support saving and missed-question retries, and keep this option selected when choosing Practice again. The previously available questions 241 and 72 are excluded from this option because only their answers changed.

General Knowledge also offers cumulative practice. Start with 20 questions. On the results screen, **Add 20 questions** starts a fresh attempt with the entire expanded set in shuffled order. The set grows to 40 questions, then 60, and so on. The final addition takes the set from 280 to all 295 questions. Retry at any size to reshuffle the same questions and their answer choices. Saved progress keeps the current set, and you can retry an older result at its original size.

General Knowledge's **Сонли жавоблар** (Numbers in answers) option includes all 73 questions with a number in at least one English answer choice. It recognizes digits and written numbers or fractions, such as “Two,” “One half,” and “Twice.” Numbers appearing only in the question do not qualify. Each attempt shuffles the matching questions and choices, requires 59 correct answers to pass, and supports saving, resuming, review, and missed-question retries. **Practice again** keeps this option selected.

Every new practice or full test also shuffles the choices for each included question. Displayed A–D labels, number-key shortcuts, immediate feedback, and answer review follow that saved order; the fourth choice appears on General Knowledge 241. Scoring stores the canonical question-bank choice index, which can differ from a source-document index when choices were added or removed. Resuming or reviewing a test keeps its saved order. Older saved orders for General Knowledge 241 retain their original three positions and append the new fourth choice.

The source documents can be downloaded from each subject's information section. Twelve formerly omitted entries have been restored with disclosed wording repairs or added alternatives. General Knowledge numbers 41–50 are absent from its source. Air Brakes 12 and 17 remain excluded because their question and correct-answer text cannot be recovered. The [November 20 content audit](research/question-audit-2026-11-20.md) distinguishes source text from practice additions.

## Answer audits

Scored indices differ from original markings on 8 General Knowledge, 5 Air Brakes, and 23 Combination Vehicles entries. These totals include repairs to ambiguous wording and incomplete answer sets. Original markings remain in `sourceAnswer`; corrections, authored changes, and relevant context appear in answer review with primary-source references.

- [General Knowledge audit](research/general-knowledge-audit.md)
- [Air Brakes audit](research/document-answer-audit.md)
- [Combination Vehicles audit](research/combination-vehicles-audit.md)
- [November 20 source comparison and repairs](research/question-audit-2026-11-20.md)

These practice documents are not authenticated as live examination question banks.

## Files and saved progress

- `data/`: the three question banks, subject definitions, and omitted-entry notes.
- `source/general-knowledge.docx`, `source/air-brakes.docx`, and `source/combination-vehicles.docx`: unchanged source documents under neutral filenames.
- `app.js` and `styles.css`: the interface.
- `engine.js` and `storage.js`: scoring, sessions, and validated browser storage.
- `tests/`: content integrity, scoring, persistence, and offline checks.

Progress stays in this browser, with up to 20 results saved. Missed-question retries have individual addresses and retain up to 20 attempts in their browser tab, so refreshing or moving through browser history restores the matching questions, answers, and result. Existing Air Brakes progress migrates into the expanded app while preserving answers and skipped questions. Storage continues to use `cdl-document-practice-v3`. The offline cache includes the localized interface, all three banks, and source documents. Offline use works after the site has loaded and cached its files.
