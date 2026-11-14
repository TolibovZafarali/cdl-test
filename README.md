# CDL practice

A simple Missouri CDL study app with General Knowledge, Air Brakes, and Combination Vehicles questions from the supplied Word documents. The interface uses warm white surfaces, dark green accents, clear typography, and a straightforward flow from subject selection to practice and answer review.

Live application: [cdl-test-virid.vercel.app](https://cdl-test-virid.vercel.app/).

The interface is in Uzbek Cyrillic. Original English questions and answer choices remain unchanged, including the answers repeated in feedback and result review. Explanations, navigation, dialogs, dates, and accessibility labels are localized.

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

The app contains **422 questions and 1,264 answer choices**. Original English wording, numbering, and choice order are preserved. Answer checkmarks are removed from choices displayed during a test.

| Subject | Random practice | Correct to pass | All questions | Correct to pass |
| --- | ---: | ---: | ---: | ---: |
| General Knowledge | 50 | 40 | 289 | 232 |
| Air Brakes | 25 | 20 | 62 | 50 |
| Combination Vehicles | 20 | 16 | 71 | 57 |

Random practice draws from the selected subject. All questions follows the document order. Each test requires at least 80% correct. Selecting an answer immediately locks and scores your first choice, marks correct and incorrect choices, and shows the correct answer for review. Next question moves forward when you are ready; the final question also stays visible until you choose See results. Number keys select an answer, and Enter continues from feedback. Skip returns an unanswered question to the end of the queue. Save & exit preserves progress, including the feedback currently on screen. Results show missed questions and allow review of every answer. Unanswered questions count against the score when ending early.

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

Progress stays in this browser, with up to 20 results saved. Existing Air Brakes progress migrates into the expanded app while preserving answers and skipped questions. Storage continues to use `cdl-document-practice-v3`; the version 6 offline cache includes the localized interface, all three banks, and source documents. Offline use works after the site has loaded and cached its files.
