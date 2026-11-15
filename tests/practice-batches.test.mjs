import test from 'node:test';
import assert from 'node:assert/strict';
import { SOURCE, QUESTION_MAP, SUBJECT_MAP } from '../data/index.js';
import { createPracticeSetSession, drawPracticeBatch, finishSession, samePracticeSet, scoreSession, submitAnswer } from '../engine.js';

const bank = SUBJECT_MAP['general-knowledge'].questions;
const settings = { sourceId: SOURCE.id, testId: 'general-knowledge', count: 20 };
for (const questions of [bank, bank.slice(0, 40)]) {
  test(`sets grow by 20 up to all ${questions.length} questions and shuffle the combined set`, () => {
    const random = () => 0.37;
    let current = createPracticeSetSession(questions, settings, undefined, {}, random);
    assert.equal(current.session.ids.length, Math.min(20, questions.length));

    while (current.session.ids.length < questions.length) {
      const before = structuredClone(current);
      const oldIds = new Set(current.session.ids);
      const expanded = createPracticeSetSession(questions, settings, current.progress,
        { advance: true, previousAttempt: current.session }, random);
      const ids = expanded.session.ids;
      assert.equal(ids.length, Math.min(oldIds.size + 20, questions.length));
      assert.equal(new Set(ids).size, ids.length);
      assert.ok(current.session.ids.every(id => ids.includes(id)));
      assert.ok(ids.slice(0, oldIds.size).some(id => !oldIds.has(id)));
      assert.deepEqual(expanded.session.pending, ids);
      assert.deepEqual(expanded.session.answers, {});
      assert.deepEqual(new Set(expanded.progress.previousIds), new Set(ids));
      assert.deepEqual(new Set(expanded.progress.seenIds), new Set(ids));
      for (const id of oldIds) assert.notDeepEqual(expanded.session.choiceOrders[id], current.session.choiceOrders[id]);
      assert.equal(scoreSession(expanded.session, QUESTION_MAP).required, Math.ceil(ids.length * 0.8));
      assert.deepEqual(current, before);
      current = expanded;
    }

    assert.deepEqual(new Set(current.session.ids), new Set(questions.map(question => question.id)));
    const full = createPracticeSetSession(questions, settings, current.progress, { advance: true }, random);
    assert.ok(samePracticeSet(current.session.ids, full.session.ids));
  });
}

test('new additions prioritize unseen IDs and defer repeated question wording', () => {
  const small = bank.slice(0, 6).map((question, index) => ({ ...question, question: ['A', 'A', 'B', 'B', 'D', 'E'][index] }));
  const [current, duplicateCurrent, newStem, duplicateNew, earlier, unseen] = small;
  const seen = [earlier.id, current.id];
  const batch = drawPracticeBatch(small, 2, [current.id], seen, () => 0.99);
  assert.deepEqual(batch.questions, [newStem, unseen]);
  const remaining = drawPracticeBatch(small, 20, [current.id, newStem.id, unseen.id], batch.seenIds, () => 0.99);
  assert.deepEqual(remaining.questions.map(q => q.id), [duplicateCurrent.id, duplicateNew.id, earlier.id]);
  assert.equal(new Set(remaining.seenIds).size, small.length);
});

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
  assert.equal(current.session.ids.length, 40);
  assert.ok(first.session.ids.every(id => current.session.ids.includes(id)));
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
  assert.equal(next.session.ids.length, 60);
  assert.ok(saved.previousIds.every(id => next.session.ids.includes(id)));
  assert.deepEqual(current.progress, saved);
});
