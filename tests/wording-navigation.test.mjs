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
    change(id, checked) { documentEvents.get('change')({ target: { id, checked } }); },
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

function startMode(subjectId, mode = 'wording') {
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

function withFixedRandom(operation) {
  const previous = Math.random;
  Math.random = () => 0.25;
  try { return operation(); }
  finally { Math.random = previous; }
}

function goToQuestion(app, id) {
  const count = app.current().pending.length;
  for (let i = 0; app.current().pending[0] !== id && i < count; i++) app.click('skip');
  assert.equal(app.current().pending[0], id);
}

function comparisonHtml(app) {
  return app.html().match(/<details\b[^>]*class="wording-comparison"[\s\S]*?<\/details>/)?.[0];
}

function visibleText(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

test('every category offers a full wording-practice pool with its correct pass requirement', () => {
  for (const subject of bank.SUBJECTS) {
    const app = appHarness({ hash: `#subject/${subject.id}` });
    assert.match(app.html(), /value="wording"/);
    app.selectMode('wording');
    assert.match(app.html(), new RegExp(`${subject.wordingQuestions.length} та саволдан ${Math.ceil(subject.wordingQuestions.length * .8)} тасига`));
    app.submit('start-form');
    const session = app.current();
    assert.equal(session.mode, 'wording');
    assert.equal(session.testId, subject.id);
    assert.deepEqual(new Set(session.ids), new Set(subject.wordingQuestions.map(question => question.id)));
    assert.equal(session.ids.length, subject.wordingQuestions.length, 'the full pool is not capped at the usual random-test size');
    assert.equal(engine.scoreSession(session, bank.QUESTION_MAP).required, Math.ceil(session.ids.length * .8));
    assert.match(app.html(), /Ўхшаш сўзли саволлар/);
    assert.doesNotMatch(app.html(), /wording-comparison|data-action="unknown"/);
  }
});

test('answer comparisons appear only after answering and show the exact phrase in its correct and incorrect contexts', () => {
  const app = startMode('general-knowledge');
  goToQuestion(app, 'gk-003');
  assert.equal(comparisonHtml(app), undefined);
  app.answer(true);
  const comparison = comparisonHtml(app);
  assert.ok(comparison);
  assert.doesNotMatch(comparison.match(/^<details[^>]*>/)[0], /\bopen(?:\s|=|>)/, 'comparison starts collapsed');
  for (const id of ['gk-003', 'gk-286']) {
    assert.ok(comparison.includes(`data-question-id="${id}"`), id);
    assert.ok(visibleText(comparison).includes(bank.QUESTION_MAP[id].question), 'full question context remains available');
    for (const choice of bank.QUESTION_MAP[id].choices) assert.ok(visibleText(comparison).includes(choice), choice);
  }
  const trap = bank.WORDING_GROUPS.find(group => group.type === 'answers'
    && group.matches.some(match => match.id === 'gk-003') && group.matches.some(match => match.id === 'gk-286'));
  for (const match of trap.matches) {
    const card = comparison.match(new RegExp(`<article\\b[^>]*data-question-id="${match.id}"[^>]*>[\\s\\S]*?<\\/article>`))?.[0];
    assert.ok(card, match.id);
    const matchedChoice = [...card.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/g)].map(item => item[0])
      .find(item => visibleText(item).includes(bank.QUESTION_MAP[match.id].choices[match.choice]));
    assert.ok(matchedChoice, `${match.id}: the matching answer is present`);
    if (bank.QUESTION_MAP[match.id].answer === match.choice) {
      assert.match(matchedChoice, /class="wording-correct"/);
      assert.match(matchedChoice, /Тўғри жавоб/);
    } else {
      assert.match(matchedChoice, /class="wording-trap"/);
      assert.match(matchedChoice, /Бу саволда нотўғри вариант/);
    }
  }
  assert.match(comparison, /wording-correct/);
  assert.match(comparison, /wording-trap/);
  assert.match(comparison, /Бу саволда нотўғри вариант/);
  assert.match(comparison, /Тўғри жавоб/);
  assert.match(comparison, /<mark\b/, 'the literal shared wording is visible even with keyword hints disabled');
  const saved = app.current();
  const reloaded = app.reload();
  assert.deepEqual(reloaded.current(), saved);
  assert.ok(comparisonHtml(reloaded), 'feedback and comparison survive reload');
  reloaded.next();
  assert.equal(comparisonHtml(reloaded), undefined, 'the next unanswered question does not reveal its comparison');
});

test('question-wording comparisons show both full prompts and mark their shared wording', () => {
  const group = bank.WORDING_GROUPS.find(item => item.type === 'questions');
  assert.ok(group);
  const subjectId = bank.QUESTION_MAP[group.matches[0].id].testId;
  const app = startMode(subjectId);
  goToQuestion(app, group.matches[0].id);
  app.answer(false);
  const comparison = comparisonHtml(app);
  assert.ok(comparison);
  for (const match of group.matches) {
    assert.ok(comparison.includes(`data-question-id="${match.id}"`), match.id);
    assert.ok(visibleText(comparison).includes(bank.QUESTION_MAP[match.id].question), match.id);
  }
  assert.match(comparison, /<mark\b/);
});

test('save, exit and resume retain wording mode, question order, choices and feedback', () => {
  for (const subject of bank.SUBJECTS) {
    const app = startMode(subject.id);
    app.answer(false);
    const original = app.current();
    app.click('exit');
    const reload = app.reload();
    reload.click('resume');
    assert.deepEqual(reload.current(), original);
    assert.ok(comparisonHtml(reload));
    reload.next();
    assert.equal(reload.current().mode, 'wording');
    assert.equal(comparisonHtml(reload), undefined);
  }
});

test('results preserve wording mode and repeat the entire pool with different question and choice orders', () => {
  for (const subject of bank.SUBJECTS) withFixedRandom(() => {
    const app = startMode(subject.id);
    const first = app.current();
    const result = finishCurrent(app);
    assert.equal(result.mode, 'wording');
    assert.equal(engine.scoreSession(result, bank.QUESTION_MAP).correct, first.ids.length);
    app.change('show-all', true);
    assert.ok(comparisonHtml(app), 'result review retains wording comparisons');
    app.click('practice-again');
    assert.match(app.html(), /value="wording" checked/);
    app.submit('start-form');
    const repeat = app.current();
    assert.equal(repeat.mode, 'wording');
    assert.deepEqual(new Set(repeat.ids), new Set(first.ids), 'correct answers do not remove group members');
    assert.notDeepEqual(repeat.ids, first.ids, 'even repeated random draws produce a different question order');
    for (const id of first.ids) assert.notDeepEqual(repeat.choiceOrders[id], first.choiceOrders[id], `${id}: answer choices reshuffle`);
    assert.deepEqual(repeat.answers, {});
    assert.equal(repeat.finishedAt, null);
  });
});

test('ordinary practice keeps its 50-question General Knowledge test and does not show wording comparisons', () => {
  const app = startMode('general-knowledge', 'practice');
  const session = app.current();
  assert.equal(session.ids.length, 50);
  assert.equal(engine.scoreSession(session, bank.QUESTION_MAP).required, 40);
  app.answer(true);
  assert.equal(comparisonHtml(app), undefined);
});

test('full General Knowledge still records unknown questions without enabling wording comparisons', () => {
  const app = startMode('general-knowledge', 'all');
  const initial = app.current();
  assert.equal(initial.ids.length, bank.SUBJECT_MAP['general-knowledge'].count);
  const id = initial.pending[0];
  app.click('unknown');
  assert.deepEqual(app.current().unknownIds, [id]);
  assert.equal(comparisonHtml(app), undefined);
  app.answer(true);
  assert.equal(comparisonHtml(app), undefined);
});

