import test from 'node:test';
import assert from 'node:assert/strict';
import { SOURCE, SUBJECT_MAP, QUESTION_MAP } from '../data/index.js';
import { createSession, createMissedSession, createUnknownSession, markUnknown, submitAnswer, advanceQuestion, finishSession, missedQuestionIds, scoreSession, validateSession } from '../engine.js';
import { readState, saveState, readRetry, saveRetry } from '../storage.js';

const bank = SUBJECT_MAP['general-knowledge'].questions;
const settings = { sourceId: SOURCE.id, testId: 'general-knowledge' };
const createFull = (count = bank.length) => ({
  ...createSession(bank, { ...settings, count, randomize: false }, () => 0.99), mode: 'all',
});
const copy = value => structuredClone(value);
const respond = session => {
  const question = QUESTION_MAP[session.pending[0]];
  return advanceQuestion(submitAnswer(session, question.answer, QUESTION_MAP));
};
function completeCorrect(session) {
  while (session.finishedAt === null) session = respond(session);
  return session;
}
function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}
function withRetryStorage(operation) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const storage = memoryStorage();
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  try { return operation(storage); }
  finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else delete globalThis.sessionStorage;
  }
}

test('I do not know records the current full-test question and advances without awarding an answer', () => {
  const original = createFull();
  const before = copy(original);
  const id = original.pending[0];
  const next = markUnknown(original, QUESTION_MAP);
  assert.deepEqual(next.unknownIds, [id]);
  assert.deepEqual(next.pending, original.pending.slice(1));
  assert.equal(Object.hasOwn(next.answers, id), false);
  assert.equal(next.feedbackId, null);
  assert.equal(next.finishedAt, null);
  assert.deepEqual(next.ids, original.ids);
  assert.deepEqual(next.choiceOrders, original.choiceOrders);
  assert.deepEqual(original, before);
  assert.ok(validateSession(next, QUESTION_MAP, SOURCE.id));
  const score = scoreSession(next, QUESTION_MAP);
  assert.equal(score.correct, 0);
  assert.equal(score.answered, 0);
  assert.equal(score.unanswered, bank.length);
  assert.ok(missedQuestionIds(next, QUESTION_MAP).includes(id));
});

test('marking the last pending question unknown completes the test with an exact known/unknown partition', () => {
  let session = createFull(3);
  const first = session.pending[0];
  session = markUnknown(session, QUESTION_MAP);
  session = respond(session);
  const last = session.pending[0];
  session = markUnknown(session, QUESTION_MAP);
  assert.deepEqual(session.unknownIds, [first, last]);
  assert.deepEqual(session.pending, []);
  assert.equal(session.feedbackId, null);
  assert.ok(session.finishedAt >= session.startedAt);
  assert.ok(validateSession(session, QUESTION_MAP, SOURCE.id));
  assert.deepEqual(scoreSession(session, QUESTION_MAP), {
    total: 3, answered: 1, correct: 1, incorrect: 0, unanswered: 2, required: 3, percent: 33, passed: false,
  });
});

test('an all-unknown full General Knowledge test can finish and persist without any scored answers', () => {
  let session = createFull();
  while (session.finishedAt === null) session = markUnknown(session, QUESTION_MAP);
  assert.deepEqual(session.unknownIds, session.ids);
  assert.deepEqual(session.answers, {});
  assert.ok(validateSession(session, QUESTION_MAP, SOURCE.id));
  const storage = memoryStorage();
  assert.equal(saveState({ active: null, results: [session] }, storage), true);
  assert.deepEqual(readState(QUESTION_MAP, SOURCE.id, storage).results, [session]);
  assert.equal(scoreSession(session, QUESTION_MAP).percent, 0);
});

test('unknown markings, remaining order and answer feedback survive save and resume of the full test', () => {
  let active = markUnknown(createFull(), QUESTION_MAP);
  const question = QUESTION_MAP[active.pending[0]];
  active = submitAnswer(active, question.answer, QUESTION_MAP);
  const storage = memoryStorage();
  const saved = { active, results: [] };
  assert.equal(saveState(saved, storage), true);
  const restored = readState(QUESTION_MAP, SOURCE.id, storage);
  assert.deepEqual(restored, saved);
  const next = advanceQuestion(restored.active);
  assert.equal(next.feedbackId, null);
  assert.deepEqual(next.unknownIds, active.unknownIds);
  assert.deepEqual(next.pending, active.pending);
  assert.ok(validateSession(next, QUESTION_MAP, SOURCE.id));
});

test('I do not know is inert during feedback, after completion and outside supported General Knowledge modes', () => {
  const all = createFull(2);
  const question = QUESTION_MAP[all.pending[0]];
  const feedback = submitAnswer(all, question.answer, QUESTION_MAP);
  const complete = finishSession(all);
  const unsupported = ['practice', 'sets', 'numbers', 'missed'].map(mode => ({ ...all, mode }));
  const air = { ...createSession(SUBJECT_MAP['air-brakes'].questions, { sourceId: SOURCE.id, testId: 'air-brakes', count: 2 }), mode: 'all' };
  for (const session of [feedback, complete, ...unsupported, air]) {
    const before = copy(session);
    assert.equal(markUnknown(session, QUESTION_MAP), session);
    assert.deepEqual(session, before);
  }
});

test('unknown session validation rejects malformed, overlapping and out-of-scope unknown IDs', () => {
  const base = markUnknown(createFull(4), QUESTION_MAP);
  const mutations = [
    s => { s.unknownIds = null; },
    s => { s.unknownIds = 'gk-001'; },
    s => { s.unknownIds.push(s.unknownIds[0]); },
    s => { s.unknownIds = ['missing']; },
    s => { s.unknownIds = ['docx-01']; },
    s => { s.unknownIds = [bank[10].id]; },
    s => { s.unknownIds.push(s.pending[0]); },
    s => { s.pending.push(s.unknownIds[0]); },
    s => { s.answers[s.unknownIds[0]] = 0; },
    s => { delete s.unknownIds; },
    s => { s.mode = 'practice'; },
    s => { s.feedbackId = s.unknownIds[0]; },
  ];
  for (const mutate of mutations) {
    const invalid = copy(base); mutate(invalid);
    assert.equal(validateSession(invalid, QUESTION_MAP, SOURCE.id), false, mutate.toString());
  }
  assert.equal(validateSession({ ...createFull(2), mode: 'numbers', unknownIds: [] }, QUESTION_MAP, SOURCE.id), false);
  const legacy = createFull(2);
  assert.equal(Object.hasOwn(legacy, 'unknownIds'), false);
  assert.ok(validateSession(legacy, QUESTION_MAP, SOURCE.id));
  assert.ok(validateSession({ ...legacy, unknownIds: [] }, QUESTION_MAP, SOURCE.id));
});

test('perfect unknown-practice attempts retain the full original set across repeated fresh shuffles', () => {
  const ids = bank.slice(0, 6).map(question => question.id);
  const originalIds = [...ids];
  let attempt = createUnknownSession(ids, QUESTION_MAP, SOURCE.id, undefined, () => 0.99);
  assert.equal(attempt.mode, 'unknown-practice');
  assert.equal(attempt.testId, 'general-knowledge');
  for (let iteration = 0; iteration < 4; iteration++) {
    const completed = completeCorrect(attempt);
    assert.ok(scoreSession(completed, QUESTION_MAP).passed);
    assert.deepEqual(missedQuestionIds(completed, QUESTION_MAP), []);
    const before = copy(completed);
    const next = createUnknownSession(completed.ids, QUESTION_MAP, SOURCE.id, completed, () => 0.99);
    assert.deepEqual([...next.ids].sort(), [...ids].sort());
    assert.notDeepEqual(next.ids, completed.ids);
    assert.deepEqual(next.pending, next.ids);
    assert.deepEqual(next.answers, {});
    assert.equal(next.unknownIds, undefined);
    assert.equal(next.feedbackId, null);
    assert.equal(next.finishedAt, null);
    assert.notEqual(next.id, completed.id);
    for (const id of ids) assert.notDeepEqual(next.choiceOrders[id], completed.choiceOrders[id]);
    assert.ok(validateSession(next, QUESTION_MAP, SOURCE.id));
    assert.deepEqual(completed, before);
    attempt = next;
  }
  assert.deepEqual(ids, originalIds);
});

test('an unknown-practice question stays in the repeat set whether answered correctly or marked unknown again', () => {
  const ids = bank.slice(0, 3).map(question => question.id);
  let session = createUnknownSession(ids, QUESTION_MAP, SOURCE.id, undefined, () => 0.99);
  session = respond(session);
  session = markUnknown(session, QUESTION_MAP);
  session = respond(session);
  assert.ok(validateSession(session, QUESTION_MAP, SOURCE.id));
  assert.equal(session.unknownIds.length, 1);
  const next = createUnknownSession(session.ids, QUESTION_MAP, SOURCE.id, session, () => 0.99);
  assert.equal(next.ids.length, 3);
  assert.deepEqual([...next.ids].sort(), [...ids].sort());
});

test('a one-question unknown-practice set remains repeatable and still reshuffles its answer choices', () => {
  const ids = [bank[0].id];
  const first = completeCorrect(createUnknownSession(ids, QUESTION_MAP, SOURCE.id, undefined, () => 0.99));
  const second = createUnknownSession(first.ids, QUESTION_MAP, SOURCE.id, first, () => 0.99);
  assert.deepEqual(second.ids, first.ids);
  assert.notDeepEqual(second.choiceOrders[ids[0]], first.choiceOrders[ids[0]]);
  assert.notEqual(second.id, first.id);
  assert.ok(validateSession(second, QUESTION_MAP, SOURCE.id));
});

test('unknown-practice routes reject empty, duplicate, missing and non-General Knowledge identifiers', () => {
  for (const ids of [undefined, null, '', [], ['missing'], ['__proto__'], ['constructor'], [bank[0].id, bank[0].id], ['docx-01'], ['cv-001'], [bank[0].id, 'docx-01'], [null]]) {
    assert.equal(createUnknownSession(ids, QUESTION_MAP, SOURCE.id), null, JSON.stringify(ids));
  }
});

test('unknown practice and missed retries retain independent attempt histories through saves and reloads', () => {
  withRetryStorage(() => {
    const ids = bank.slice(0, 3).map(question => question.id);
    const first = createUnknownSession(ids, QUESTION_MAP, SOURCE.id);
    const active = markUnknown(first, QUESTION_MAP);
    assert.equal(saveRetry(active), true);
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id), active);
    const completed = completeCorrect(active);
    assert.equal(saveRetry(completed), true);
    const second = createUnknownSession(completed.ids, QUESTION_MAP, SOURCE.id, completed);
    assert.equal(saveRetry(second), true);
    const missed = createMissedSession(['docx-01', 'docx-02'], QUESTION_MAP, SOURCE.id);
    assert.equal(saveRetry(missed), true);
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id), missed);
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id, first.id), completed);
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id, second.id), second);
    assert.equal(readRetry(QUESTION_MAP, SOURCE.id, 'not-an-attempt'), null);
    assert.equal(saveRetry(null), true);
    assert.equal(readRetry(QUESTION_MAP, SOURCE.id, first.id), null);
  });
});

test('unknown-practice factories reject unusable source maps and incompatible previous attempts', () => {
  const ids = [bank[0].id];
  assert.equal(createUnknownSession(ids, null, SOURCE.id), null);
  assert.equal(createUnknownSession(ids, QUESTION_MAP, ''), null);
  assert.equal(createUnknownSession(ids, QUESTION_MAP, SOURCE.id, {}), null);
  const otherSubject = createMissedSession(['docx-01'], QUESTION_MAP, SOURCE.id);
  assert.equal(createUnknownSession(ids, QUESTION_MAP, SOURCE.id, otherSubject), null);
  assert.equal(validateSession({ ...otherSubject, mode: 'unknown-practice' }, QUESTION_MAP, SOURCE.id), false);
});

test('unknown-practice reload preserves markings while migrating an expanded answer-choice bank', () => {
  withRetryStorage(() => {
    const expanded = bank.find(question => Number.isInteger(question.previousChoiceCount));
    assert.ok(expanded, 'The bank contains an expanded-choice question for migration coverage');
    const other = bank.find(question => question.id !== expanded.id);
    const session = createUnknownSession([expanded.id, other.id], QUESTION_MAP, SOURCE.id, undefined, () => 0.99);
    const active = markUnknown(session, QUESTION_MAP);
    const legacy = {
      ...active,
      choiceOrders: { ...active.choiceOrders, [expanded.id]: Array.from({ length: expanded.previousChoiceCount }, (_, index) => index) },
    };
    assert.equal(saveRetry(legacy), true);
    const restored = readRetry(QUESTION_MAP, SOURCE.id, legacy.id);
    assert.deepEqual(restored.unknownIds, active.unknownIds);
    assert.deepEqual(restored.pending, active.pending);
    assert.deepEqual(restored.answers, active.answers);
    assert.deepEqual(restored.choiceOrders[expanded.id], expanded.choices.map((_, index) => index));
    assert.equal(restored.mode, 'unknown-practice');
    assert.ok(validateSession(restored, QUESTION_MAP, SOURCE.id));
  });
});
