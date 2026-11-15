import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { QUESTIONS, QUESTION_MAP, SOURCE, SUBJECTS, SUBJECT_MAP } from '../data/index.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const sources = [
  {
    id: 'general-knowledge', prefix: 'gk-', digits: 3, count: 289, choices: 867, numbered: 305,
    excluded: [16, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 110, 140, 158, 183, 297],
    contentHash: '3a5bd69f122cb9960c68ff1f8854bbd3f5de5f7ee56921ebf30d5ba356897f98',
    documentHash: 'b292f310e2913290b98eff9b9026ddc164c364917250371a6d45de8993f75231',
    corrections: [[5, 1, 2], [6, 0, 2], [97, 2, 1], [153, 2, 0], [174, 1, 2], [231, 0, 1], [285, 2, 1]],
  },
  {
    id: 'air-brakes', prefix: 'docx-', digits: 2, count: 62, choices: 186, numbered: 65,
    excluded: [12, 13, 17],
    contentHash: '8c6f4064060c1070b659d6570e940ae82cfda7c20c45c2d2a7bb9538cda3b699',
    documentHash: 'f929f606e808edfbe3fa11a9dae5f08572e377ba38691a0eb5e4667a918dd3e5',
    corrections: [[2, 1, 2], [26, 2, 0], [38, 2, 0], [39, 2, 0], [55, 1, 0]],
  },
  {
    id: 'combination-vehicles', prefix: 'cv-', digits: 3, count: 71, choices: 211, numbered: 76,
    excluded: [24, 30, 43, 55, 68],
    contentHash: '48bbb92e9f17736a9665f9a6c3211952c45cd924cb7d6af8b538d0ff04bbf474',
    documentHash: '77744733e174dfc8eba00d60c5bb22fabe287d3812f5c003588ad18d17fed1fe',
    corrections: [[1, 2, 1], [5, 1, 0], [13, 1, 2], [14, 2, 1], [15, 2, 0], [19, 2, 0], [22, 1, 0], [25, 1, 0], [29, 2, 0], [31, 1, 0], [34, 1, 0], [38, 1, 0], [40, 1, 2], [48, 2, 0], [49, 2, 1], [60, 2, 1], [64, 0, 1], [75, 1, 0], [76, 1, 2]],
  },
];

for (const expected of sources) {
  const subject = SUBJECT_MAP[expected.id];
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
      assert.ok([2, 3].includes(q.choices.length));
      assert.ok(q.choices.every(choice => typeof choice === 'string' && choice.trim() && !choice.includes('✅')));
      for (const key of ['answer', 'sourceAnswer']) assert.ok(Number.isInteger(q[key]) && q[key] >= 0 && q[key] < q.choices.length);
    }
  });

  test(`${expected.id}: wording, choice order, and original marked answers match the uploaded document`, () => {
    const actual = subject.questions.map(q => [q.number, q.question, q.choices, q.sourceAnswer]);
    assert.equal(hash(JSON.stringify(actual)), expected.contentHash);
    assert.equal(subject.sourceUrl, `./source/${expected.id}.docx`);
    const document = readFileSync(new URL(`../source/${expected.id}.docx`, import.meta.url));
    assert.equal(hash(document), expected.documentHash);
  });

  test(`${expected.id}: every scoring correction is documented and retains its original key`, () => {
    const changed = subject.questions.filter(q => q.answer !== q.sourceAnswer);
    assert.deepEqual(changed.map(q => [q.number, q.sourceAnswer, q.answer]), expected.corrections);
    for (const q of changed) {
      assert.ok(q.correctionNote.length > 30);
      assert.match(q.referenceUrl, /^https:\/\/dor\.mo\.gov\/forms\/CDL%20Manual\.pdf#page=\d+$/);
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
  assert.deepEqual(SUBJECTS.map(s => [s.id, s.practiceCount]), [['general-knowledge', 20], ['air-brakes', 25], ['combination-vehicles', 20]]);
  assert.equal(QUESTIONS.length, 422);
  assert.equal(Object.keys(QUESTION_MAP).length, 422);
  assert.equal(new Set(QUESTIONS.map(q => q.id)).size, 422);
  assert.equal(QUESTIONS.reduce((sum, q) => sum + q.choices.length, 0), 1264);
  assert.equal(existsSync(new URL('../source/generalknowledge.pdf', import.meta.url)), false);
});

test('Air Brakes pressure and ABS wording retain their marked keys with review notes', () => {
  for (const number of [4, 57, 63]) {
    const q = SUBJECT_MAP['air-brakes'].questions.find(q => q.number === number);
    assert.equal(q.answer, q.sourceAnswer);
    assert.ok((q.editionNote || q.explanation).length > 30);
    assert.ok(q.referenceUrl.startsWith('https://dor.mo.gov/'));
  }
});
