import test from 'node:test';
import assert from 'node:assert/strict';
import { hasNumericAnswer, QUESTION_MAP, SUBJECT_MAP } from '../data/index.js';

test('numeric answer matching includes digits, written quantities and fractions in any choice', () => {
  for (const choice of ['20 feet.', '0.04%', '1/32 inch.', '12–15 seconds.', 'Two', 'FORTY feet', 'One-third', 'Half a block.', 'One quarter', 'Twice the distance.', 'four-way flashers']) {
    assert.equal(hasNumericAnswer({ choices: ['No distance specified.', choice], answer: 0 }), true, choice);
  }
});

test('numeric answer matching ignores question text, translations and substrings inside words', () => {
  assert.equal(hasNumericAnswer({
    number: 123,
    question: 'At 55 mph, how far should you look?',
    questionUz: '55',
    correctAnswerUz: '12',
    choices: ['Someone ahead.', 'Whenever it is safe.', 'None of the above.'],
    answer: 0,
  }), false);
});

test('General Knowledge offers the full numeric answer pool without changing other subjects', () => {
  const subject = SUBJECT_MAP['general-knowledge'];
  assert.equal(subject.numberQuestions.length, 70);
  assert.equal(new Set(subject.numberQuestions.map(question => question.id)).size, 70);
  assert.equal(subject.numberQuestions.filter(question => question.choices.some(choice => /\d/.test(choice))).length, 50);
  assert.ok(subject.numberQuestions.every(question => question.testId === subject.id && QUESTION_MAP[question.id] === question));
  for (const id of ['gk-035', 'gk-038', 'gk-099', 'gk-113', 'gk-220', 'gk-241', 'gk-265']) {
    assert.ok(subject.numberQuestions.includes(QUESTION_MAP[id]), id);
  }
  for (const id of ['gk-004', 'gk-063', 'gk-266', 'gk-293']) {
    assert.ok(!subject.numberQuestions.includes(QUESTION_MAP[id]), id);
  }
  assert.equal(SUBJECT_MAP['air-brakes'].numberQuestions, undefined);
  assert.equal(SUBJECT_MAP['combination-vehicles'].numberQuestions, undefined);
});
