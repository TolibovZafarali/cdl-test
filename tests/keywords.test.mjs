import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS } from '../data/index.js';
import { KEYWORDS } from '../data/keywords.js';
import { getChoiceText } from '../engine.js';
import { escapeText, highlightKeyword } from '../keywords.js';
import { KEYWORD_HINTS_KEY, readKeywordHints, saveKeywordHints } from '../storage.js';

const marks = html => [...html.matchAll(/<mark class="memory-keyword">([^<]+)<\/mark>/g)];
const unmark = html => html.replace(/<\/?mark(?: class="memory-keyword")?>/g, '');

test('every question has one or two distinct short cues in its prompt and corrected answer', () => {
  assert.deepEqual(Object.keys(KEYWORDS).sort(), QUESTIONS.map(q => q.id).sort());
  for (const question of QUESTIONS) {
    const pair = KEYWORDS[question.id];
    assert.equal(pair.length, 2, question.id);
    for (const [index, text] of [question.question, question.choices[question.answer]].entries()) {
      const cues = pair[index];
      assert.ok(Array.isArray(cues) && cues.length >= 1 && cues.length <= 2, question.id);
      assert.equal(new Set(cues.map(cue => cue.toLowerCase())).size, cues.length, question.id);
      for (const cue of cues) {
        assert.equal(typeof cue, 'string', question.id);
        assert.equal(cue.trim(), cue, question.id);
        assert.ok(cue.split(/\s+/).length <= 4, `${question.id}: ${cue}`);
      }
      const highlighted = highlightKeyword(text, cues, true);
      assert.equal(marks(highlighted).length, cues.length, `${question.id}: ${cues}`);
      assert.deepEqual(marks(highlighted).map(match => match[1].toLowerCase()).sort(), cues.map(cue => escapeText(cue).toLowerCase()).sort(), question.id);
      assert.equal(unmark(highlighted), escapeText(text), question.id);
      assert.equal(highlightKeyword(text, cues, false), escapeText(text), question.id);
    }
  }
});

test('correct-answer cues remain valid after every choice permutation', () => {
  const permutations = items => items.length < 2 ? [items] : items.flatMap((item, i) =>
    permutations(items.filter((_, j) => j !== i)).map(rest => [item, ...rest]));
  for (const question of QUESTIONS) {
    for (const order of permutations(question.choices.map((_, i) => i))) {
      const session = { choiceOrders: { [question.id]: order } };
      const text = getChoiceText(session, question, question.answer);
      assert.equal(marks(highlightKeyword(text, KEYWORDS[question.id][1], true)).length, KEYWORDS[question.id][1].length, question.id);
    }
  }
});

test('highlighting marks a single complete occurrence and escapes all text', () => {
  const text = 'Stopping: STOP, then stop. <script> & "brakes"';
  const result = highlightKeyword(text, 'stop', true);
  assert.deepEqual(marks(result).map(match => match[1]), ['STOP']);
  assert.equal(unmark(result), escapeText(text));
  assert.ok(!result.includes('<script>'));
  assert.equal(highlightKeyword('braking', 'brake', true), 'braking');
  assert.equal(highlightKeyword('air brakes', 'air brakes', true), '<mark class="memory-keyword">air brakes</mark>');
  assert.equal(highlightKeyword('brakes', undefined, true), 'brakes');
  assert.equal(marks(highlightKeyword('At 0.04, not 0x04.', '0.04', true))[0][1], '0.04');
});

test('multiple cues highlight once each in text order, preserving phrases and escaped characters', () => {
  const text = 'Use air brakes at 0.04, not 0x04. Air brakes <script> & "stop"';
  const result = highlightKeyword(text, ['0.04', 'air brakes'], true);
  assert.deepEqual(marks(result).map(match => match[1]), ['air brakes', '0.04']);
  assert.equal(unmark(result), escapeText(text));
  assert.ok(!result.includes('<script>'));
  assert.equal(highlightKeyword(text, ['0.04', 'air brakes'], false), escapeText(text));
  assert.equal(highlightKeyword('braking airflow', ['brake', 'air'], true), 'braking airflow');
});

test('overlapping and duplicate cues never produce nested marks or change the original text', () => {
  for (const cues of [['brakes', 'air brakes'], ['air brakes', 'brakes'], ['air brakes', 'AIR BRAKES']]) {
    const result = highlightKeyword('Use air brakes, then air brakes again.', cues, true);
    assert.deepEqual(marks(result).map(match => match[1]), ['air brakes']);
    assert.equal(unmark(result), 'Use air brakes, then air brakes again.');
  }
  assert.equal(highlightKeyword('<unsafe>', [null, '', ' ', 4], true), '&lt;unsafe&gt;');
});

test('keyword hints default off and persist independently of test progress', () => {
  const values = new Map([['test-progress', 'unchanged']]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.equal(readKeywordHints(storage), false);
  assert.equal(saveKeywordHints(true, storage), true);
  assert.equal(values.get(KEYWORD_HINTS_KEY), 'true');
  assert.equal(readKeywordHints(storage), true);
  assert.equal(saveKeywordHints(false, storage), true);
  assert.equal(readKeywordHints(storage), false);
  assert.equal(values.get('test-progress'), 'unchanged');
  values.set(KEYWORD_HINTS_KEY, 'invalid');
  assert.equal(readKeywordHints(storage), false);
});

test('unavailable preference storage does not prevent practice', () => {
  const blocked = { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Full'); } };
  assert.equal(readKeywordHints(blocked), false);
  assert.equal(saveKeywordHints(true, blocked), false);
});
