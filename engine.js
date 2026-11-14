const MAX_DATE = 8.64e15;
const reservedIds = new Set(['__proto__', 'prototype', 'constructor']);
const has = (object, key) => Object.hasOwn(object, key);
const identifier = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 256 && !reservedIds.has(value);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const timestamp = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_DATE;

function validQuestion(question) {
  return record(question) && identifier(question.id) && Array.isArray(question.choices)
    && question.choices.length >= 2 && question.choices.every(choice => typeof choice === 'string' && choice.trim())
    && Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.choices.length;
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Random values must be between zero and one');
    const target = Math.floor(value * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createSession(questions, { sourceId, testId = 'all', count = 50, randomize = true } = {}, random = Math.random) {
  if (!identifier(sourceId) || !identifier(testId)) throw new Error('A valid question source and test are required');
  if (!Array.isArray(questions) || !questions.every(validQuestion)) throw new Error('The question source is invalid');
  if (new Set(questions.map(question => question.id)).size !== questions.length) throw new Error('Question identifiers must be unique');
  if (!Number.isInteger(count) || count < 1 || typeof randomize !== 'boolean') throw new Error('Choose a valid question count');
  const pool = questions.filter(question => testId === 'all' || question.testId === testId);
  if (!pool.length) throw new Error('This test has no questions');
  const ordered = randomize ? shuffle(pool, random) : pool;
  const ids = ordered.slice(0, Math.min(count, pool.length)).map(question => question.id);
  return {
    version: 2,
    id: globalThis.crypto.randomUUID(),
    sourceId,
    testId,
    ids,
    pending: [...ids],
    answers: {},
    feedbackId: null,
    startedAt: Date.now(),
    finishedAt: null,
  };
}

export function submitAnswer(session, choice, questionMap) {
  if (session.finishedAt !== null || session.feedbackId != null) return session;
  const id = session.pending[0];
  if (!record(questionMap) || !has(questionMap, id) || !validQuestion(questionMap[id])) throw new Error('This question is unavailable');
  const question = questionMap[id];
  if (has(session.answers, id)) throw new Error('This question has already been answered');
  if (!Number.isInteger(choice) || choice < 0 || choice >= question.choices.length) throw new Error('Choose one answer');
  return {
    ...session,
    answers: { ...session.answers, [id]: choice },
    pending: session.pending.slice(1),
    feedbackId: id,
  };
}

export function advanceQuestion(session) {
  if (session.finishedAt !== null || session.feedbackId == null) return session;
  const next = { ...session, feedbackId: null };
  return next.pending.length ? next : finishSession(next);
}

export function skipQuestion(session) {
  if (session.finishedAt !== null || session.feedbackId != null || session.pending.length < 2) return session;
  const [id, ...rest] = session.pending;
  return { ...session, pending: [...rest, id] };
}

export function finishSession(session) {
  if (session.finishedAt !== null) return session;
  return { ...session, feedbackId: null, finishedAt: Math.max(Date.now(), session.startedAt) };
}

export function scoreSession(session, questionMap) {
  const answeredIds = session.ids.filter(id => has(session.answers, id));
  const correct = answeredIds.filter(id => has(questionMap, id) && session.answers[id] === questionMap[id].answer).length;
  const total = session.ids.length;
  const answered = answeredIds.length;
  const required = Math.ceil(total * 0.8);
  return {
    total,
    answered,
    correct,
    incorrect: answered - correct,
    unanswered: total - answered,
    required,
    percent: total ? Math.round(correct / total * 100) : 0,
    passed: total > 0 && correct >= required,
  };
}

export function validateSession(session, questionMap, sourceId) {
  if (!record(session) || !record(questionMap) || !identifier(sourceId)) return false;
  const fields = ['version', 'id', 'sourceId', 'testId', 'ids', 'pending', 'answers', 'startedAt', 'finishedAt'];
  if (fields.some(field => !has(session, field))) return false;
  if (session.version !== 2 || !identifier(session.id) || session.sourceId !== sourceId || !identifier(session.testId)) return false;
  if (!timestamp(session.startedAt) || (session.finishedAt !== null && (!timestamp(session.finishedAt) || session.finishedAt < session.startedAt))) return false;
  if (!Array.isArray(session.ids) || !session.ids.length || session.ids.length > Object.keys(questionMap).length) return false;
  const ids = new Set(session.ids);
  if (ids.size !== session.ids.length) return false;
  for (const id of session.ids) {
    if (!identifier(id) || !has(questionMap, id)) return false;
    const question = questionMap[id];
    if (!validQuestion(question) || question.id !== id || (session.testId !== 'all' && question.testId !== session.testId)) return false;
  }
  if (!Array.isArray(session.pending) || !record(session.answers)) return false;
  const pending = new Set(session.pending);
  const answeredIds = Object.keys(session.answers);
  if (pending.size !== session.pending.length || session.pending.some(id => !ids.has(id))) return false;
  if (session.pending.length + answeredIds.length !== session.ids.length) return false;
  if (has(session, 'feedbackId') && session.feedbackId !== null) {
    if (!identifier(session.feedbackId) || !ids.has(session.feedbackId)
      || !has(session.answers, session.feedbackId) || session.finishedAt !== null) return false;
  }
  if (session.finishedAt === null && !session.pending.length && session.feedbackId == null) return false;
  for (const id of answeredIds) {
    if (!ids.has(id) || pending.has(id)) return false;
    const answer = session.answers[id];
    if (!Number.isInteger(answer) || answer < 0 || answer >= questionMap[id].choices.length) return false;
  }
  return session.ids.every(id => pending.has(id) !== has(session.answers, id));
}
