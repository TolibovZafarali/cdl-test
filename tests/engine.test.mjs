import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS, QUESTION_MAP, SOURCE } from '../data/index.js';
import { createSession, createMissedSession, missedQuestionIds, getChoiceOrder, getChoiceText, getCorrectAnswerUz, submitAnswer, advanceQuestion, skipQuestion, finishSession, scoreSession, validateSession } from '../engine.js';
import { emptyState, readState, saveState, clearState, readRetry, saveRetry } from '../storage.js';

const options = { sourceId: SOURCE.id, testId: 'air-brakes', count: 25 };
const create = settings => createSession(QUESTIONS, { ...options, ...settings }, () => 0.37);
const clone = value => structuredClone(value);
const respond = (session, correct = true) => {
  const question = QUESTION_MAP[session.pending[0]];
  return advanceQuestion(submitAnswer(session, correct ? question.answer : (question.answer + 1) % question.choices.length, QUESTION_MAP));
};
function complete(session, correctCount) {
  for (let index = 0; index < session.ids.length; index++) session = respond(session, index < correctCount);
  return session;
}
function memoryStorage(value = null) {
  return {
    value, keys: [],
    getItem(key) { this.keys.push(key); return this.value; },
    setItem(key, next) { this.keys.push(key); this.value = next; },
    removeItem(key) { this.keys.push(key); this.value = null; },
  };
}

const categories = [
  ['general-knowledge', 20],
  ['air-brakes', 25],
  ['combination-vehicles', 20],
];

for (const [testId, sampleCount] of categories) {
  for (const count of [sampleCount, QUESTIONS.filter(q => q.testId === testId).length]) {
    const required = Math.ceil(count * 0.8);
    test(`${testId}: ${required} of ${count} passes and one fewer fails`, () => {
      for (const correct of [required, required - 1]) {
        const session = complete(create({ testId, count }), correct);
        const score = scoreSession(session, QUESTION_MAP);
        assert.equal(score.total, count);
        assert.equal(score.answered, count);
        assert.equal(score.correct, correct);
        assert.equal(score.incorrect, count - correct);
        assert.equal(score.unanswered, 0);
        assert.equal(score.required, required);
        assert.equal(score.percent, Math.round(correct / count * 100));
        assert.equal(score.passed, correct === required);
        assert.ok(session.finishedAt >= session.startedAt);
        assert.ok(validateSession(session, QUESTION_MAP, SOURCE.id));
      }
    });
  }

  test(`${testId}: random tests remain within the selected subject and preserve choices`, () => {
    const original = JSON.stringify(QUESTIONS.map(question => question.choices));
    const settings = { ...options, testId, count: sampleCount };
    const first = createSession(QUESTIONS, settings, () => 0);
    const second = createSession(QUESTIONS, settings, () => 0.99);
    assert.equal(first.ids.length, sampleCount);
    assert.equal(new Set(first.ids).size, sampleCount);
    assert.ok(first.ids.every(id => QUESTION_MAP[id].testId === testId));
    assert.notDeepEqual(first.ids, second.ids);
    complete(first, sampleCount);
    complete(second, sampleCount);
    assert.equal(JSON.stringify(QUESTIONS.map(question => question.choices)), original);
    assert.deepEqual(Object.keys(first.choiceOrders), first.ids);
    for (const id of first.ids) {
      assert.deepEqual([...first.choiceOrders[id]].sort(), QUESTION_MAP[id].choices.map((_, index) => index));
    }
  });

  test(`${testId}: full tests shuffle every question once and preserve that order on resume`, () => {
    const expected = QUESTIONS.filter(q => q.testId === testId).map(q => q.id);
    const settings = { ...options, testId, count: 999, randomize: true };
    const first = createSession(QUESTIONS, settings, () => 0);
    const second = createSession(QUESTIONS, settings, () => 0.37);
    for (const session of [first, second]) {
      assert.equal(session.ids.length, expected.length);
      assert.equal(new Set(session.ids).size, expected.length);
      assert.deepEqual([...session.ids].sort(), [...expected].sort());
      assert.notDeepEqual(session.ids, expected);
      assert.deepEqual(session.pending, session.ids);
    }
    assert.notDeepEqual(first.ids, second.ids);

    const active = { ...skipQuestion(respond(first)), mode: 'all' };
    const storage = memoryStorage();
    assert.equal(saveState({ active, results: [] }, storage), true);
    const restored = readState(QUESTION_MAP, SOURCE.id, storage).active;
    assert.deepEqual(restored, active);
    assert.deepEqual(restored.ids, first.ids);
    assert.equal(restored.pending[0], first.ids[2]);
    assert.equal(restored.pending.at(-1), first.ids[1]);
  });
}

test('new sessions shuffle two- and three-choice questions without changing source content', () => {
  const questions = [QUESTION_MAP['cv-053'], QUESTION_MAP['cv-028']];
  const original = JSON.stringify(questions);
  const settings = { sourceId: SOURCE.id, testId: 'combination-vehicles', count: 2, randomize: false };
  const first = createSession(questions, settings, () => 0);
  const second = createSession(questions, settings, () => 0.99);
  assert.deepEqual(first.ids, questions.map(q => q.id));
  assert.deepEqual(second.ids, first.ids);
  for (const question of questions) {
    const originalOrder = question.choices.map((_, index) => index);
    const order = getChoiceOrder(first, question);
    assert.deepEqual([...order].sort(), originalOrder);
    assert.notDeepEqual(order, getChoiceOrder(second, question));
    assert.notEqual(order.indexOf(question.answer), getChoiceOrder(second, question).indexOf(question.answer));
    assert.ok(validateSession(first, QUESTION_MAP, SOURCE.id));
  }
  assert.equal(JSON.stringify(questions), original);
});

test('displayed choices map back to canonical scoring regardless of correct-answer position', () => {
  for (const question of [QUESTION_MAP['cv-053'], QUESTION_MAP['cv-028']]) {
    const initial = createSession([question], { sourceId: SOURCE.id, testId: question.testId, count: 1 });
    const baseOrder = question.choices.map((_, index) => index);
    for (let offset = 0; offset < baseOrder.length; offset++) {
      const order = [...baseOrder.slice(offset), ...baseOrder.slice(0, offset)];
      const session = { ...initial, choiceOrders: { [question.id]: order } };
      const displayedCorrect = order.indexOf(question.answer);
      const answered = submitAnswer(session, order[displayedCorrect], QUESTION_MAP);
      assert.equal(answered.answers[question.id], question.answer);
      assert.equal(scoreSession(answered, QUESTION_MAP).correct, 1);
      assert.deepEqual(getChoiceOrder(answered, question), order);
      const wrong = order[(displayedCorrect + 1) % order.length];
      assert.equal(submitAnswer(answered, wrong, QUESTION_MAP), answered);
      assert.equal(scoreSession(submitAnswer(session, wrong, QUESTION_MAP), QUESTION_MAP).correct, 0);
    }
  }
});

test('positional answer references name the displayed choices at every combined-answer position', () => {
  for (const id of ['gk-093', 'cv-028', 'gk-285']) {
    const question = QUESTION_MAP[id];
    const original = [...question.choices];
    for (const order of [[2, 0, 1], [0, 2, 1], [0, 1, 2], [1, 0, 2], [1, 2, 0], [2, 1, 0]]) {
      const session = { choiceOrders: { [id]: order } };
      const first = String.fromCharCode(65 + order.indexOf(0));
      const second = String.fromCharCode(65 + order.indexOf(1));
      const expected = `Both ${first} and ${second}${id === 'cv-028' ? ' are correct' : ''}.`;
      assert.equal(getChoiceText(session, question, 2), expected);
      if (question.answer === 2) {
        assert.equal(getCorrectAnswerUz(session, question), question.correctAnswerUz.replace('{first}', first).replace('{second}', second));
      }
      assert.equal(getChoiceText(session, question, 0), original[0]);
      assert.equal(getChoiceText(session, question, 1), original[1]);
    }
    assert.equal(getChoiceText({}, question, 2), original[2]);
    assert.equal(getCorrectAnswerUz({}, question), question.correctAnswerUz.replace('{first}', 'A').replace('{second}', 'B'));
    assert.deepEqual(question.choices, original);
  }
});

test('saved choice orders persist through feedback, skipped questions, and completed results', () => {
  let active = create({ count: 3 });
  const originalOrders = clone(active.choiceOrders);
  active = skipQuestion(active);
  const question = QUESTION_MAP[active.pending[0]];
  active = submitAnswer(active, getChoiceOrder(active, question)[0], QUESTION_MAP);
  const storage = memoryStorage();
  saveState({ active, results: [] }, storage);
  const restored = readState(QUESTION_MAP, SOURCE.id, storage).active;
  assert.deepEqual(restored.choiceOrders, originalOrders);
  assert.deepEqual(restored, active);
  const result = finishSession(restored);
  saveState({ active: null, results: [result] }, storage);
  const savedResult = readState(QUESTION_MAP, SOURCE.id, storage).results[0];
  assert.deepEqual(savedResult, result);
  assert.deepEqual(getChoiceOrder(savedResult, question), originalOrders[question.id]);
});

test('sessions saved before answer shuffling retain source order and original scoring', () => {
  const active = respond(create({ count: 3 }));
  delete active.choiceOrders;
  const result = finishSession(respond(create({ count: 2 })));
  delete result.choiceOrders;
  const saved = { active, results: [result] };
  const restored = readState(QUESTION_MAP, SOURCE.id, memoryStorage(JSON.stringify(saved)));
  assert.deepEqual(restored, saved);
  for (const session of [restored.active, restored.results[0]]) {
    assert.ok(validateSession(session, QUESTION_MAP, SOURCE.id));
    assert.equal(scoreSession(session, QUESTION_MAP).correct, 1);
    for (const id of session.ids) {
      const question = QUESTION_MAP[id];
      assert.deepEqual(getChoiceOrder(session, question), question.choices.map((_, index) => index));
      assert.deepEqual(question.choices.map((_, index) => getChoiceText(session, question, index)), question.choices);
    }
  }
});

test('saved choice orders reject missing, extra, duplicate, or invalid indices', () => {
  const original = create({ count: 2 });
  const id = original.ids[0];
  const mutations = [
    session => { session.choiceOrders = null; },
    session => { session.choiceOrders = undefined; },
    session => { session.choiceOrders = []; },
    session => { delete session.choiceOrders[id]; },
    session => { session.choiceOrders.unknown = [0, 1, 2]; },
    session => { session.choiceOrders[id] = [0, 0, 2]; },
    session => { session.choiceOrders[id] = [0, 1]; },
    session => { session.choiceOrders[id] = [0, 1, 2, 3]; },
    session => { session.choiceOrders[id] = [0, 1, '2']; },
    session => { session.choiceOrders[id] = [0, 1, -1]; },
    session => { session.choiceOrders[id] = [0, 1, 3]; },
    session => { session.choiceOrders[id] = [0, 1, 1.5]; },
    session => { session.choiceOrders[id] = [0, 1, NaN]; },
    session => { session.choiceOrders[id] = [0, 1, null]; },
    session => { delete session.choiceOrders[id][0]; },
    session => { session.choiceOrders = Object.create(session.choiceOrders); },
  ];
  for (const mutate of mutations) {
    const invalid = clone(original);
    mutate(invalid);
    assert.equal(validateSession(invalid, QUESTION_MAP, SOURCE.id), false, mutate.toString());
    if (invalid.choiceOrders !== undefined) {
      assert.equal(readState(QUESTION_MAP, SOURCE.id, memoryStorage(JSON.stringify({ active: invalid }))).active, null);
    }
  }
});

test('saved subject sessions reject questions belonging to a different subject', () => {
  const session = create();
  const alien = QUESTIONS.find(q => q.testId === 'general-knowledge').id;
  const invalid = { ...session, ids: [alien, ...session.ids.slice(1)], pending: [alien, ...session.pending.slice(1)] };
  assert.equal(validateSession(invalid, QUESTION_MAP, SOURCE.id), false);
  assert.equal(readState(QUESTION_MAP, SOURCE.id, memoryStorage(JSON.stringify({ active: invalid }))).active, null);
});

test('combined-source storage rejects global and mixed-subject sessions', () => {
  const current = create();
  const general = QUESTIONS.find(q => q.testId === 'general-knowledge').id;
  const allAir = { ...current, testId: 'all' };
  const mixed = { ...allAir, ids: [current.ids[0], general], pending: [current.ids[0], general] };
  delete mixed.choiceOrders;
  const unknown = { ...current, testId: 'unavailable-subject' };
  assert.ok(validateSession(allAir, QUESTION_MAP, SOURCE.id));
  assert.ok(validateSession(mixed, QUESTION_MAP, SOURCE.id));
  for (const active of [allAir, mixed, unknown]) {
    const storage = memoryStorage(JSON.stringify({ active, results: [finishSession(active)] }));
    assert.deepEqual(readState(QUESTION_MAP, SOURCE.id, storage), emptyState());
  }
});

test('skip rotates all unanswered questions without duplicates or lost answers', () => {
  let session = create();
  const initial = [...session.pending];
  for (let index = 0; index < initial.length; index++) session = skipQuestion(session);
  assert.deepEqual(session.pending, initial);
  assert.deepEqual(session.answers, {});
  session = respond(session);
  const answered = initial[0];
  session = skipQuestion(session);
  assert.ok(!session.pending.includes(answered));
  assert.equal(session.answers[answered], QUESTION_MAP[answered].answer);
  assert.equal(session.pending.length, 24);
  assert.ok(validateSession(session, QUESTION_MAP, SOURCE.id));
});

test('the last pending question cannot be skipped and advancing after its answer completes the test', () => {
  let session = create({ count: 2 });
  session = respond(session);
  assert.equal(skipQuestion(session), session);
  assert.equal(session.finishedAt, null);
  session = respond(session);
  assert.deepEqual(session.pending, []);
  assert.notEqual(session.finishedAt, null);
  assert.equal(submitAnswer(session, 0, QUESTION_MAP), session);
  assert.equal(skipQuestion(session), session);
});

test('manual completion keeps unanswered questions in the score denominator', () => {
  const session = finishSession(respond(create()));
  const score = scoreSession(session, QUESTION_MAP);
  assert.deepEqual(score, { total: 25, answered: 1, correct: 1, incorrect: 0, unanswered: 24, required: 20, percent: 4, passed: false });
  assert.ok(validateSession(session, QUESTION_MAP, SOURCE.id));
  assert.equal(finishSession(session), session);
});

test('retrying a finished test starts a fresh attempt with exactly its incorrect and unanswered questions', () => {
  for (const [testId, mode] of [['general-knowledge', 'sets'], ['air-brakes', 'all'], ['combination-vehicles', 'practice']]) {
    const original = { ...create({ testId, count: 3 }), mode };
    const [, wrong, unanswered] = original.ids;
    const result = finishSession(respond(respond(original), false));
    const savedResult = clone(result);
    const ids = missedQuestionIds(result, QUESTION_MAP);
    assert.deepEqual(new Set(ids), new Set([wrong, unanswered]));
    const retry = createMissedSession(ids, QUESTION_MAP, SOURCE.id);
    assert.deepEqual(new Set(retry.ids), new Set(ids));
    assert.deepEqual(retry.pending, retry.ids);
    assert.deepEqual(retry.answers, {});
    assert.equal(retry.mode, 'missed');
    assert.equal(retry.testId, testId);
    assert.notEqual(retry.id, result.id);
    assert.ok(validateSession(retry, QUESTION_MAP, SOURCE.id));
    const finishedRetry = complete(retry, 2);
    assert.equal(scoreSession(finishedRetry, QUESTION_MAP).percent, 100);
    assert.deepEqual(result, savedResult);
  }
});

test('each retry narrows to its own missed questions and a perfect score has none to retry', () => {
  const result = complete(create({ count: 10 }), 8);
  assert.ok(scoreSession(result, QUESTION_MAP).passed);
  const retry = createMissedSession(missedQuestionIds(result, QUESTION_MAP), QUESTION_MAP, SOURCE.id);
  const stillMissed = retry.ids[1];
  const nextIds = missedQuestionIds(complete(retry, 1), QUESTION_MAP);
  const next = createMissedSession(nextIds, QUESTION_MAP, SOURCE.id);
  assert.deepEqual(next.ids, [stillMissed]);
  assert.deepEqual(missedQuestionIds(complete(next, 1), QUESTION_MAP), []);
});

test('invalid missed-question links cannot create empty, duplicate, unknown or mixed-subject tests', () => {
  for (const ids of [[], ['docx-01', 'docx-01'], ['unknown'], ['constructor'], ['docx-01', 'gk-001']]) {
    assert.equal(createMissedSession(ids, QUESTION_MAP, SOURCE.id), null);
  }
});

test('a saved retry resumes its answer feedback in the same tab and starts independently in another', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const firstTab = memoryStorage();
  const secondTab = memoryStorage();
  let tab = firstTab;
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get: () => tab });
  try {
    const retry = createMissedSession(['docx-01', 'docx-02'], QUESTION_MAP, SOURCE.id);
    const active = submitAnswer(retry, QUESTION_MAP[retry.pending[0]].answer, QUESTION_MAP);
    assert.equal(saveRetry(active), true);
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id), active);
    tab = secondTab;
    assert.equal(readRetry(QUESTION_MAP, SOURCE.id), null);
    assert.equal(saveRetry(finishSession(retry)), true);
    tab = firstTab;
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id), active);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else delete globalThis.sessionStorage;
  }
});

test('different retries retain their own answers and order when restored by attempt ID', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const storage = memoryStorage();
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  try {
    const first = createMissedSession(['docx-01', 'docx-02'], QUESTION_MAP, SOURCE.id);
    const active = submitAnswer(first, QUESTION_MAP[first.pending[0]].answer, QUESTION_MAP);
    const second = createMissedSession(['docx-03', 'docx-04'], QUESTION_MAP, SOURCE.id);
    assert.equal(saveRetry(active), true);
    assert.equal(saveRetry(second), true);
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id), second);
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id, first.id), active);
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id, second.id), second);
    assert.equal(readRetry(QUESTION_MAP, SOURCE.id, 'missing-attempt'), null);
    const finished = finishSession(active);
    assert.equal(saveRetry(finished), true);
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id, first.id), finished);
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id, second.id), second);
    assert.equal(JSON.parse(storage.value).sessions.length, 2);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else delete globalThis.sessionStorage;
  }
});

test('legacy retries survive the next attempt and clearing removes the full retry history', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const first = createMissedSession(['docx-01'], QUESTION_MAP, SOURCE.id);
  const storage = memoryStorage(JSON.stringify(first));
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  try {
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id), first);
    const second = createMissedSession(['docx-02'], QUESTION_MAP, SOURCE.id);
    assert.equal(saveRetry(second), true);
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id, first.id), first);
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id), second);
    assert.equal(saveRetry(null), true);
    assert.equal(readRetry(QUESTION_MAP, SOURCE.id, first.id), null);
    assert.equal(readRetry(QUESTION_MAP, SOURCE.id, second.id), null);
    assert.equal(readRetry(QUESTION_MAP, SOURCE.id), null);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else delete globalThis.sessionStorage;
  }
});

test('retry history is bounded and expired attempts never resolve to another retry', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const storage = memoryStorage();
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  try {
    const attempts = Array.from({ length: 21 }, () => createMissedSession(['docx-01'], QUESTION_MAP, SOURCE.id));
    for (const attempt of attempts) assert.equal(saveRetry(attempt), true);
    assert.equal(JSON.parse(storage.value).sessions.length, 20);
    assert.equal(readRetry(QUESTION_MAP, SOURCE.id, attempts[0].id), null);
    for (const attempt of attempts.slice(1)) assert.deepEqual(readRetry(QUESTION_MAP, SOURCE.id, attempt.id), attempt);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else delete globalThis.sessionStorage;
  }
});

test('answer zero is recorded while invalid indices are rejected without changing progress', () => {
  const session = create();
  const id = session.pending[0];
  const answered = submitAnswer(session, 0, QUESTION_MAP);
  assert.equal(answered.answers[id], 0);
  assert.equal(scoreSession(answered, QUESTION_MAP).answered, 1);
  const before = clone(session);
  for (const choice of [-1, QUESTION_MAP[id].choices.length, 99, 0.5, '0', null, NaN]) {
    assert.throws(() => submitAnswer(session, choice, QUESTION_MAP), /Choose one answer/);
  }
  assert.deepEqual(session, before);
});

test('correct and incorrect first answers are scored immediately and locked until Next', () => {
  for (const correct of [true, false]) {
    const original = create({ count: 3 });
    const id = original.pending[0];
    const question = QUESTION_MAP[id];
    const choice = correct ? question.answer : (question.answer + 1) % question.choices.length;
    const answered = submitAnswer(original, choice, QUESTION_MAP);
    assert.equal(answered.feedbackId, id);
    assert.equal(answered.finishedAt, null);
    assert.equal(answered.answers[id], choice);
    assert.deepEqual(answered.pending, original.pending.slice(1));
    assert.equal(scoreSession(answered, QUESTION_MAP).correct, Number(correct));
    assert.equal(scoreSession(answered, QUESTION_MAP).answered, 1);
    assert.equal(submitAnswer(answered, question.answer, QUESTION_MAP), answered);
    assert.equal(skipQuestion(answered), answered);
    assert.deepEqual(original.answers, {});
    assert.ok(validateSession(answered, QUESTION_MAP, SOURCE.id));

    const next = advanceQuestion(answered);
    assert.equal(next.feedbackId, null);
    assert.deepEqual(next.answers, answered.answers);
    assert.deepEqual(next.pending, answered.pending);
    assert.equal(next.finishedAt, null);
    assert.equal(advanceQuestion(next), next);
    const second = submitAnswer(next, QUESTION_MAP[next.pending[0]].answer, QUESTION_MAP);
    assert.equal(scoreSession(second, QUESTION_MAP).answered, 2);
  }
});

test('final-answer feedback survives save and reload before the result is completed', () => {
  const session = create({ count: 1 });
  const id = session.pending[0];
  const active = submitAnswer(session, QUESTION_MAP[id].answer, QUESTION_MAP);
  assert.deepEqual(active.pending, []);
  assert.equal(active.finishedAt, null);
  assert.equal(active.feedbackId, id);
  assert.ok(validateSession(active, QUESTION_MAP, SOURCE.id));
  const storage = memoryStorage();
  saveState({ active, results: [] }, storage);
  const restored = readState(QUESTION_MAP, SOURCE.id, storage);
  assert.deepEqual(restored, { active, results: [] });
  assert.equal(submitAnswer(restored.active, 0, QUESTION_MAP), restored.active);

  const result = advanceQuestion(restored.active);
  assert.equal(result.feedbackId, null);
  assert.notEqual(result.finishedAt, null);
  assert.ok(validateSession(result, QUESTION_MAP, SOURCE.id));
  saveState({ active: null, results: [result] }, storage);
  assert.deepEqual(readState(QUESTION_MAP, SOURCE.id, storage), { active: null, results: [result] });
  assert.equal(advanceQuestion(result), result);
});

test('feedback and skipped-question order survive saving midway through a test', () => {
  let session = create({ count: 3 });
  const skipped = session.pending[0];
  session = skipQuestion(session);
  const id = session.pending[0];
  session = submitAnswer(session, 0, QUESTION_MAP);
  const storage = memoryStorage();
  saveState({ active: session, results: [] }, storage);
  const restored = readState(QUESTION_MAP, SOURCE.id, storage).active;
  assert.deepEqual(restored, session);
  assert.equal(restored.feedbackId, id);
  assert.equal(restored.answers[id], 0);
  assert.equal(restored.pending.at(-1), skipped);
  const advanced = advanceQuestion(restored);
  assert.equal(advanced.pending[0], session.pending[0]);
  assert.equal(advanced.pending.at(-1), skipped);
});

test('ending during feedback preserves the recorded answer and clears feedback', () => {
  const original = create();
  const id = original.pending[0];
  const answered = submitAnswer(original, QUESTION_MAP[id].answer, QUESTION_MAP);
  const finished = finishSession(answered);
  assert.equal(finished.feedbackId, null);
  assert.equal(finished.answers[id], QUESTION_MAP[id].answer);
  assert.equal(scoreSession(finished, QUESTION_MAP).unanswered, 24);
  assert.ok(validateSession(finished, QUESTION_MAP, SOURCE.id));
});

test('saved sessions from before immediate feedback remain valid and can continue', () => {
  const active = respond(create());
  delete active.feedbackId;
  const result = finishSession(respond(create()));
  delete result.feedbackId;
  const saved = { active, results: [result] };
  const restored = readState(QUESTION_MAP, SOURCE.id, memoryStorage(JSON.stringify(saved)));
  assert.deepEqual(restored, saved);
  const id = restored.active.pending[0];
  const answered = submitAnswer(restored.active, QUESTION_MAP[id].answer, QUESTION_MAP);
  assert.equal(answered.feedbackId, id);
  assert.equal(scoreSession(answered, QUESTION_MAP).answered, 2);
  assert.ok(validateSession(answered, QUESTION_MAP, SOURCE.id));
});

test('saved feedback must identify a recorded answer in an unfinished session', () => {
  const original = create({ count: 2 });
  const answered = submitAnswer(original, 0, QUESTION_MAP);
  const bad = [
    { ...answered, feedbackId: original.pending[1] },
    { ...answered, feedbackId: 'missing' },
    { ...answered, feedbackId: '' },
    { ...answered, feedbackId: 0 },
    { ...answered, feedbackId: undefined },
    { ...answered, feedbackId: false },
    { ...answered, finishedAt: answered.startedAt },
    { ...submitAnswer(create({ count: 1 }), 0, QUESTION_MAP), feedbackId: null },
  ];
  for (const session of bad) {
    assert.equal(validateSession(session, QUESTION_MAP, SOURCE.id), false);
    if (session.feedbackId !== undefined) {
      assert.equal(readState(QUESTION_MAP, SOURCE.id, memoryStorage(JSON.stringify({ active: session }))).active, null);
    }
  }
});

test('unknown tests, empty sources, duplicate IDs, and invalid counts cannot start', () => {
  assert.throws(() => create({ testId: 'missing' }), /no questions/);
  assert.throws(() => createSession([], options), /no questions/);
  assert.throws(() => createSession([QUESTIONS[0], QUESTIONS[0]], options), /unique/);
  for (const count of [0, -1, 0.5, Infinity, '25']) assert.throws(() => create({ count }), /valid question count/);
  assert.throws(() => create({ sourceId: '' }), /source/);
});

test('save and reload preserve answers and the skipped-question queue using the document storage key', () => {
  const active = skipQuestion(respond(create()));
  const state = { active, results: [] };
  const storage = memoryStorage();
  assert.equal(saveState(state, storage), true);
  assert.deepEqual(readState(QUESTION_MAP, SOURCE.id, storage), state);
  assert.equal(scoreSession(respond(readState(QUESTION_MAP, SOURCE.id, storage).active), QUESTION_MAP).answered, 2);
  assert.equal(clearState(storage), true);
  assert.deepEqual(readState(QUESTION_MAP, SOURCE.id, storage), emptyState());
  assert.ok(storage.keys.every(key => key === 'cdl-document-practice-v3'));
});

test('legacy PDF progress is rejected even if copied into the document storage entry', () => {
  const legacy = {
    ...create(),
    sourceId: 'career-path-air-brakes-2016-v1',
    testId: 'test-1',
    ids: ['pdf-1-01'],
    pending: ['pdf-1-01'],
    answers: {},
  };
  for (const active of [legacy, { ...legacy, sourceId: SOURCE.id }, { ...create(), sourceId: legacy.sourceId }]) {
    const storage = memoryStorage(JSON.stringify({ active, results: [finishSession(active)] }));
    assert.deepEqual(readState(QUESTION_MAP, SOURCE.id, storage), emptyState());
    assert.equal(validateSession(active, QUESTION_MAP, SOURCE.id), false);
    assert.deepEqual(storage.keys, ['cdl-document-practice-v3']);
  }
});

test('existing Air Brakes progress migrates without changing answers, queue, or results', () => {
  const current = skipQuestion(respond(create()));
  for (const legacyTest of ['all', 'document']) {
    const legacy = { ...current, sourceId: 'user-air-brakes-docx-65-v1', testId: legacyTest };
    const legacyResult = { ...finishSession(legacy), id: 'previous-result' };
    const storage = memoryStorage(JSON.stringify({ active: legacy, results: [legacyResult] }));
    const restored = readState(QUESTION_MAP, SOURCE.id, storage);
    assert.deepEqual(restored.active, current);
    assert.deepEqual(restored.results, [{ ...legacyResult, sourceId: SOURCE.id, testId: 'air-brakes' }]);
    assert.deepEqual(restored.active.answers, legacy.answers);
    assert.deepEqual(restored.active.pending, legacy.pending);
    assert.ok(validateSession(restored.active, QUESTION_MAP, SOURCE.id));
    saveState(restored, storage);
    assert.deepEqual(readState(QUESTION_MAP, SOURCE.id, storage), restored);
  }
});

test('migration rejects malformed Air Brakes records and never admits other subject questions', () => {
  const legacy = { ...create(), sourceId: 'user-air-brakes-docx-65-v1', testId: 'all' };
  const alien = QUESTIONS.find(q => q.testId === 'general-knowledge').id;
  const invalid = [
    { ...legacy, testId: 'general-knowledge' },
    { ...legacy, ids: [alien], pending: [alien] },
    { ...legacy, ids: ['unknown'], pending: ['unknown'] },
    { ...legacy, answers: { [legacy.ids[0]]: 100 } },
    { ...legacy, startedAt: -1 },
  ];
  for (const session of invalid) {
    const storage = memoryStorage(JSON.stringify({ active: session, results: [finishSession(session)] }));
    assert.deepEqual(readState(QUESTION_MAP, SOURCE.id, storage), emptyState());
  }
});

test('only valid unique completed results are restored, with a limit of 20', () => {
  const completed = Array.from({ length: 25 }, () => finishSession(create()));
  const active = create();
  const storage = memoryStorage(JSON.stringify({ active: completed[0], results: [null, {}, active, completed[0], ...completed] }));
  const restored = readState(QUESTION_MAP, SOURCE.id, storage);
  assert.equal(restored.active, null);
  assert.equal(restored.results.length, 20);
  assert.equal(new Set(restored.results.map(result => result.id)).size, 20);
  assert.ok(restored.results.every(result => result.finishedAt !== null && validateSession(result, QUESTION_MAP, SOURCE.id)));
});

test('malformed saved sessions cannot change scoring or create impossible queues', () => {
  const base = respond(create());
  const answered = Object.keys(base.answers)[0];
  const pending = base.pending[0];
  const mutations = [
    session => { session.version = 1; },
    session => { session.id = '__proto__'; },
    session => { session.sourceId = 'other'; },
    session => { session.testId = 'unrelated-test'; },
    session => { session.ids = []; },
    session => { session.ids[1] = session.ids[0]; },
    session => { session.ids[1] = 'unknown'; },
    session => { session.pending = []; },
    session => { session.pending.push(pending); },
    session => { session.pending.push(answered); },
    session => { session.answers[pending] = 0; },
    session => { session.answers.unknown = 0; },
    session => { session.answers[answered] = -1; },
    session => { session.answers[answered] = '0'; },
    session => { session.answers[answered] = QUESTION_MAP[answered].choices.length; },
    session => { session.answers = []; },
    session => { session.startedAt = -1; },
    session => { session.startedAt = 1e100; },
    session => { session.finishedAt = session.startedAt - 1; },
    session => { session.finishedAt = 1e100; },
    session => { delete session.finishedAt; },
  ];
  for (const mutation of mutations) {
    const invalid = clone(base);
    mutation(invalid);
    assert.equal(validateSession(invalid, QUESTION_MAP, SOURCE.id), false, mutation.toString());
    assert.equal(readState(QUESTION_MAP, SOURCE.id, memoryStorage(JSON.stringify({ active: invalid }))).active, null);
  }
  const inheritedSession = Object.create(base);
  assert.equal(validateSession(inheritedSession, QUESTION_MAP, SOURCE.id), false);
  const inheritedMap = Object.create(QUESTION_MAP);
  assert.equal(validateSession(base, inheritedMap, SOURCE.id), false);
  const inheritedAnswers = clone(base);
  inheritedAnswers.answers = Object.create(base.answers);
  assert.equal(validateSession(inheritedAnswers, QUESTION_MAP, SOURCE.id), false);
});

test('invalid JSON and unavailable storage are handled without preventing use', () => {
  for (const value of [null, '', 'null', '[]', '123', '{bad', '"text"']) {
    assert.deepEqual(readState(QUESTION_MAP, SOURCE.id, memoryStorage(value)), emptyState());
  }
  const unavailable = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); }, removeItem() { throw new Error('blocked'); } };
  assert.deepEqual(readState(QUESTION_MAP, SOURCE.id, unavailable), emptyState());
  assert.equal(saveState(emptyState(), unavailable), false);
  assert.equal(clearState(unavailable), false);
});

test('a blocked localStorage property getter is caught before startup, save, or clear', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked getter'); } });
  try {
    assert.deepEqual(readState(QUESTION_MAP, SOURCE.id), emptyState());
    assert.equal(saveState(emptyState()), false);
    assert.equal(clearState(), false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});
