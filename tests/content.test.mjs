import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { QUESTIONS, QUESTION_MAP, SOURCE, SUBJECTS, SUBJECT_MAP } from '../data/index.js';
import { QUESTION_NOTES } from '../data/interface-uz.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const documentEntries = JSON.parse(readFileSync(new URL('./fixtures/document-entries.json', import.meta.url), 'utf8'));
const sourceEntry = question => ({ question: question.question, choices: question.choices, sourceAnswer: question.sourceAnswer });
const primaryReference = /^https:\/\/(?:dor\.mo\.gov\/forms\/CDL%20Manual\.pdf#page=\d+|onlinepubs\.trb\.org\/onlinepubs\/nchrp\/nchrp_rpt_198\.pdf)$/;
const sources = [
  {
    id: 'general-knowledge', prefix: 'gk-', digits: 3, count: 295, choices: 886, numbered: 305, sourceCount: 295,
    excluded: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
    contentHash: '61192c8715f22b471a8d9164fde49526f7c73495d9f102c1fe025e7e34ab4870',
    documentHash: 'b292f310e2913290b98eff9b9026ddc164c364917250371a6d45de8993f75231',
    repairs: [16, 110, 140, 158, 183, 241, 297],
    corrections: [[5, 1, 2], [6, 0, 2], [97, 2, 1], [153, 2, 0], [174, 1, 2], [231, 0, 1], [241, 2, 3], [285, 2, 1]],
  },
  {
    id: 'air-brakes', prefix: 'docx-', digits: 2, count: 63, choices: 189, numbered: 65, sourceCount: 65,
    excluded: [12, 17],
    contentHash: 'a425c28484d042c19f227f43ddbe224e1eb8e25cbf8dc9b6cdfd07e6d218d790',
    documentHash: 'f929f606e808edfbe3fa11a9dae5f08572e377ba38691a0eb5e4667a918dd3e5',
    repairs: [13],
    corrections: [[2, 1, 2], [26, 2, 0], [38, 2, 0], [39, 2, 0], [55, 1, 0]],
  },
  {
    id: 'combination-vehicles', prefix: 'cv-', digits: 3, count: 76, choices: 225, numbered: 76, sourceCount: 76,
    excluded: [],
    contentHash: '47c1b01eeb25f4a916d2171bf09aafac417d1ef7501757dd181c80b60a6aac64',
    documentHash: '77744733e174dfc8eba00d60c5bb22fabe287d3812f5c003588ad18d17fed1fe',
    repairs: [24, 30, 43, 55, 68],
    corrections: [[1, 2, 1], [5, 1, 0], [13, 1, 2], [14, 2, 1], [15, 2, 0], [19, 2, 0], [22, 1, 0], [24, 2, 1], [25, 1, 0], [29, 2, 0], [30, 1, 0], [31, 1, 0], [34, 1, 0], [38, 1, 0], [40, 1, 2], [43, 2, 1], [48, 2, 0], [49, 2, 1], [60, 2, 1], [64, 0, 1], [72, 1, 0], [75, 1, 0], [76, 1, 2]],
  },
];

for (const expected of sources) {
  const subject = SUBJECT_MAP[expected.id];
  const originals = documentEntries.filter(entry => entry.testId === expected.id);
  test(`${expected.id}: imported questions and omissions account for every original number`, () => {
    assert.equal(subject.count, expected.count);
    assert.equal(subject.questions.reduce((sum, q) => sum + q.choices.length, 0), expected.choices);
    assert.deepEqual(subject.excluded.map(q => q.number), expected.excluded);
    assert.ok(subject.excluded.every(q => q.reason.trim().length > 10));
    const numbers = Array.from({ length: expected.numbered }, (_, i) => i + 1).filter(n => !expected.excluded.includes(n));
    assert.deepEqual(subject.questions.map(q => q.number), numbers);
    for (const q of subject.questions) {
      assert.equal(q.id, `${expected.prefix}${String(q.number).padStart(expected.digits, '0')}`);
      assert.equal(q.testId, expected.id);
      assert.equal(QUESTION_MAP[q.id], q);
      assert.ok(q.question.trim().length > 0);
      assert.ok([2, 3, 4].includes(q.choices.length));
      assert.ok(q.choices.every(choice => typeof choice === 'string' && choice.trim() && !choice.includes('✅')));
      for (const key of ['answer', 'sourceAnswer']) assert.ok(Number.isInteger(q[key]) && q[key] >= 0 && q[key] < q.choices.length);
    }
  });

  test(`${expected.id}: every source entry is preserved verbatim in the bank or exclusion record`, () => {
    assert.equal(originals.length, expected.sourceCount);
    const tuples = originals.map(q => [q.number, q.question, q.choices, q.sourceAnswer]);
    assert.equal(hash(JSON.stringify(tuples)), expected.contentHash);
    for (const original of originals) {
      const scored = subject.questions.find(q => q.number === original.number);
      const excluded = subject.excluded.find(q => q.number === original.number);
      assert.ok(Boolean(scored) !== Boolean(excluded), `${original.id}: exactly one scored or excluded record`);
      const actual = scored ? (scored.sourceEntry || sourceEntry(scored)) : excluded.sourceEntry;
      assert.deepEqual(actual, sourceEntry(original), original.id);
      if (scored) assert.equal(scored.sourceAnswer, original.sourceAnswer, original.id);
    }
    for (const q of subject.questions) assert.ok(originals.some(original => original.id === q.id), q.id);
    assert.equal(subject.sourceUrl, `./source/${expected.id}.docx`);
    const document = readFileSync(new URL(`../source/${expected.id}.docx`, import.meta.url));
    assert.equal(hash(document), expected.documentHash);
  });

  test(`${expected.id}: every wording repair and added choice retains source evidence and a content note`, () => {
    const repaired = [];
    for (const q of subject.questions) {
      const original = originals.find(entry => entry.number === q.number);
      if (q.question === original.question && JSON.stringify(q.choices) === JSON.stringify(original.choices)) continue;
      repaired.push(q.number);
      assert.deepEqual(q.sourceEntry, sourceEntry(original), q.id);
      assert.ok(typeof q.contentNote === 'string' && q.contentNote.trim().length > 30, q.id);
      assert.match(QUESTION_NOTES[q.id]?.contentNote || '', /\p{Script=Cyrillic}/u, q.id);
      assert.match(q.referenceUrl, primaryReference, q.id);
    }
    assert.deepEqual(repaired, expected.repairs);
  });

  test(`${expected.id}: every scoring correction is documented and retains its original key`, () => {
    const changed = subject.questions.filter(q => q.answer !== q.sourceAnswer);
    assert.deepEqual(changed.map(q => [q.number, q.sourceAnswer, q.answer]), expected.corrections);
    for (const q of changed) {
      assert.ok(q.correctionNote.length > 30);
      assert.match(QUESTION_NOTES[q.id]?.correctionNote || '', /\p{Script=Cyrillic}/u, q.id);
      assert.match(q.referenceUrl, primaryReference);
    }
  });

  test(`${expected.id}: every question and keyed answer has an Uzbek Cyrillic translation`, () => {
    for (const question of subject.questions) {
      assert.match(question.questionUz, /\p{Script=Cyrillic}/u, question.id);
      assert.equal((question.questionUz.match(/_{2,}/g) || []).length, (question.question.match(/_{2,}/g) || []).length, question.id);
      assert.match(question.correctAnswerUz, /\p{Script=Cyrillic}/u, question.id);
      const combinedAnswer = /^Both (?:A and B(?: are correct)?|of the above)\.$/i.test(question.choices[question.answer]);
      const placeholders = question.correctAnswerUz.match(/\{[^}]*\}/g) || [];
      assert.deepEqual(placeholders.sort(), combinedAnswer ? ['{first}', '{second}'] : [], question.id);
    }
  });
}

test('all three subjects use distinct identifiers and the correct practice lengths', () => {
  assert.equal(SOURCE.id, 'user-cdl-documents-v1');
  assert.deepEqual(SUBJECTS.map(s => [s.id, s.practiceCount]), [['general-knowledge', 50], ['air-brakes', 25], ['combination-vehicles', 20]]);
  assert.equal(QUESTIONS.length, 434);
  assert.equal(Object.keys(QUESTION_MAP).length, 434);
  assert.equal(new Set(QUESTIONS.map(q => q.id)).size, 434);
  assert.equal(QUESTIONS.reduce((sum, q) => sum + q.choices.length, 0), 1300);
  assert.equal(existsSync(new URL('../source/generalknowledge.pdf', import.meta.url)), false);
});

test('source coverage includes all 436 entries without inventing the absent General Knowledge numbers', () => {
  assert.equal(documentEntries.length, 436);
  assert.equal(new Set(documentEntries.map(q => q.id)).size, 436);
  assert.deepEqual(documentEntries.filter(q => q.sourceAnswer === null).map(q => q.id), ['docx-12', 'docx-17']);
  assert.deepEqual(documentEntries.filter(q => q.sourceAnswer !== null && q.choices.length === 1).map(q => q.id), ['docx-13', 'cv-055']);
  assert.deepEqual(SUBJECT_MAP['general-knowledge'].excluded.map(q => q.number), [41, 42, 43, 44, 45, 46, 47, 48, 49, 50]);
  for (const excluded of SUBJECT_MAP['general-knowledge'].excluded) {
    assert.equal(documentEntries.some(q => q.testId === 'general-knowledge' && q.number === excluded.number), false);
    assert.equal(excluded.sourceEntry, undefined);
  }
});

test('single-answer source entries retain their supplied answer and gain usable practice choices', () => {
  for (const id of ['docx-13', 'cv-055']) {
    const q = QUESTION_MAP[id];
    const original = documentEntries.find(entry => entry.id === id);
    assert.equal(q.choices[q.answer], original.choices[original.sourceAnswer], id);
    assert.equal(q.choices.length, 3, id);
    assert.equal(new Set(q.choices.map(choice => choice.toLowerCase().trim())).size, 3, id);
    assert.equal(q.answer, 0, id);
  }
});

test('the precise stopping-distance answer is appended without shifting existing choice identities', () => {
  const q = QUESTION_MAP['gk-241'];
  const original = documentEntries.find(entry => entry.id === q.id);
  assert.equal(q.previousChoiceCount, 3);
  assert.deepEqual(q.choices.slice(0, q.previousChoiceCount), original.choices);
  assert.equal(q.sourceAnswer, 2);
  assert.equal(q.answer, 3);
  assert.equal(q.choices[q.answer], 'At least 419 feet under ideal conditions.');
});

test('Air Brakes pressure and ABS wording retain their marked keys with review notes', () => {
  for (const number of [4, 57, 63]) {
    const q = SUBJECT_MAP['air-brakes'].questions.find(q => q.number === number);
    assert.equal(q.answer, q.sourceAnswer);
    assert.ok((q.editionNote || q.explanation).length > 30);
    assert.ok(q.referenceUrl.startsWith('https://dor.mo.gov/'));
  }
});
