import test from 'node:test';
import assert from 'node:assert/strict';
import { SUBJECT_MAP, QUESTION_MAP, SOURCE } from '../data/index.js';
import { createSession, finishSession } from '../engine.js';
import { readState, saveState } from '../storage.js';

function roundTrip(state) {
  const storage = new Map();
  assert.equal(saveState(state, { setItem: (key, value) => storage.set(key, value) }), true);
  return readState(QUESTION_MAP, SOURCE.id, { getItem: key => storage.get(key) });
}

function session(mode, testId = 'general-knowledge', count = 20, offset = 0) {
  const questions = SUBJECT_MAP[testId].questions.slice(offset);
  return { ...createSession(questions, { sourceId: SOURCE.id, testId, count, randomize: false }), mode };
}

test('set history persists independently of saved tests, including a set spanning two cycles', () => {
  const previousIds = session('sets').ids;
  const generalPracticeProgress = { previousIds, seenIds: previousIds.slice(9) };
  const saved = { active: null, results: [], generalPracticeProgress };
  assert.deepEqual(roundTrip(saved), saved);
});

test('missing or corrupt set history falls back to the latest valid General Knowledge set', () => {
  const active = session('sets', 'general-knowledge', 20, 20);
  const completed = finishSession(session('sets'));
  const mock = finishSession(session('practice', 'general-knowledge', 50));
  for (const badValue of [undefined, {}, { previousIds: 'bad', seenIds: [] },
    { previousIds: active.ids, seenIds: ['unknown'] },
    { previousIds: [active.ids[0], active.ids[0]], seenIds: active.ids },
    { previousIds: session('practice', 'air-brakes').ids, seenIds: active.ids }]) {
    const state = { active, results: [mock, completed], generalPracticeProgress: badValue };
    assert.deepEqual(roundTrip(state).generalPracticeProgress, { previousIds: active.ids, seenIds: active.ids });
    assert.deepEqual(roundTrip({ ...state, active: null }).generalPracticeProgress,
      { previousIds: completed.ids, seenIds: completed.ids });
  }
});

test('random and full tests and other subjects do not seed the General Knowledge sets', () => {
  const saved = {
    active: session('practice', 'general-knowledge', 50),
    results: [
      finishSession(session('all', 'general-knowledge', SUBJECT_MAP['general-knowledge'].count)),
      finishSession(session('practice')),
      finishSession(session('sets', 'combination-vehicles')),
    ],
  };
  assert.deepEqual(roundTrip(saved), saved);
});
