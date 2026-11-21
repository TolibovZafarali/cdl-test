import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreSession, validateSession } from '../engine.js';
import { readRetry, readState, STORAGE_KEY } from '../storage.js';

const SOURCE = 'choice-migration-fixture';
const RETRY_KEY = 'cdl-missed-practice';
const QUESTION_MAP = {
  expanded: {
    id: 'expanded', testId: 'fixture',
    choices: ['First', 'Second', 'Third', 'New fourth'],
    answer: 1, previousChoiceCount: 3,
  },
  unchanged: {
    id: 'unchanged', testId: 'fixture',
    choices: ['Left', 'Center', 'Right'], answer: 2,
  },
};
const OLD_ORDERS = [
  [0, 1, 2], [0, 2, 1], [1, 0, 2],
  [1, 2, 0], [2, 0, 1], [2, 1, 0],
];

function savedSession(order, { finished = false, answer = 1 } = {}) {
  return {
    version: 2,
    id: finished ? 'finished-fixture' : 'active-fixture',
    sourceId: SOURCE,
    testId: 'fixture',
    mode: 'missed',
    ids: ['expanded', 'unchanged'],
    choiceOrders: { expanded: order, unchanged: [2, 0, 1] },
    answers: finished ? { expanded: answer, unchanged: 2 } : { expanded: answer },
    pending: finished ? [] : ['unchanged'],
    feedbackId: finished ? null : 'expanded',
    startedAt: 1000,
    finishedAt: finished ? 2000 : null,
  };
}

function memoryStorage(key, value) {
  const values = new Map([[key, JSON.stringify(value)]]);
  return {
    getItem: name => values.get(name) ?? null,
    setItem: (name, next) => values.set(name, String(next)),
    removeItem: name => values.delete(name),
  };
}

function withRetryStorage(value, operation) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const storage = memoryStorage(RETRY_KEY, value);
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  try { return operation(storage); }
  finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else delete globalThis.sessionStorage;
  }
}

function assertRestored(actual, original) {
  assert.deepEqual(actual, {
    ...original,
    choiceOrders: { ...original.choiceOrders, expanded: [...original.choiceOrders.expanded, 3] },
  });
  assert.equal(validateSession(actual, QUESTION_MAP, SOURCE), true);
  assert.deepEqual(scoreSession(actual, QUESTION_MAP), scoreSession(original, QUESTION_MAP));
}

test('readState restores every old choice permutation in active and completed sessions without remapping answers', () => {
  for (const order of OLD_ORDERS) {
    for (const answer of [0, 1, 2]) {
      const active = savedSession(order, { answer });
      const result = savedSession(order, { answer, finished: true });
      const storage = memoryStorage(STORAGE_KEY, { active, results: [result] });
      const stored = storage.getItem(STORAGE_KEY);
      const restored = readState(QUESTION_MAP, SOURCE, storage);

      assertRestored(restored.active, active);
      assert.equal(restored.results.length, 1);
      assertRestored(restored.results[0], result);
      assert.equal(storage.getItem(STORAGE_KEY), stored);
    }
  }
});

test('invalid stored question IDs cannot discard other valid saved sessions', () => {
  for (const invalidId of [{ toString: null }, null, 7, ['expanded']]) {
    const active = savedSession([2, 0, 1]);
    const result = savedSession([1, 2, 0], { finished: true });
    const malformed = { ...active, ids: [invalidId] };
    const invalidActive = readState(QUESTION_MAP, SOURCE,
      memoryStorage(STORAGE_KEY, { active: malformed, results: [result] }));
    assert.equal(invalidActive.active, null);
    assert.equal(invalidActive.results.length, 1);
    assertRestored(invalidActive.results[0], result);
    const invalidResult = readState(QUESTION_MAP, SOURCE,
      memoryStorage(STORAGE_KEY, { active, results: [{ ...malformed, finishedAt: 2000 }, result] }));
    assertRestored(invalidResult.active, active);
    assert.equal(invalidResult.results.length, 1);
    assertRestored(invalidResult.results[0], result);
  }
});

test('readRetry restores both unfinished feedback and completed retries by their exact IDs', () => {
  for (const order of OLD_ORDERS) {
    for (const answer of [0, 1, 2]) {
      const active = savedSession(order, { answer });
      const result = savedSession(order, { answer, finished: true });
      withRetryStorage({ sessions: [active, result] }, storage => {
        const stored = storage.getItem(RETRY_KEY);
        assertRestored(readRetry(QUESTION_MAP, SOURCE), active);
        assertRestored(readRetry(QUESTION_MAP, SOURCE, active.id), active);
        assertRestored(readRetry(QUESTION_MAP, SOURCE, result.id), result);
        assert.equal(readRetry(QUESTION_MAP, SOURCE, 'missing-fixture'), null);
        assert.equal(storage.getItem(RETRY_KEY), stored);
      });
    }
  }
});

test('the legacy single-retry storage format also preserves answers while extending choices', () => {
  const session = savedSession([2, 0, 1]);
  withRetryStorage(session, () => {
    assertRestored(readRetry(QUESTION_MAP, SOURCE), session);
    assertRestored(readRetry(QUESTION_MAP, SOURCE, session.id), session);
  });
});

const MALFORMED_ORDERS = [
  ['partial', [0, 1]],
  ['duplicate', [0, 1, 1]],
  ['new index inside an old order', [0, 1, 3]],
  ['out-of-range', [0, 1, 4]],
  ['negative index', [0, 1, -1]],
  ['string index', ['0', 1, 2]],
  ['fractional index', [0, 1, 1.5]],
  ['duplicate full-length order', [0, 1, 2, 2]],
];

for (const [label, order] of MALFORMED_ORDERS) {
  test(`choice migration rejects malformed state and retry orders: ${label}`, () => {
    const active = savedSession(order);
    const result = savedSession(order, { finished: true });
    const state = readState(QUESTION_MAP, SOURCE,
      memoryStorage(STORAGE_KEY, { active, results: [result] }));
    assert.deepEqual(state, { active: null, results: [] });
    withRetryStorage({ sessions: [active, result] }, () => {
      assert.equal(readRetry(QUESTION_MAP, SOURCE), null);
      assert.equal(readRetry(QUESTION_MAP, SOURCE, active.id), null);
      assert.equal(readRetry(QUESTION_MAP, SOURCE, result.id), null);
    });
  });
}

test('a valid current permutation stays unchanged on repeated state and retry reads', () => {
  const active = savedSession([3, 2, 0, 1]);
  const result = savedSession([1, 3, 0, 2], { finished: true });
  const original = { active, results: [result] };
  const storage = memoryStorage(STORAGE_KEY, original);
  assert.deepEqual(readState(QUESTION_MAP, SOURCE, storage), original);
  assert.deepEqual(readState(QUESTION_MAP, SOURCE, storage), original);
  withRetryStorage({ sessions: [active, result] }, () => {
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE, active.id), active);
    assert.deepEqual(readRetry(QUESTION_MAP, SOURCE, result.id), result);
  });
});

test('a shorter permutation is not repaired without explicit previous-choice metadata', () => {
  const { previousChoiceCount, ...expanded } = QUESTION_MAP.expanded;
  const map = { ...QUESTION_MAP, expanded };
  const active = savedSession([2, 0, 1]);
  const result = savedSession([2, 0, 1], { finished: true });
  assert.deepEqual(readState(map, SOURCE,
    memoryStorage(STORAGE_KEY, { active, results: [result] })), { active: null, results: [] });
  withRetryStorage({ sessions: [active, result] }, () => {
    assert.equal(readRetry(map, SOURCE, active.id), null);
    assert.equal(readRetry(map, SOURCE, result.id), null);
  });
});

test('repairing expanded choices does not hide corruption in another question order', () => {
  const active = savedSession([2, 0, 1]);
  active.choiceOrders.unchanged = [2, 0];
  const result = { ...active, id: 'finished-fixture', finishedAt: 2000, feedbackId: null };
  assert.deepEqual(readState(QUESTION_MAP, SOURCE,
    memoryStorage(STORAGE_KEY, { active, results: [result] })), { active: null, results: [] });
  withRetryStorage({ sessions: [active, result] }, () => {
    assert.equal(readRetry(QUESTION_MAP, SOURCE, active.id), null);
    assert.equal(readRetry(QUESTION_MAP, SOURCE, result.id), null);
  });
});
