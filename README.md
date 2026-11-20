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

The app contains **422 questions and 1,264 answer choices**. The source banks preserve original English wording, numbering, and choice order. Displayed choices are shuffled, with position-dependent references adjusted to preserve their meaning. Answer checkmarks are removed from choices displayed during a test.

| Subject | Random practice | Correct to pass | All questions | Correct to pass |
| --- | ---: | ---: | ---: | ---: |
| General Knowledge | 50 | 40 | 289 | 232 |
| Air Brakes | 25 | 20 | 62 | 50 |
| Combination Vehicles | 20 | 16 | 71 | 57 |

Random practice draws from the selected subject. All questions includes the entire selected subject in a newly shuffled order on every new attempt. Resuming an unfinished test retains its saved order. Each test requires at least 80% correct. Selecting an answer immediately locks and scores your first choice, marks correct and incorrect choices, and shows the correct answer for review. Next question moves forward when you are ready; the final question also stays visible until you choose See results. Number keys select an answer, and Enter continues from feedback. Skip returns an unanswered question to the end of the queue. Save & exit preserves progress, including the feedback currently on screen. Results show missed questions and allow review of every answer. Unanswered questions count against the score when ending early. From any result with missed questions, open a fresh test of just those questions in a new browser tab. The retry and its result stay in that tab, including after a refresh.

Every subject and test mode offers a **Таянч сўзлар** (keyword hints) switch. It is off by default and remembers its setting across subjects, visits, and retry tabs. When enabled, it highlights one or two carefully selected English words, numbers, or short phrases in each question and its correct answer, including before answering, in feedback, and during results review. The switch is also available during a test and in review. All 422 questions have individually selected cues. Short prompts and answers keep a single cue where extra highlighting would add little value. Uzbek translations stay unchanged.

General Knowledge also offers cumulative practice. Start with 20 questions. On the results screen, **Add 20 questions** starts a fresh attempt with the entire expanded set in shuffled order. The set grows to 40 questions, then 60, and so on. The final addition takes the set from 280 to all 289 questions. Retry at any size to reshuffle the same questions and their answer choices. Saved progress keeps the current set, and you can retry an older result at its original size.

Every new practice or full test also shuffles the choices for each included question. Displayed A/B/C labels, number-key shortcuts, immediate feedback, and answer review follow that saved order. Scoring stores the original source choice index. Resuming or reviewing a test keeps its existing choice order; older saved tests retain their original display order.

The source documents can be downloaded from each subject's information section. Missing, incomplete, or ambiguous entries are listed there and excluded from scored tests. No replacement questions or distractors were invented.

## Answer audits

Scoring corrects 7 marked answers in General Knowledge, 5 in Air Brakes, and 19 in Combination Vehicles. Original markings remain in `sourceAnswer`; corrections and relevant context appear in answer review with references to the Missouri manual.

- [General Knowledge audit](research/general-knowledge-audit.md)
- [Air Brakes audit](research/document-answer-audit.md)
- [Combination Vehicles audit](research/combination-vehicles-audit.md)

These practice documents are not authenticated as live examination question banks.

## Files and saved progress

- `data/`: the three question banks, subject definitions, and omitted-entry notes.
- `source/general-knowledge.docx`, `source/air-brakes.docx`, and `source/combination-vehicles.docx`: unchanged source documents under neutral filenames.
- `app.js` and `styles.css`: the interface.
- `engine.js` and `storage.js`: scoring, sessions, and validated browser storage.
- `tests/`: content integrity, scoring, persistence, and offline checks.

Progress stays in this browser, with up to 20 results saved. Missed-question retries have individual addresses and retain up to 20 attempts in their browser tab, so refreshing or moving through browser history restores the matching questions, answers, and result. Existing Air Brakes progress migrates into the expanded app while preserving answers and skipped questions. Storage continues to use `cdl-document-practice-v3`. The version 23 offline cache includes the localized interface, all three banks, and source documents. Offline use works after the site has loaded and cached its files.
