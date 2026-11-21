import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as bank from '../data/index.js';
import * as notes from '../data/interface-uz.js';
import { KEYWORDS } from '../data/keywords.js';
import { escapeText, highlightKeyword } from '../keywords.js';
import * as engine from '../engine.js';
import * as storage from '../storage.js';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

function withSessionStorage(tabStorage, operation) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: tabStorage });
  try { return operation(); }
  finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else delete globalThis.sessionStorage;
  }
}

function appHarness({ hash = '#home', localStorage = memoryStorage(), sessionStorage = memoryStorage() } = {}) {
  const events = new Map();
  const documentEvents = new Map();
  const element = { focus() {}, scrollIntoView() {} };
  const app = { innerHTML: '' };
  const status = { textContent: '' };
  const dialog = {
    open: false, innerHTML: '',
    showModal() { this.open = true; },
    close() { this.open = false; },
  };
  const location = { hash };
  const history = [hash];
  let index = 0;
  const push = next => {
    history.splice(index + 1);
    history.push(next);
    index += 1;
    location.hash = next;
  };
  const context = vm.createContext({
    ...bank, ...notes, ...engine, ...storage,
    KEYWORDS, escape: escapeText, highlightKeyword, localStorage, sessionStorage,
    readState: (map, sourceId) => storage.readState(map, sourceId, localStorage),
    saveState: state => storage.saveState(state, localStorage),
    clearState: () => storage.clearState(localStorage),
    readKeywordHints: () => storage.readKeywordHints(localStorage),
    saveKeywordHints: enabled => storage.saveKeywordHints(enabled, localStorage),
    readRetry: (...args) => withSessionStorage(sessionStorage, () => storage.readRetry(...args)),
    saveRetry: (...args) => withSessionStorage(sessionStorage, () => storage.saveRetry(...args)),
    document: {
      activeElement: { ...element, id: '' },
      querySelector: selector => ({ '#app': app, '#dialog': dialog, '#status': status })[selector] ?? element,
      querySelectorAll: () => [],
      getElementById: () => element,
      addEventListener: (type, handler) => documentEvents.set(type, handler),
    },
    window: { addEventListener: (type, handler) => events.set(type, handler), scrollTo() {} },
    location, navigator: {},
    history: {
      pushState: (_state, _unused, next) => push(next),
      replaceState: (_state, _unused, next) => { history[index] = next; location.hash = next; },
    },
  });
  vm.runInContext(source, context, { filename: 'app.js' });
  const read = expression => JSON.parse(vm.runInContext(`JSON.stringify(${expression})`, context));
  const click = (action, fields = {}) => documentEvents.get('click')({
    preventDefault() {},
    target: { closest: selector => selector === '[data-action]' ? { dataset: { action, ...fields } } : null },
  });
  return {
    localStorage, sessionStorage,
    hash: () => location.hash,
    html: () => app.innerHTML,
    current: () => read('testSession()'),
    result: () => read('resultFor(resultId) ?? null'),
    view: () => read('view'),
    retryLink: () => app.innerHTML.match(/href="(#[^"]*retry\/[^"]+)"/)?.[1],
    click,
    selectMode(value) { documentEvents.get('change')({ target: { name: 'test-mode', value } }); },
    answer(correct = true) {
      const session = read('testSession()');
      const question = bank.QUESTION_MAP[session.pending[0]];
      click('answer', { choice: String(correct ? question.answer : (question.answer + 1) % question.choices.length) });
    },
    submit(id) { documentEvents.get('submit')({ target: { id }, preventDefault() {} }); },
    next() { this.submit('answer-form'); },
    visit(next) { push(next); events.get('popstate')(); },
    go(delta) {
      index += delta;
      assert.ok(index >= 0 && index < history.length);
      location.hash = history[index];
      events.get('popstate')();
    },
    reload() { return appHarness({ hash: location.hash, localStorage, sessionStorage }); },
  };
}

function sourceResult(ids) {
  let session = engine.createMissedSession(ids, bank.QUESTION_MAP, bank.SOURCE.id);
  session = { ...session, mode: 'practice' };
  const question = bank.QUESTION_MAP[session.pending[0]];
  session = engine.advanceQuestion(engine.submitAnswer(session, question.answer, bank.QUESTION_MAP));
  return engine.finishSession(session);
}

test('different source results launch their own mistakes and normalize to distinct attempt routes', () => {
  const first = sourceResult(['docx-01', 'docx-02', 'docx-03']);
  const second = sourceResult(['docx-04', 'docx-05', 'docx-06']);
  const localStorage = memoryStorage();
  storage.saveState({ active: null, results: [second, first] }, localStorage);
  const results = appHarness({ hash: `#result/${first.id}`, localStorage });
  const firstRetry = appHarness({ hash: results.retryLink(), localStorage });
  results.visit(`#result/${second.id}`);
  const secondRetry = appHarness({ hash: results.retryLink(), localStorage });
  assert.deepEqual(new Set(firstRetry.current().ids), new Set(engine.missedQuestionIds(first, bank.QUESTION_MAP)));
  assert.deepEqual(new Set(secondRetry.current().ids), new Set(engine.missedQuestionIds(second, bank.QUESTION_MAP)));
  assert.equal(firstRetry.hash(), `#retry/session/${firstRetry.current().id}`);
  assert.equal(secondRetry.hash(), `#retry/session/${secondRetry.current().id}`);
  assert.notEqual(firstRetry.hash(), secondRetry.hash());
});

test('a retry of a retry contains only its latest mistakes and leaves its source result intact', () => {
  const first = appHarness({ hash: '#retry/docx-01,docx-02,docx-03' });
  const originalIds = first.current().ids;
  first.answer(true); first.next();
  first.answer(false); first.next();
  first.answer(true); first.next();
  const result = first.result();
  const next = appHarness({ hash: first.retryLink(), localStorage: first.localStorage });
  assert.deepEqual(next.current().ids, [originalIds[1]]);
  assert.deepEqual(first.result(), result);
  assert.equal(first.hash(), `#result/${result.id}`);
  next.answer(true); next.next();
  assert.equal(next.retryLink(), undefined);
});

test('reloading an exact retry route preserves answers, feedback and shuffled choices', () => {
  const app = appHarness({ hash: '#retry/docx-01,docx-02,docx-03' });
  app.answer(false);
  const saved = app.current();
  const restored = app.reload();
  assert.deepEqual(restored.current(), saved);
  assert.equal(restored.hash(), `#retry/session/${saved.id}`);
  restored.next();
  assert.equal(restored.current().pending[0], saved.pending[0]);
  assert.deepEqual(restored.current().choiceOrders, saved.choiceOrders);
});

test('back and forward restore the matching retry after a different set starts in the same tab', () => {
  const app = appHarness({ hash: '#retry/docx-01,docx-02' });
  app.answer(false);
  const first = app.current();
  app.visit('#retry/docx-04,docx-05');
  app.answer(true);
  const second = app.current();
  app.go(-1);
  assert.deepEqual(app.current(), first);
  assert.equal(app.hash(), `#retry/session/${first.id}`);
  app.go(1);
  assert.deepEqual(app.current(), second);
  assert.equal(app.hash(), `#retry/session/${second.id}`);
});

test('an older completed retry still opens its own result after another retry and a reload', () => {
  const app = appHarness({ hash: '#retry/docx-01,docx-02' });
  const firstId = app.current().id;
  app.answer(true); app.next();
  app.answer(false); app.next();
  const firstResult = app.result();
  app.visit('#retry/docx-04,docx-05');
  app.answer(false);
  const reloaded = app.reload();
  reloaded.visit(`#result/${firstId}`);
  assert.deepEqual(reloaded.result(), firstResult);
  reloaded.visit(`#retry/session/${firstId}`);
  assert.equal(reloaded.view(), 'result');
  assert.deepEqual(reloaded.result(), firstResult);
  assert.equal(reloaded.hash(), `#result/${firstId}`);
});

test('missing and malformed retry routes never resume a different saved attempt', () => {
  for (const route of ['#retry/session/missing-attempt', '#retry/session/', '#retry/session/%E0%A4%A', '#retry/unknown', '#retry/docx-01,docx-01']) {
    const app = appHarness({ hash: '#retry/docx-01,docx-02' });
    app.answer(false);
    app.visit(route);
    assert.equal(app.current(), null, route);
    assert.notEqual(app.view(), 'retry', route);
  }
});

test('the legacy retry route resumes its saved attempt and acquires a specific route', () => {
  const app = appHarness({ hash: '#retry/docx-01,docx-02' });
  app.answer(true);
  const saved = app.current();
  const restored = appHarness({ hash: '#retry', sessionStorage: app.sessionStorage, localStorage: app.localStorage });
  assert.deepEqual(restored.current(), saved);
  assert.equal(restored.hash(), `#retry/session/${saved.id}`);
});

test('a later regular test retries its own mistakes while an earlier retry remains saved', () => {
  const app = appHarness({ hash: '#retry/docx-01,docx-02' });
  app.answer(false);
  const earlier = app.current();
  app.click('home');
  app.click('subject', { id: 'general-knowledge' });
  app.submit('start-form');
  assert.equal(app.current().testId, 'general-knowledge');
  app.answer(true); app.next();
  app.click('finish'); app.click('finish-confirm');
  const later = app.result();
  const retry = appHarness({ hash: app.retryLink(), localStorage: app.localStorage });
  assert.deepEqual(new Set(retry.current().ids), new Set(engine.missedQuestionIds(later, bank.QUESTION_MAP)));
  assert.equal(retry.current().testId, 'general-knowledge');
  app.visit(`#retry/session/${earlier.id}`);
  assert.deepEqual(app.current(), earlier);
  app.visit(`#result/${later.id}`);
  assert.deepEqual(app.result(), later);
});

test('failed retry saves retain answers and warnings across history until storage recovers', () => {
  const backing = memoryStorage();
  let blocked = false;
  const sessionStorage = {
    ...backing,
    setItem(key, value) {
      if (blocked) throw new Error('Storage full');
      backing.setItem(key, value);
    },
  };
  const app = appHarness({ hash: '#retry/docx-01,docx-02', sessionStorage });
  app.visit('#retry/docx-04,docx-05');
  blocked = true;
  app.answer(false);
  const unsaved = app.current();
  const warning = () => app.html().match(/<p id="storage-warning"[^>]*>/)[0];
  assert.doesNotMatch(warning(), /\bhidden\b/);

  app.go(-1);
  blocked = false;
  app.answer(true);
  const other = app.current();
  assert.doesNotMatch(warning(), /\bhidden\b/, 'saving another attempt must not hide the pending failure');
  app.go(1);
  assert.deepEqual(app.current(), unsaved);
  assert.doesNotMatch(warning(), /\bhidden\b/);

  app.go(-1);
  app.click('exit');
  assert.match(warning(), /\bhidden\b/);
  app.click('resume-retry');
  assert.deepEqual(app.current(), other);
  app.visit(`#retry/session/${unsaved.id}`);
  assert.deepEqual(app.current(), unsaved);
  assert.deepEqual(app.reload().current(), unsaved);
});

test('numbers mode is offered only for General Knowledge and updates its count and pass threshold', () => {
  const app = appHarness({ hash: '#subject/general-knowledge' });
  assert.match(app.html(), /Сонли жавоблар/);
  app.selectMode('numbers');
  assert.match(app.html(), /value="numbers" checked/);
  assert.match(app.html(), /73 та саволдан 59 тасига/);
  for (const subject of ['air-brakes', 'combination-vehicles']) {
    app.visit(`#subject/${subject}`);
    assert.doesNotMatch(app.html(), /value="numbers"/);
    assert.match(app.html(), /value="practice" checked/);
  }
  app.visit('#subject/general-knowledge');
  assert.match(app.html(), /value="practice" checked/);
});

test('numeric tests preserve their filtered pool, answers and shuffled choices through resume and practice again', () => {
  const app = appHarness({ hash: '#subject/general-knowledge' });
  app.selectMode('numbers');
  app.submit('start-form');
  const first = app.current();
  const expectedIds = bank.SUBJECT_MAP['general-knowledge'].numberQuestions.map(question => question.id);
  assert.equal(first.mode, 'numbers');
  assert.equal(first.testId, 'general-knowledge');
  assert.equal(first.ids.length, 73);
  assert.deepEqual(new Set(first.ids), new Set(expectedIds));
  assert.equal(engine.scoreSession(first, bank.QUESTION_MAP).required, 59);
  app.answer(true);
  app.next();
  app.answer(false);
  const saved = app.current();
  const reloaded = app.reload();
  assert.deepEqual(reloaded.current(), saved);
  assert.match(reloaded.html(), /Сонли жавоблар/);
  reloaded.click('exit');
  const resumed = reloaded.reload();
  resumed.click('resume');
  assert.deepEqual(resumed.current(), saved);
  resumed.click('finish');
  resumed.click('finish-confirm');
  const result = resumed.result();
  assert.equal(result.mode, 'numbers');
  assert.equal(engine.scoreSession(result, bank.QUESTION_MAP).correct, 1);
  assert.match(resumed.html(), /Умумий билимлар · Сонли жавоблар/);
  resumed.click('practice-again');
  assert.match(resumed.html(), /value="numbers" checked/);
  resumed.submit('start-form');
  const next = resumed.current();
  assert.equal(next.mode, 'numbers');
  assert.notEqual(next.id, first.id);
  assert.deepEqual(new Set(next.ids), new Set(expectedIds));
  assert.deepEqual(next.answers, {});
  assert.deepEqual(storage.readState(bank.QUESTION_MAP, bank.SOURCE.id, app.localStorage).results[0], result);
});

test('missed-question retries from numeric tests contain only their incorrect or unanswered numeric questions', () => {
  const app = appHarness({ hash: '#subject/general-knowledge' });
  app.selectMode('numbers');
  app.submit('start-form');
  app.answer(true); app.next();
  app.answer(false); app.next();
  app.click('finish'); app.click('finish-confirm');
  const result = app.result();
  const retry = appHarness({ hash: app.retryLink(), localStorage: app.localStorage });
  const expected = engine.missedQuestionIds(result, bank.QUESTION_MAP);
  assert.equal(retry.current().mode, 'missed');
  assert.equal(retry.current().ids.length, 72);
  assert.deepEqual(new Set(retry.current().ids), new Set(expected));
  assert.ok(retry.current().ids.every(id => bank.hasNumericAnswer(bank.QUESTION_MAP[id])));
  retry.answer(true);
  assert.deepEqual(retry.reload().current(), retry.current());
  assert.deepEqual(app.result(), result);
});

const restoredQuestionPools = [
  { subjectId: 'general-knowledge', ids: ['gk-016', 'gk-110', 'gk-140', 'gk-158', 'gk-183', 'gk-297'], required: 5, fullCount: 295 },
  { subjectId: 'air-brakes', ids: ['docx-13'], required: 1, fullCount: 63 },
  { subjectId: 'combination-vehicles', ids: ['cv-024', 'cv-030', 'cv-043', 'cv-055', 'cv-068'], required: 4, fullCount: 76 },
];

function startRestoredQuestions(subjectId) {
  const app = appHarness({ hash: `#subject/${subjectId}` });
  app.selectMode('new');
  app.submit('start-form');
  return app;
}

test('new-question mode offers exactly the twelve restored questions with subject-specific counts and pass thresholds', () => {
  const allIds = [];
  for (const expected of restoredQuestionPools) {
    const subject = bank.SUBJECT_MAP[expected.subjectId];
    assert.deepEqual(subject.newQuestions.map(q => q.id), expected.ids);
    assert.ok(subject.newQuestions.every(q => subject.questions.includes(q)));
    allIds.push(...expected.ids);
    const app = appHarness({ hash: `#subject/${expected.subjectId}` });
    assert.match(app.html(), /Янги қўшилган саволлар/);
    app.selectMode('new');
    assert.match(app.html(), /value="new" checked/);
    assert.match(app.html(), new RegExp(`${expected.ids.length} та саволдан ${expected.required} тасига`));
  }
  assert.equal(new Set(allIds).size, 12);
  assert.ok(!allIds.includes('gk-241'));
  assert.ok(!allIds.includes('cv-072'));
});

test('new-question sessions use their entire filtered pool and render shuffled canonical choices', t => {
  t.mock.method(Math, 'random', () => 0);
  for (const expected of restoredQuestionPools) {
    const app = startRestoredQuestions(expected.subjectId);
    const session = app.current();
    assert.equal(session.mode, 'new');
    assert.equal(session.testId, expected.subjectId);
    assert.deepEqual(new Set(session.ids), new Set(expected.ids));
    assert.equal(engine.scoreSession(session, bank.QUESTION_MAP).required, expected.required);
    assert.match(app.html(), /Янги қўшилган саволлар/);
    for (const id of session.ids) {
      const indices = bank.QUESTION_MAP[id].choices.map((_, index) => index);
      assert.deepEqual(new Set(session.choiceOrders[id]), new Set(indices), id);
      assert.notDeepEqual(session.choiceOrders[id], indices, `${id}: deterministic draw moves the choices`);
    }
    const renderedOrder = [...app.html().matchAll(/data-action="answer" data-choice="(\d+)"/g)].map(match => Number(match[1]));
    assert.deepEqual(renderedOrder, session.choiceOrders[session.pending[0]]);
    app.answer(true);
    assert.equal(app.current().answers[session.ids[0]], bank.QUESTION_MAP[session.ids[0]].answer);
    assert.match(app.html(), /feedback-correct/);
  }
});

test('new-question tests pass at five of six, one of one and four of five, and fail one answer below', () => {
  for (const expected of restoredQuestionPools) {
    for (const correctCount of [expected.required - 1, expected.required]) {
      const app = startRestoredQuestions(expected.subjectId);
      for (let index = 0; index < expected.ids.length; index++) {
        app.answer(index < correctCount);
        app.next();
      }
      const result = app.result();
      const score = engine.scoreSession(result, bank.QUESTION_MAP);
      assert.equal(result.mode, 'new');
      assert.equal(score.total, expected.ids.length);
      assert.equal(score.correct, correctCount);
      assert.equal(score.required, expected.required);
      assert.equal(score.passed, correctCount >= expected.required);
    }
  }
});

test('new-question answers, feedback and choice order survive reload, resume, results and practice again', () => {
  for (const expected of restoredQuestionPools) {
    const app = startRestoredQuestions(expected.subjectId);
    app.answer(true);
    const saved = app.current();
    const reloaded = app.reload();
    assert.deepEqual(reloaded.current(), saved);
    assert.match(reloaded.html(), /feedback-correct/);
    assert.match(reloaded.html(), /Янги қўшилган саволлар/);
    reloaded.click('exit');
    const resumed = reloaded.reload();
    resumed.click('resume');
    assert.deepEqual(resumed.current(), saved);
    resumed.click('finish');
    resumed.click('finish-confirm');
    const result = resumed.result();
    assert.equal(result.mode, 'new');
    assert.deepEqual(result.choiceOrders, saved.choiceOrders);
    assert.equal(engine.scoreSession(result, bank.QUESTION_MAP).correct, 1);
    assert.match(resumed.html(), /Янги қўшилган саволлар/);
    const savedResult = resumed.reload();
    assert.deepEqual(savedResult.result(), result);
    savedResult.click('practice-again');
    assert.match(savedResult.html(), /value="new" checked/);
    savedResult.submit('start-form');
    const next = savedResult.current();
    assert.equal(next.mode, 'new');
    assert.notEqual(next.id, saved.id);
    assert.deepEqual(new Set(next.ids), new Set(expected.ids));
    assert.deepEqual(next.answers, {});
    assert.deepEqual(storage.readState(bank.QUESTION_MAP, bank.SOURCE.id, app.localStorage).results[0], result);
  }
});

test('retries of new-question results contain only incorrect or unanswered questions from that filtered pool', () => {
  for (const expected of restoredQuestionPools) {
    const app = startRestoredQuestions(expected.subjectId);
    const original = app.current();
    if (expected.ids.length > 1) {
      app.answer(true); app.next();
    }
    app.answer(false); app.next();
    if (expected.ids.length > 1) {
      app.click('finish'); app.click('finish-confirm');
    }
    const result = app.result();
    const retry = appHarness({ hash: app.retryLink(), localStorage: app.localStorage });
    assert.equal(retry.current().mode, 'missed');
    assert.equal(retry.current().testId, expected.subjectId);
    assert.deepEqual(new Set(retry.current().ids), new Set(engine.missedQuestionIds(result, bank.QUESTION_MAP)));
    assert.ok(retry.current().ids.every(id => expected.ids.includes(id)));
    assert.equal(retry.current().ids.length, expected.ids.length > 1 ? expected.ids.length - 1 : 1);
    if (expected.ids.length > 1) assert.ok(!retry.current().ids.includes(original.ids[0]));
    retry.answer(true);
    assert.deepEqual(retry.reload().current(), retry.current());
    assert.deepEqual(app.result(), result);
  }
});

test('all-question mode still contains every restored question and all 434 scored questions', () => {
  const ids = [];
  for (const expected of restoredQuestionPools) {
    const app = appHarness({ hash: `#subject/${expected.subjectId}` });
    app.selectMode('all');
    app.submit('start-form');
    const session = app.current();
    assert.equal(session.mode, 'all');
    assert.equal(session.ids.length, expected.fullCount);
    assert.deepEqual(new Set(session.ids), new Set(bank.SUBJECT_MAP[expected.subjectId].questions.map(q => q.id)));
    assert.ok(expected.ids.every(id => session.ids.includes(id)));
    ids.push(...session.ids);
  }
  assert.equal(ids.length, 434);
  assert.equal(new Set(ids).size, 434);
});
