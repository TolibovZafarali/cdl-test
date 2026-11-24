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
  const opened = [];
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
    window: { addEventListener: (type, handler) => events.set(type, handler), scrollTo() {}, open: (...args) => { opened.push(args); return null; } },
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
    localStorage, sessionStorage, opened,
    hash: () => location.hash,
    html: () => app.innerHTML,
    current: () => read('testSession()'),
    result: () => read('resultFor(resultId) ?? null'),
    view: () => read('view'),
    retryLink: () => app.innerHTML.match(/href="(#[^"]*retry\/[^"]+)"/)?.[1],
    unknownLink: () => app.innerHTML.match(/href="(#unknown\/[^"]+)"/)?.[1],
    unknownAnchor: () => app.innerHTML.match(/<a\b[^>]*href="#unknown\/[^"]+"[^>]*>/)?.[0],
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

const general = bank.SUBJECT_MAP['general-knowledge'];
const fixedIds = general.questions.slice(0, 3).map(question => question.id);
const initialUnknownRoute = ids => `#unknown/${ids.map(encodeURIComponent).join(',')}`;

function startMode(subjectId = general.id, mode = 'all') {
  const app = appHarness({ hash: `#subject/${subjectId}` });
  app.selectMode(mode);
  app.submit('start-form');
  return app;
}

function finishCurrent(app, correct = true) {
  while (app.current()) {
    app.answer(correct);
    app.next();
  }
  return app.result();
}

test('I do not know is available only before answering in full General Knowledge and fixed unknown practice', () => {
  const app = startMode();
  assert.equal(app.current().ids.length, general.count);
  assert.match(app.html(), /data-action="unknown"/);
  app.answer(true);
  const feedback = app.current();
  assert.doesNotMatch(app.html(), /data-action="unknown"/);
  app.click('unknown');
  assert.deepEqual(app.current(), feedback, 'a stale unknown action must not replace an answered question');

  for (const [subjectId, mode] of [[general.id, 'practice'], [general.id, 'sets'], [general.id, 'numbers'],
    [general.id, 'new'], ['air-brakes', 'all'], ['combination-vehicles', 'all']]) {
    const other = startMode(subjectId, mode);
    const unchanged = other.current();
    assert.doesNotMatch(other.html(), /data-action="unknown"/, `${subjectId}/${mode}`);
    other.click('unknown');
    assert.deepEqual(other.current(), unchanged, `${subjectId}/${mode}: unsupported action is ignored`);
  }
  const focused = appHarness({ hash: initialUnknownRoute(fixedIds) });
  assert.equal(focused.current().mode, 'unknown-practice');
  assert.match(focused.html(), /data-action="unknown"/);
});

test('marking an unknown records only that question, advances immediately and preserves progress through reload', () => {
  const app = startMode();
  const original = app.current();
  const id = original.pending[0];
  app.click('unknown');
  const saved = app.current();
  assert.deepEqual(saved.unknownIds, [id]);
  assert.deepEqual(saved.answers, {});
  assert.equal(saved.feedbackId, null);
  assert.equal(saved.pending[0], original.pending[1]);
  assert.equal(saved.pending.length, original.pending.length - 1);
  assert.ok(!saved.pending.includes(id));
  assert.match(app.html(), new RegExp(`<progress max="${general.count}" value="1"`));
  const score = engine.scoreSession(saved, bank.QUESTION_MAP);
  assert.equal(score.correct, 0);
  assert.equal(score.answered, 0);
  assert.equal(score.unanswered, general.count);
  assert.deepEqual(app.reload().current(), saved);
});

test('a full-test result offers only explicitly unknown IDs in a new-tab link and leaves the source result intact', () => {
  const app = startMode();
  const first = app.current();
  app.answer(false); app.next();
  app.click('unknown');
  app.click('unknown');
  const unknownIds = first.ids.slice(1, 3);
  app.click('finish'); app.click('finish-confirm');
  const sourceResult = app.result();
  assert.deepEqual(sourceResult.unknownIds, unknownIds);
  assert.match(app.unknownAnchor(), /target="_blank"/);
  assert.match(app.unknownAnchor(), /rel="noopener"/);
  assert.equal(app.unknownLink(), initialUnknownRoute(unknownIds));
  assert.deepEqual(app.opened, [], 'the new tab requires the explicit result link');
  const unknown = appHarness({ hash: app.unknownLink(), localStorage: app.localStorage });
  assert.equal(unknown.current().mode, 'unknown-practice');
  assert.deepEqual(new Set(unknown.current().ids), new Set(unknownIds));
  assert.equal(unknown.hash(), `#retry/session/${unknown.current().id}`);
  unknown.answer(true); unknown.next();
  assert.deepEqual(app.result(), sourceResult);
  assert.deepEqual(storage.readState(bank.QUESTION_MAP, bank.SOURCE.id, app.localStorage).results[0], sourceResult);
});

test('marking the final full-test question unknown completes immediately and offers its one-question set', () => {
  let session = { ...engine.createSession(general.questions, {
    sourceId: bank.SOURCE.id, testId: general.id, count: general.count,
  }), mode: 'all' };
  while (session.pending.length > 1) {
    const question = bank.QUESTION_MAP[session.pending[0]];
    session = engine.advanceQuestion(engine.submitAnswer(session, question.answer, bank.QUESTION_MAP));
  }
  const last = session.pending[0];
  const localStorage = memoryStorage();
  storage.saveState({ active: session, results: [] }, localStorage);
  const app = appHarness({ hash: '#test', localStorage });
  app.click('unknown');
  assert.equal(app.current(), null);
  assert.equal(app.view(), 'result');
  assert.deepEqual(app.result().unknownIds, [last]);
  assert.equal(app.result().pending.length, 0);
  assert.equal(engine.scoreSession(app.result(), bank.QUESTION_MAP).correct, general.count - 1);
  assert.equal(app.unknownLink(), initialUnknownRoute([last]));
  assert.deepEqual(app.opened, []);
  const unknown = appHarness({ hash: app.unknownLink(), localStorage });
  unknown.click('unknown');
  assert.equal(unknown.view(), 'result');
  assert.match(unknown.html(), /data-action="repeat-unknown"/);
});

test('full tests with no explicit unknown answers offer no unknown-practice link', () => {
  const app = startMode();
  app.answer(false); app.next();
  app.click('finish'); app.click('finish-confirm');
  assert.equal(app.unknownLink(), undefined);
  assert.deepEqual(app.opened, []);
  assert.ok(app.retryLink(), 'ordinary missed-question practice is still available');
});

test('fixed unknown practice repeats the entire original set after a perfect score and reshuffles every attempt', t => {
  t.mock.method(Math, 'random', () => 0);
  const app = appHarness({ hash: initialUnknownRoute(fixedIds) });
  const first = app.current();
  const perfect = finishCurrent(app);
  assert.ok(engine.scoreSession(perfect, bank.QUESTION_MAP).passed);
  assert.equal(engine.scoreSession(perfect, bank.QUESTION_MAP).correct, fixedIds.length);
  assert.match(app.html(), /data-action="repeat-unknown"/);
  assert.equal(app.retryLink(), undefined, 'fixed practice must not offer a shrinking missed-question link');
  app.click('repeat-unknown');
  const second = app.current();
  assert.notEqual(second.id, first.id);
  assert.equal(second.mode, 'unknown-practice');
  assert.deepEqual(new Set(second.ids), new Set(fixedIds));
  assert.deepEqual(second.answers, {});
  assert.equal(second.unknownIds?.length ?? 0, 0);
  assert.notDeepEqual(second.ids, first.ids);
  for (const id of fixedIds) assert.notDeepEqual(second.choiceOrders[id], first.choiceOrders[id], id);
  app.answer(false); app.next();
  app.click('unknown');
  app.answer(true); app.next();
  assert.equal(app.retryLink(), undefined);
  app.click('repeat-unknown');
  const third = app.current();
  assert.deepEqual(new Set(third.ids), new Set(fixedIds));
  assert.notDeepEqual(third.ids, second.ids);
  for (const id of fixedIds) assert.notDeepEqual(third.choiceOrders[id], second.choiceOrders[id], id);
});

test('unknown-practice feedback, order and every fixed ID survive reload and history navigation', () => {
  const app = appHarness({ hash: initialUnknownRoute(fixedIds) });
  app.answer(true);
  const first = app.current();
  const reloaded = app.reload();
  assert.deepEqual(reloaded.current(), first);
  reloaded.next();
  const afterNext = reloaded.current();
  assert.deepEqual(afterNext.choiceOrders, first.choiceOrders);
  assert.deepEqual(new Set(afterNext.ids), new Set(fixedIds));
  const otherIds = general.questions.slice(3, 6).map(question => question.id);
  reloaded.visit(initialUnknownRoute(otherIds));
  reloaded.answer(false);
  const second = reloaded.current();
  reloaded.go(-1);
  assert.deepEqual(reloaded.current(), afterNext);
  reloaded.go(1);
  assert.deepEqual(reloaded.current(), second);
  assert.deepEqual(reloaded.reload().current(), second);
});

test('completed unknown attempts remain separately reviewable after repeats and reloads', () => {
  const app = appHarness({ hash: initialUnknownRoute(fixedIds) });
  const first = finishCurrent(app, false);
  app.click('repeat-unknown');
  app.answer(true);
  const second = app.current();
  const restored = app.reload();
  restored.visit(`#result/${first.id}`);
  assert.deepEqual(restored.result(), first);
  assert.match(restored.html(), /data-action="repeat-unknown"/);
  restored.visit(`#retry/session/${second.id}`);
  assert.deepEqual(restored.current(), second);
  restored.visit(`#retry/session/${first.id}`);
  assert.equal(restored.view(), 'result');
  assert.deepEqual(restored.result(), first);
  assert.equal(restored.hash(), `#result/${first.id}`);
});

test('invalid unknown routes never create empty, duplicate, foreign or mixed-subject fixed tests', () => {
  const invalid = ['#unknown/', '#unknown/missing', '#unknown/%E0%A4%A', '#unknown/docx-01',
    `#unknown/${fixedIds[0]},${fixedIds[0]}`, `#unknown/${fixedIds[0]},docx-01`, `#unknown/${fixedIds[0]},`];
  for (const route of invalid) {
    const app = appHarness({ hash: initialUnknownRoute(fixedIds) });
    app.answer(false);
    const saved = app.current();
    app.visit(route);
    assert.equal(app.current(), null, route);
    assert.notEqual(app.view(), 'retry', route);
    app.visit(`#retry/session/${saved.id}`);
    assert.deepEqual(app.current(), saved);
  }
});

test('ordinary missed-question retries still shrink while coexisting with fixed unknown practice', () => {
  const app = appHarness({ hash: '#retry/docx-01,docx-02,docx-03' });
  const original = app.current();
  app.answer(true); app.next();
  app.answer(false); app.next();
  app.answer(true); app.next();
  assert.equal(app.result().mode, 'missed');
  assert.doesNotMatch(app.html(), /data-action="repeat-unknown"/);
  const next = appHarness({ hash: app.retryLink(), localStorage: app.localStorage });
  assert.deepEqual(next.current().ids, [original.ids[1]]);
  assert.equal(next.current().mode, 'missed');
  next.answer(true); next.next();
  assert.equal(next.retryLink(), undefined);
  app.visit(initialUnknownRoute(fixedIds));
  app.answer(false);
  app.visit(`#retry/session/${original.id}`);
  assert.equal(app.view(), 'result');
  assert.equal(app.result().mode, 'missed');
});

