import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS } from '../data/index.js';
import { KEYWORDS } from '../data/keywords.js';
import { getChoiceText } from '../engine.js';
import { escapeText, highlightKeyword } from '../keywords.js';
import { KEYWORD_HINTS_KEY, readKeywordHints, saveKeywordHints } from '../storage.js';

const marks = html => [...html.matchAll(/<mark class="memory-keyword">([^<]+)<\/mark>/g)];
const unmark = html => html.replace(/<\/?mark(?: class="memory-keyword")?>/g, '');

test('every question has exactly one cue in its prompt and corrected answer', () => {
  assert.deepEqual(Object.keys(KEYWORDS).sort(), QUESTIONS.map(q => q.id).sort());
  for (const question of QUESTIONS) {
    const pair = KEYWORDS[question.id];
    assert.equal(pair.length, 2, question.id);
    for (const [index, text] of [question.question, question.choices[question.answer]].entries()) {
      const keyword = pair[index];
      assert.equal(typeof keyword, 'string', question.id);
      assert.match(keyword, /^[\p{L}\p{N}]+(?:[’'./–-][\p{L}\p{N}]+)*$/u, question.id);
      const highlighted = highlightKeyword(text, keyword, true);
      assert.equal(marks(highlighted).length, 1, `${question.id}: ${keyword}`);
      assert.equal(marks(highlighted)[0][1].toLowerCase(), escapeText(keyword).toLowerCase(), question.id);
      assert.equal(unmark(highlighted), escapeText(text), question.id);
      assert.equal(highlightKeyword(text, keyword, false), escapeText(text), question.id);
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
      assert.equal(marks(highlightKeyword(text, KEYWORDS[question.id][1], true)).length, 1, question.id);
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
  assert.equal(highlightKeyword('air brakes', 'air brakes', true), 'air brakes');
  assert.equal(highlightKeyword('brakes', undefined, true), 'brakes');
  assert.equal(marks(highlightKeyword('At 0.04, not 0x04.', '0.04', true))[0][1], '0.04');
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
