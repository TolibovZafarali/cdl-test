import test from 'node:test';
import assert from 'node:assert/strict';
import { WORDING_GROUPS, QUESTION_MAP, SUBJECTS } from '../data/index.js';

test('every wording comparison is backed by literal text in distinct questions from one subject', () => {
  assert.ok(WORDING_GROUPS.length > 0);
  assert.equal(new Set(WORDING_GROUPS.map(group => group.id)).size, WORDING_GROUPS.length);
  for (const group of WORDING_GROUPS) {
    assert.ok(group.id, 'each group has a stable identifier');
    assert.ok(['questions', 'answers'].includes(group.type), group.id);
    assert.ok(group.matches.length >= 2, group.id);
    assert.equal(new Set(group.matches.map(match => match.id)).size, group.matches.length, group.id);
    const subjects = new Set();
    for (const match of group.matches) {
      const question = QUESTION_MAP[match.id];
      assert.ok(question, `${group.id}: ${match.id} exists`);
      subjects.add(question.testId);
      assert.equal(typeof match.phrase, 'string');
      assert.ok(match.phrase.trim(), `${group.id}: wording evidence is not empty`);
      let text = question.question;
      if (group.type === 'answers') {
        assert.ok(Number.isInteger(match.choice) && match.choice >= 0 && match.choice < question.choices.length, group.id);
        text = question.choices[match.choice];
      }
      assert.ok(text.includes(match.phrase), `${group.id}/${match.id}: ${JSON.stringify(match.phrase)} occurs in ${JSON.stringify(text)}`);
    }
    assert.equal(subjects.size, 1, `${group.id}: comparisons stay within their practice subject`);
  }
});

test('answer-wording groups demonstrate both correct and incorrect choices, excluding generic catch-all answers', () => {
  const groups = WORDING_GROUPS.filter(group => group.type === 'answers');
  assert.ok(groups.length > 0);
  for (const group of groups) {
    const roles = group.matches.map(match => QUESTION_MAP[match.id].answer === match.choice);
    assert.ok(roles.includes(true), `${group.id}: contains a correct choice`);
    assert.ok(roles.includes(false), `${group.id}: contains an incorrect choice`);
    for (const match of group.matches) {
      assert.doesNotMatch(QUESTION_MAP[match.id].choices[match.choice], /^(?:(?:all|none|both) of the above|both [a-z] and [a-z](?: are correct)?)\.?$/i, `${group.id}: uses a substantive answer phrase`);
    }
  }
});

test('each subject includes every member of its curated groups exactly once without adding unrelated questions', () => {
  for (const subject of SUBJECTS) {
    const groups = WORDING_GROUPS.filter(group => QUESTION_MAP[group.matches[0].id].testId === subject.id);
    assert.ok(groups.length > 0, `${subject.id}: offers wording practice`);
    assert.deepEqual(subject.wordingGroups, groups);
    const expected = new Set(groups.flatMap(group => group.matches.map(match => match.id)));
    assert.equal(subject.wordingQuestions.length, expected.size, subject.id);
    assert.deepEqual(new Set(subject.wordingQuestions.map(question => question.id)), expected, subject.id);
    assert.ok(subject.wordingQuestions.every(question => QUESTION_MAP[question.id] === question && question.testId === subject.id));
  }
});

test('the work-zone answer trap preserves the same words and opposite correct-choice roles', () => {
  const trap = WORDING_GROUPS.find(group => group.type === 'answers'
    && group.matches.some(match => match.id === 'gk-003')
    && group.matches.some(match => match.id === 'gk-286'));
  assert.ok(trap, 'the audited work-zone trap is included');
  const matches = ['gk-003', 'gk-286'].map(id => trap.matches.find(match => match.id === id));
  const [first, second] = matches.map(match => QUESTION_MAP[match.id]);
  assert.equal(first.choices[matches[0].choice], second.choices[matches[1].choice]);
  assert.notEqual(first.answer === matches[0].choice, second.answer === matches[1].choice);
});
