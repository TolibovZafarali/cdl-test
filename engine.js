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

export function shuffle(items, random = Math.random, previousOrder) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Random values must be between zero and one');
    const target = Math.floor(value * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  if (result.length > 1 && previousOrder?.length === result.length && result.every((item, index) => item === previousOrder[index])) {
    [result[0], result[1]] = [result[1], result[0]];
  }
  return result;
}

export function drawPracticeBatch(questions, count, previousIds = [], seenIds = [], random = Math.random) {
  if (!Number.isInteger(count) || count < 1) throw new RangeError('Choose a valid question count');
  const current = new Set(previousIds);
  const seen = new Set([...seenIds, ...previousIds]);
  const candidates = shuffle(questions.filter(question => !current.has(question.id)), random);
  const stems = new Set(questions.filter(question => current.has(question.id)).map(question => question.question));
  const ranked = [];
  // Older saves can include questions seen outside the learner's current set.
  for (const previouslySeen of [false, true]) {
    const repeatedStems = [];
    for (const question of candidates) {
      if (seen.has(question.id) !== previouslySeen) continue;
      if (stems.has(question.question)) repeatedStems.push(question);
      else {
        ranked.push(question);
        stems.add(question.question);
      }
    }
    ranked.push(...repeatedStems);
  }
  const additions = ranked.slice(0, count);
  for (const question of additions) seen.add(question.id);
  return { questions: additions, seenIds: [...seen] };
}

export function getChoiceOrder(session, question) {
  return session.choiceOrders?.[question.id] ?? question.choices.map((_, index) => index);
}

export function getChoiceLetter(session, question, canonicalIndex) {
  const position = getChoiceOrder(session, question).indexOf(canonicalIndex);
  return String.fromCharCode(65 + position);
}

export function getCorrectAnswerUz(session, question) {
  return question.correctAnswerUz.replace(/\{(first|second)\}/g, (_, key) =>
    getChoiceLetter(session, question, key === 'first' ? 0 : 1));
}

export function getChoiceText(session, question, canonicalIndex) {
  const text = question.choices[canonicalIndex];
  if (!session.choiceOrders || !has(session.choiceOrders, question.id)) return text;
  if (!/^Both (?:A and B(?: are correct)?|of the above)\.$/i.test(text)) return text;
  const first = getChoiceLetter(session, question, 0);
  const second = getChoiceLetter(session, question, 1);
  return `Both ${first} and ${second}${/ are correct\.$/i.test(text) ? ' are correct' : ''}.`;
}

export function createSession(questions, { sourceId, testId = 'all', count = 50, randomize = true, previousAttempt } = {}, random = Math.random) {
  if (!identifier(sourceId) || !identifier(testId)) throw new Error('A valid question source and test are required');
  if (!Array.isArray(questions) || !questions.every(validQuestion)) throw new Error('The question source is invalid');
  if (new Set(questions.map(question => question.id)).size !== questions.length) throw new Error('Question identifiers must be unique');
  if (!Number.isInteger(count) || count < 1 || typeof randomize !== 'boolean') throw new Error('Choose a valid question count');
  const pool = questions.filter(question => testId === 'all' || question.testId === testId);
  if (!pool.length) throw new Error('This test has no questions');
  const ordered = randomize ? shuffle(pool, random) : pool;
  const selected = ordered.slice(0, Math.min(count, pool.length));
  const ids = selected.map(question => question.id);
  const choiceOrders = Object.fromEntries(selected.map(question => {
    const indices = question.choices.map((_, index) => index);
    const previous = previousAttempt?.ids.includes(question.id) ? getChoiceOrder(previousAttempt, question) : undefined;
    return [question.id, shuffle(indices, random, previous)];
  }));
  return {
    version: 2,
    id: globalThis.crypto.randomUUID(),
    sourceId,
    testId,
    ids,
    choiceOrders,
    pending: [...ids],
    answers: {},
    feedbackId: null,
    startedAt: Date.now(),
    finishedAt: null,
  };
}

export function samePracticeSet(ids, otherIds) {
  return ids.length === otherIds.length && ids.every(id => otherIds.includes(id));
}

export function createPracticeSetSession(questions, settings, progress, { advance = false, previousAttempt } = {}, random = Math.random) {
  const currentIds = progress?.previousIds ?? previousAttempt?.ids ?? [];
  const retryIds = previousAttempt?.ids ?? currentIds;
  let ids = retryIds;
  let seenIds;
  if (advance || !ids.length) {
    const batch = drawPracticeBatch(questions, settings.count, currentIds, progress?.seenIds, random);
    ids = [...currentIds, ...batch.questions.map(question => question.id)];
    seenIds = batch.seenIds;
  } else if (!progress) {
    seenIds = [...ids];
  }

  const byId = new Map(questions.map(question => [question.id, question]));
  const ordered = shuffle(ids, random, retryIds).map(id => byId.get(id));
  const session = createSession(ordered, { ...settings, count: ordered.length, randomize: false, previousAttempt }, random);
  const nextProgress = seenIds ? { previousIds: [...session.ids], seenIds } : progress;
  return { session: { ...session, mode: 'sets' }, progress: nextProgress };
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
  if (has(session, 'choiceOrders')) {
    if (!record(session.choiceOrders) || Object.keys(session.choiceOrders).length !== ids.size) return false;
    for (const id of session.ids) {
      if (!has(session.choiceOrders, id)) return false;
      const order = session.choiceOrders[id];
      const count = questionMap[id].choices.length;
      if (!Array.isArray(order) || order.length !== count || new Set(order).size !== count) return false;
      for (const choice of order) {
        if (!Number.isInteger(choice) || choice < 0 || choice >= count) return false;
      }
    }
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
