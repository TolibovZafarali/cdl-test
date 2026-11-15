import test from 'node:test';
import assert from 'node:assert/strict';
import { SUBJECT_MAP, QUESTION_MAP, SOURCE } from '../data/index.js';
import { createPracticeSetSession, createSession, finishSession, submitAnswer } from '../engine.js';
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

test('a learner with two legacy 20-question sets can expand the latest one and resume all 40', () => {
  const first = finishSession(session('sets'));
  const latest = finishSession(session('sets', 'general-knowledge', 20, 20));
  const seenIds = [...first.ids, ...latest.ids];
  const restored = roundTrip({
    active: null, results: [latest, first], generalPracticeProgress: { previousIds: latest.ids, seenIds },
  });
  const settings = { sourceId: SOURCE.id, testId: 'general-knowledge', count: 20 };
  const expanded = createPracticeSetSession(SUBJECT_MAP['general-knowledge'].questions, settings,
    restored.generalPracticeProgress, { advance: true, previousAttempt: restored.results[0] }, () => 0.99);
  assert.equal(new Set(expanded.session.ids).size, 40);
  assert.ok(latest.ids.every(id => expanded.session.ids.includes(id)));
  assert.equal(expanded.session.ids.filter(id => !seenIds.includes(id)).length, 20);

  const question = QUESTION_MAP[expanded.session.pending[0]];
  const active = submitAnswer(expanded.session, question.answer, QUESTION_MAP);
  const resumed = roundTrip({ ...restored, active, generalPracticeProgress: expanded.progress });
  assert.deepEqual(resumed.active, active);
  assert.deepEqual(new Set(resumed.generalPracticeProgress.previousIds), new Set(active.ids));
  assert.deepEqual(resumed.results, [latest, first]);
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
