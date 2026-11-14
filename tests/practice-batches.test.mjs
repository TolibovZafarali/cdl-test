import test from 'node:test';
import assert from 'node:assert/strict';
import { SOURCE, QUESTION_MAP, SUBJECT_MAP } from '../data/index.js';
import { createPracticeSetSession, drawPracticeBatch, finishSession, samePracticeSet, scoreSession, submitAnswer } from '../engine.js';

const bank = SUBJECT_MAP['general-knowledge'].questions;
const settings = { sourceId: SOURCE.id, testId: 'general-knowledge', count: 20 };
for (const questions of [bank, bank.slice(0, 40)]) {
  test(`sets of 20 cover all ${questions.length} questions every cycle and never overlap adjacent sets`, () => {
    let previousIds = [];
    let previousStems = [];
    let seenIds = [];
    const draws = [];
    const expected = new Set(questions.map(question => question.id));
    while (draws.length < questions.length * 3) {
      const batch = drawPracticeBatch(questions, 20, previousIds, seenIds, () => 0.37);
      const ids = batch.questions.map(question => question.id);
      assert.equal(ids.length, 20);
      assert.equal(new Set(ids).size, 20);
      assert.ok(ids.every(id => !previousIds.includes(id)));
      assert.ok(batch.questions.every(question => questions.includes(question)));
      const stems = batch.questions.map(question => question.question);
      assert.equal(new Set([...previousStems, ...stems]).size, previousStems.length + stems.length);
      draws.push(...ids);
      previousIds = ids;
      previousStems = stems;
      seenIds = batch.seenIds;
      const cycleStart = Math.floor((draws.length - 1) / questions.length) * questions.length;
      assert.deepEqual(new Set(seenIds), new Set(draws.slice(cycleStart)));
    }
    for (let start = 0; start + questions.length <= draws.length; start += questions.length) {
      assert.deepEqual(new Set(draws.slice(start, start + questions.length)), expected);
    }
  });
}

test('new sets are drawn in random order without changing the question bank', () => {
  const original = [...bank];
  const first = drawPracticeBatch(bank, 20, [], [], () => 0);
  const second = drawPracticeBatch(bank, 20, [], [], () => 0.99);
  assert.notDeepEqual(first.questions, second.questions);
  assert.deepEqual(bank, original);
});

test('retrying a set changes its question and choice orders even when the shuffle would repeat them', () => {
  const first = createPracticeSetSession(bank, settings, undefined, {}, () => 0.99);
  const firstQuestion = QUESTION_MAP[first.session.ids[0]];
  const result = finishSession(submitAnswer(first.session, firstQuestion.answer, QUESTION_MAP));
  const originalResult = structuredClone(result);
  const originalProgress = structuredClone(first.progress);
  const retry = createPracticeSetSession(bank, settings, first.progress, { previousAttempt: result }, () => 0.99);
  assert.equal(retry.session.mode, 'sets');
  assert.equal(retry.session.ids.length, 20);
  assert.notDeepEqual(retry.session.ids, result.ids);
  assert.deepEqual(new Set(retry.session.ids), new Set(result.ids));
  assert.ok(samePracticeSet(first.progress.previousIds, retry.session.ids));
  assert.deepEqual(retry.session.pending, retry.session.ids);
  assert.equal(retry.session.finishedAt, null);
  assert.equal(retry.session.feedbackId, null);
  assert.notEqual(retry.session.id, result.id);
  for (const id of result.ids) {
    assert.deepEqual(new Set(retry.session.choiceOrders[id]), new Set(result.choiceOrders[id]));
    assert.notDeepEqual(retry.session.choiceOrders[id], result.choiceOrders[id]);
  }
  assert.deepEqual(retry.session.answers, {});
  assert.equal(scoreSession(retry.session, QUESTION_MAP).correct, 0);
  assert.deepEqual(retry.progress, originalProgress);
  assert.deepEqual(first.progress, originalProgress);
  assert.deepEqual(result, originalResult);
});

test('retrying an older set leaves the current set and the next advance intact', () => {
  const random = () => 0.37;
  const first = createPracticeSetSession(bank, settings, undefined, {}, random);
  const current = createPracticeSetSession(bank, settings, first.progress, { advance: true }, random);
  assert.ok(current.session.ids.every(id => !first.session.ids.includes(id)));
  const saved = structuredClone(current.progress);
  const retry = createPracticeSetSession(bank, settings, current.progress, { previousAttempt: first.session }, random);
  assert.notDeepEqual(retry.session.ids, first.session.ids);
  assert.deepEqual(new Set(retry.session.ids), new Set(first.session.ids));
  assert.equal(samePracticeSet(current.session.ids, retry.session.ids), false);
  assert.deepEqual(retry.progress, saved);
  const restart = createPracticeSetSession(bank, settings, retry.progress, {}, random);
  assert.notDeepEqual(restart.session.ids, current.session.ids);
  assert.deepEqual(new Set(restart.session.ids), new Set(current.session.ids));
  const next = createPracticeSetSession(bank, settings, restart.progress, { advance: true }, random);
  assert.equal(next.progress.seenIds.length, 60);
  assert.ok(next.session.ids.every(id => !saved.seenIds.includes(id)));
  assert.deepEqual(current.progress, saved);
});
