import { SOURCE, QUESTION_MAP, SUBJECTS, SUBJECT_MAP } from './data/index.js';
import { QUESTION_NOTES, EXCLUDED_NOTES } from './data/interface-uz.js';
import { KEYWORDS } from './data/keywords.js';
import { escapeText as escape, highlightKeyword } from './keywords.js';
import { createSession, createPracticeSetSession, createMissedSession, createUnknownSession, markUnknown, missedQuestionIds, samePracticeSet, shuffle, submitAnswer, advanceQuestion, skipQuestion, finishSession, scoreSession, getChoiceOrder, getChoiceText, getChoiceLetter, getCorrectAnswerUz } from './engine.js';
import { STORAGE_KEY, KEYWORD_HINTS_KEY, readState, saveState, clearState, emptyState, readRetry, saveRetry, readKeywordHints, saveKeywordHints } from './storage.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const letter = index => String.fromCharCode(65 + index);
const date = time => new Intl.DateTimeFormat('uz-Cyrl-UZ', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(time);
const arrow = '<span aria-hidden="true">→</span>';
let state = readState(QUESTION_MAP, SOURCE.id);
let retry = readRetry(QUESTION_MAP, SOURCE.id);
const retrySessions = new Map(retry ? [[retry.id, retry]] : []);
const failedRetryIds = new Set();
let keywordHints = readKeywordHints();
let view = 'home';
let subjectId = SUBJECTS[0].id;
let mode = 'practice';
let resultId = null;
let showAll = false;
let saveFailed = false;
let retrySaveFailed = false;
let returnFocus;
let pendingStart;

function save() {
  saveFailed = !saveState(state);
}
function persistRetry(session) {
  const saved = saveRetry(session);
  if (session) {
    if (saved) failedRetryIds.delete(session.id);
    else failedRetryIds.add(session.id);
  }
  retrySaveFailed = !saved || failedRetryIds.size > 0;
}
function storeRetry(session) {
  retry = session;
  if (session) retrySessions.set(session.id, session);
  else { retrySessions.clear(); failedRetryIds.clear(); }
  persistRetry(session);
}
function retryFor(id) {
  return retrySessions.get(id) || readRetry(QUESTION_MAP, SOURCE.id, id);
}
function testSession() {
  if (view === 'retry') return retry?.finishedAt === null ? retry : null;
  return view === 'test' ? state.active : null;
}
function saveTest(session) {
  if (view === 'retry') {
    storeRetry(session);
  } else {
    state.active = session;
    save();
  }
}
function focusHeading() { document.querySelector('h1')?.focus({ preventScroll: true }); }
function navigate(next) {
  view = next;
  const hash = next === 'result' ? `result/${resultId}` : next === 'subject' ? `subject/${subjectId}` : next === 'retry' && retry ? `retry/session/${retry.id}` : next;
  history.pushState(null, '', `#${hash}`);
  render();
  window.scrollTo(0, 0);
  focusHeading();
  announce('');
}
function announce(message) { document.querySelector('#status').textContent = message; }
function subjectFor(session) { return SUBJECT_MAP[session.testId]; }
function canMarkUnknown(session) { return session.testId === 'general-knowledge' && ['all', 'unknown-practice'].includes(session.mode); }
const setModeLabel = 'Босқичма-босқич машқ';
const numbersModeLabel = 'Сонли жавоблар';
const mphModeLabel = 'MPH жавоблар';
const newModeLabel = 'Янги қўшилган саволлар';
const wordingModeLabel = 'Ўхшаш сўзли саволлар';
function modeFor(session) {
  if (session.mode === 'wording') return wordingModeLabel;
  if (session.mode === 'unknown-practice') return 'Билмаган саволларим';
  if (session.mode === 'missed') return 'Хатолар устида машқ';
  if (session.mode === 'numbers') return numbersModeLabel;
  if (session.mode === 'mph') return mphModeLabel;
  if (session.mode === 'new') return newModeLabel;
  if (session.mode === 'sets' && subjectFor(session)?.setSize) return `${setModeLabel} · ${session.ids.length} та савол`;
  return session.mode === 'all' || (!session.mode && session.ids.length === subjectFor(session)?.count) ? 'Барча саволлар' : 'Машқ тести';
}
function resultFor(id) {
  if (retry && retry.finishedAt !== null && retry.id === id) return retry;
  const result = state.results.find(result => result.id === id) || retryFor(id);
  return result && result.finishedAt !== null ? result : null;
}
function sessionLabel(session) { return `${subjectFor(session)?.title || 'Машқ'} · ${modeFor(session)}`; }
function sourceNotes(subject) {
  const reviewed = subject.questions.filter(q => q.correctionNote || q.contentNote);
  return `<details class="source-details"><summary>Саволлар ҳақида</summary><div><p>Саволлар сиз юклаган ҳужжат асосида тайёрланган. Ноаниқ саволлар аниқлаштирилди, битта жавобли саволларга қўшимча вариантлар киритилди. Тузатишлар қуйида кўрсатилган. Ҳар бир янги тестда саволлар ва жавоб вариантлари тасодифий тартибда берилади. Жавоблардаги ҳарфларга ҳаволалар янги тартибга мосланади.</p>${subject.excluded.length ? `<p>Қуйидаги саволлар баҳоланадиган тестларга киритилмаган:</p><ul>${subject.excluded.map(q => `<li>${escape(q.number)}-савол: ${escape(EXCLUDED_NOTES[`${subject.id}:${q.number}`])}</li>`).join('')}</ul>` : ''}${reviewed.length ? `<p>${reviewed.length} та саволда матн, вариант ёки жавоб калити тузатилган. Тузатишлар CDL қўлланмаси ва транспорт тадқиқотлари билан текширилган.</p><ul>${reviewed.map(q => `<li>${q.number}-савол: ${[QUESTION_NOTES[q.id]?.contentNote, QUESTION_NOTES[q.id]?.correctionNote].filter(Boolean).map(escape).join(' ')} ${referenceLinks(q)}</li>`).join('')}</ul>` : ''}<p><a href="${subject.sourceUrl}" download>Асл ҳужжатни юклаб олиш</a></p></div></details>`;
}
function referenceLinks(question) {
  const urls = question.referenceUrls || (question.referenceUrl ? [question.referenceUrl] : []);
  return urls.map((url, index) => `<a href="${escape(url)}" target="_blank" rel="noopener">Манба${urls.length > 1 ? ` ${index + 1}` : ''}</a>`).join(' · ');
}
function recentResults() {
  const results = retry && retry.finishedAt !== null
    ? [retry, ...state.results].sort((a, b) => b.finishedAt - a.finishedAt)
    : state.results;
  if (!results.length) return '';
  return `<details class="recent-results"><summary>Аввалги натижалар <span>${results.length}</span></summary><ul>${results.map(session => {
    const score = scoreSession(session, QUESTION_MAP);
    return `<li><button class="result-link" data-action="result" data-id="${escape(session.id)}"><span>${escape(subjectFor(session)?.title)}<small>${date(session.finishedAt)} · ${modeFor(session)}</small></span><span>${score.correct} / ${score.total}<small>${score.passed ? 'Ўтди' : 'Ўтмади'}</small></span></button></li>`;
  }).join('')}</ul><button class="text-button" data-action="clear">Сақланган натижаларни ўчириш</button></details>`;
}
function resumeCard(active, isRetry = false) {
  if (!active || active.finishedAt !== null) return '';
  return `<section class="resume" aria-label="Тугалланмаган тест"><div><p class="eyebrow">Қолган жойингиздан давом этинг</p><h2>${escape(isRetry ? sessionLabel(active) : subjectFor(active)?.title)}</h2><p>${active.ids.length} та саволдан ${scoreSession(active, QUESTION_MAP).answered + (active.unknownIds?.length || 0)} таси кўриб чиқилган</p></div><button class="primary" data-action="${isRetry ? 'resume-retry' : 'resume'}">Давом этиш ${arrow}</button></section>`;
}
function home() {
  return `<div class="page-heading"><p class="eyebrow">Назарий имтиҳонга тайёргарлик</p><h1 tabindex="-1">CDL назарий тестлари</h1><p class="intro">Ҳар бир саволни ечинг ва тўғри жавобни эслаб қолинг.</p></div>
    ${resumeCard(retry, true)}${resumeCard(state.active)}
    <section class="subject-list" aria-label="Мавзуни танланг">${SUBJECTS.map((subject, index) => `<button class="subject-row" data-action="subject" data-id="${subject.id}"><span class="subject-number" aria-hidden="true">0${index + 1}</span><span class="subject-copy"><span class="subject-title">${subject.title}</span><span class="subject-description">${subject.description}</span></span><span class="subject-count">${subject.count} та савол</span><span class="subject-arrow" aria-hidden="true">↗</span></button>`).join('')}</section>
    <p class="library-note">Натижалар шу қурилмада сақланади.</p>${recentResults()}`;
}
function modeOption(value, title, description) {
  return `<label class="mode-option"><input type="radio" name="test-mode" value="${value}" ${mode === value ? 'checked' : ''}><span><strong>${title}</strong><span>${description}</span></span></label>`;
}
function keywordSwitch() {
  return `<div class="keyword-setting"><label class="keyword-switch"><input type="checkbox" role="switch" id="keyword-hints" aria-describedby="keyword-description" ${keywordHints ? 'checked' : ''}><span>Таянч сўзлар</span></label><p id="keyword-description">Савол ва тўғри жавобда 1–2 та муҳим сўз ёки қисқа ибора ажратилади. Тўғри жавоб танлашдан олдин ҳам кўринади.</p></div>`;
}
function subjectScreen() {
  const subject = SUBJECT_MAP[subjectId];
  const practiceCount = Math.min(subject.practiceCount, subject.count);
  const currentSize = state.generalPracticeProgress?.previousIds.length ?? subject.setSize;
  const count = mode === 'all' ? subject.count : mode === 'sets' ? currentSize : mode === 'numbers' ? subject.numberQuestions.length : mode === 'mph' ? subject.mphQuestions.length : mode === 'new' ? subject.newQuestions.length : mode === 'wording' ? subject.wordingQuestions.length : practiceCount;
  const options = [modeOption('practice', 'Машқ тести', `${practiceCount} та савол · Тасодифий танлов`)];
  if (subject.newQuestions.length) {
    options.push(modeOption('new', newModeLabel, `${subject.newQuestions.length} та савол · Алоҳида машқ`));
  }
  if (subject.setSize) {
    options.push(modeOption('sets', setModeLabel, `Жорий тўпламда ${currentSize} та савол`));
  }
  options.push(modeOption('all', 'Барча саволлар', `${subject.count} та савол · Тасодифий тартибда`));
  if (subject.numberQuestions?.length) {
    options.push(modeOption('numbers', numbersModeLabel, `${subject.numberQuestions.length} та савол · Рақам ёки сўз билан ёзилган сонлар`));
  }
  if (subject.mphQuestions?.length) {
    options.push(modeOption('mph', mphModeLabel, `${subject.mphQuestions.length} та савол · Жавобларда соатига миля`));
  }
  if (subject.wordingQuestions.length) {
    options.push(modeOption('wording', wordingModeLabel, `${subject.wordingQuestions.length} та савол · Савол ёки жавобдаги ўхшаш сўзлар`));
  }
  const note = mode === 'wording'
    ? 'Савол ёки жавобида бир хил ёки ўхшаш инглизча сўзлар бор саволлар. Ўхшаш жавоб бир саволда тўғри, бошқасида нотўғри вариант бўлиши мумкин. Жавоб бергач, саволларни солиштириб кўринг. Ҳар бир янги уринишда барча саволлар ва жавоб вариантлари аралаштирилади.'
    : mode === 'sets'
    ? (currentSize < subject.count
      ? `Тўпламни хоҳлаганча такрорланг. Тайёр бўлганда яна ${Math.min(subject.setSize, subject.count - currentSize)} та савол қўшинг. Аввалги ва янги саволлар аралаш тартибда берилади.`
      : `Барча ${subject.count} та савол тўпламга киритилган. Ҳар бир уринишда саволлар аралаштирилади.`)
    : mode === 'numbers'
      ? 'Камида битта жавоб вариантида сон бор саволлар. Рақамлар ҳам, сўз билан ёзилган сонлар ҳам ҳисобга олинади. Барча саволлар тасодифий тартибда берилади.'
      : mode === 'mph'
        ? 'Камида битта жавоб вариантида mph ёки miles per hour (соатига миля) бор саволлар. Саволлар ва жавоб вариантлари тасодифий тартибда берилади.'
        : mode === 'new'
        ? 'Фақат сўнгги қўшилган саволлар билан машқ қилинг. Улар бошқа тестларда ҳам бор. Саволлар ва жавоб вариантлари тасодифий тартибда берилади.'
        : mode === 'all' && subject.id === 'general-knowledge'
          ? 'Билган саволингизга жавоб беринг. Ишончингиз комил бўлмаса, «Билмайман»ни босинг. Тест охирида шу саволларни янги варақда алоҳида машқ қилишингиз мумкин.'
          : 'Жавобни танласангиз, натижа дарҳол кўринади. Тўғри жавобни эслаб қолинг, кейин давом этинг.';
  return `<button class="back-link" data-action="home"><span aria-hidden="true">←</span> Барча мавзулар</button><div class="page-heading subject-heading"><p class="eyebrow">Тўпламда ${subject.count} та савол</p><h1 tabindex="-1">${subject.title}</h1><p class="intro">${subject.description}</p></div>
    <form id="start-form"><fieldset class="mode-field"><legend>Қандай машқ қилмоқчисиз?</legend><div class="mode-options">${options.join('')}</div></fieldset>${keywordSwitch()}<p class="study-note">${note}</p><div class="start-bar"><p class="test-info">Ўтиш учун ${count} та саволдан ${Math.ceil(count * .8)} тасига тўғри жавоб беринг.<br>Вақт чекланмаган. Сақлаб, исталган пайт давом этинг.</p><button type="submit" class="primary">Машқни бошлаш ${arrow}</button></div></form>${sourceNotes(subject)}`;
}
function questionNotes(question) {
  const notes = QUESTION_NOTES[question.id] || {};
  return [notes.editionNote, notes.explanation, notes.correctionNote ? `Жавоб калитига тузатиш: ${notes.correctionNote}` : null, notes.contentNote ? `Саволга тузатиш: ${notes.contentNote}` : null].filter(Boolean);
}
function questionPrompt(question) {
  return `${highlightKeyword(question.question, KEYWORDS[question.id]?.[0], keywordHints)} <span class="question-translation" lang="uz-Cyrl">${escape(question.questionUz)}</span>`;
}
function answerText(session, question, index) {
  return highlightKeyword(getChoiceText(session, question, index), KEYWORDS[question.id]?.[1], keywordHints && index === question.answer);
}
function wordingComparison(session, question) {
  if (session.mode !== 'wording') return '';
  const groups = subjectFor(session).wordingGroups.filter(group => group.matches.some(match => match.id === question.id));
  if (!groups.length) return '';
  return `<details class="wording-comparison"><summary>Ўхшаш саволларни солиштириш</summary><p class="wording-intro">Ажратилган инглизча сўзларни солиштиринг. Саволни тўлиқ ўқинг: кичик фарқ ҳам тўғри жавобни ўзгартириши мумкин.</p>${groups.map(group => `<section class="wording-group"><h3>${group.type === 'answers' ? 'Ўхшаш жавоб — ҳар бир саволда бошқача натижа' : 'Саволлардаги ўхшаш сўзлар'}</h3><div class="wording-cards">${group.matches.map(match => {
    const related = QUESTION_MAP[match.id];
    return `<article class="wording-card" data-question-id="${escape(related.id)}"><p class="reference">${related.number}-савол${related.id === question.id ? ' · Ҳозирги савол' : ''}</p><p class="wording-prompt" lang="en">${highlightKeyword(related.question, match.phrase, group.type === 'questions')}</p><p class="wording-translation" lang="uz-Cyrl">${escape(related.questionUz)}</p><ul class="wording-choices">${getChoiceOrder(session, related).map(index => {
      const correct = index === related.answer;
      const trap = group.type === 'answers' && index === match.choice && !correct;
      return `<li class="${correct ? 'wording-correct' : trap ? 'wording-trap' : ''}"><span class="wording-choice" lang="en">${getChoiceLetter(session, related, index)}. ${highlightKeyword(getChoiceText(session, related, index), match.phrase, group.type === 'answers' && index === match.choice)}</span>${correct || trap ? `<strong>${correct ? 'Тўғри жавоб' : 'Бу саволда нотўғри вариант'}</strong>` : ''}</li>`;
    }).join('')}</ul><p class="wording-translation" lang="uz-Cyrl">${escape(getCorrectAnswerUz(session, related))}</p></article>`;
  }).join('')}</div></section>`).join('')}</details>`;
}
function answerFeedback(session, question, answer) {
  const correct = answer === question.answer;
  const notes = questionNotes(question);
  const translation = correct
    ? `<p id="feedback-translation" lang="uz-Cyrl">${escape(getCorrectAnswerUz(session, question))}</p>`
    : '';
  const description = correct ? 'feedback-answer feedback-translation' : 'feedback-answer';
  return `<section id="answer-feedback" class="answer-feedback ${correct ? 'feedback-correct' : 'feedback-incorrect'}" tabindex="-1" aria-labelledby="feedback-title" aria-describedby="${description}">
    <div class="feedback-heading"><span class="feedback-icon" aria-hidden="true">${correct ? '✓' : '×'}</span><h2 id="feedback-title">${correct ? 'Тўғри' : 'Нотўғри'}</h2></div>
    <p class="feedback-label">${correct ? 'Тўғри жавоб' : 'Тўғри жавобни эслаб қолинг:'}</p>
    <p id="feedback-answer" lang="en"><span>${getChoiceLetter(session, question, question.answer)}.</span> ${answerText(session, question, question.answer)}</p>
    ${translation}${notes.length ? `<div class="feedback-notes">${notes.map(note => `<p>${escape(note)}</p>`).join('')}${referenceLinks(question)}</div>` : ''}</section>${wordingComparison(session, question)}`;
}
function testScreen(session) {
  const subject = subjectFor(session);
  const id = session.feedbackId || session.pending[0];
  const question = QUESTION_MAP[id];
  const answered = session.feedbackId === id;
  const answer = session.answers[id];
  const number = session.ids.indexOf(id) + 1;
  const score = scoreSession(session, QUESTION_MAP);
  const unknownCount = session.unknownIds?.length || 0;
  const reviewed = score.answered + unknownCount;
  return `<div class="test-heading"><p class="eyebrow">${subject.title}</p><span>${modeFor(session)}</span></div>${keywordSwitch()}<div class="question-count"><span>Савол <strong>${number}</strong> / ${score.total}</span><span>${canMarkUnknown(session) ? `Кўриб чиқилди: ${reviewed} · Билмайман: ${unknownCount}` : `Жавоблар: ${score.answered}`}</span></div><progress max="${score.total}" value="${reviewed}" aria-label="Кўриб чиқилган саволлар"></progress>
    <form id="answer-form"><fieldset><legend><h1 tabindex="-1" lang="en">${questionPrompt(question)}</h1></legend>${question.image ? `<img class="question-image" src="${escape(question.image)}" alt="${escape(question.imageAlt || 'Саволга оид расм')}">` : ''}<div class="answers">${getChoiceOrder(session, question).map((index, position) => {
      const correct = answered && index === question.answer;
      const incorrect = answered && index === answer && !correct;
      return `<button type="button" class="answer${correct ? ' answer-correct' : ''}${incorrect ? ' answer-incorrect' : ''}" data-action="answer" data-choice="${index}" ${answered ? 'disabled' : ''}><span class="choice-letter" aria-hidden="true">${letter(position)}</span><span class="choice-copy"><span lang="en">${answerText(session, question, index)}</span>${keywordHints && index === question.answer && !answered ? '<span class="sr-only">Таянч сўзли тўғри жавоб</span>' : ''}${correct || incorrect ? `<span class="answer-label">${correct ? `${answer === index ? '✓ Жавобингиз · Тўғри' : '✓ Тўғри жавоб'}` : '× Жавобингиз · Нотўғри'}</span>` : ''}</span></button>`;
    }).join('')}</div></fieldset>${answered ? answerFeedback(session, question, answer) : '<p class="answer-hint">Жавобни танланг — натижа дарҳол кўринади.</p>'}<div class="test-actions">${answered ? '<span class="continue-hint">Шошилманг. Тайёр бўлсангиз, давом этинг.</span>' : `<div class="question-tools">${canMarkUnknown(session) ? '<button type="button" class="secondary" data-action="unknown">Билмайман</button>' : ''}<button type="button" class="text-button" data-action="skip" ${session.pending.length < 2 ? 'disabled' : ''}>Ҳозирча ўтказиш</button></div>`}<button type="submit" class="primary" id="next-answer" ${answered ? '' : 'disabled'}>${answered && session.pending.length === 0 ? 'Натижалар' : 'Кейинги савол'} ${arrow}</button></div></form>
    <div class="question-footer"><span>Манбадаги савол: ${question.number}</span><button class="text-button" data-action="finish">Тестни якунлаш</button></div>`;
}
function reviewQuestion(session, id) {
  const question = QUESTION_MAP[id];
  const answer = session.answers[id];
  const isCorrect = answer === question.answer;
  const unknown = session.unknownIds?.includes(id);
  const translation = isCorrect || unknown
    ? `<dd class="answer-translation" lang="uz-Cyrl">${escape(getCorrectAnswerUz(session, question))}</dd>`
    : '';
  const notes = questionNotes(question);
  return `<article class="review-question"><p class="reference">${question.number}-савол <span>${isCorrect ? 'Тўғри' : unknown ? 'Билмайман' : answer === undefined ? 'Жавоб берилмаган' : 'Нотўғри'}</span></p><h3 lang="en">${questionPrompt(question)}</h3><dl>${!isCorrect ? `<div><dt>Жавобингиз</dt><dd ${answer === undefined ? '' : 'lang="en"'}>${unknown ? 'Билмайман деб белгиланган' : answer === undefined ? 'Жавоб берилмаган' : `${getChoiceLetter(session, question, answer)}. ${escape(getChoiceText(session, question, answer))}`}</dd></div>` : ''}<div class="correct-answer"><dt>Тўғри жавоб</dt><dd lang="en">${getChoiceLetter(session, question, question.answer)}. ${answerText(session, question, question.answer)}</dd>${translation}</div></dl>${notes.length ? `<div class="correction">${notes.map(note => `<p>${escape(note)}</p>`).join('')}${referenceLinks(question)}</div>` : ''}${wordingComparison(session, question)}</article>`;
}
function resultActions(session) {
  const subject = subjectFor(session);
  if (session.mode === 'unknown-practice') {
    return `<button class="primary" data-action="repeat-unknown">Шу тўпламни такрорлаш (${session.ids.length}) ${arrow}</button>`;
  }
  if (session.mode !== 'sets' || !subject.setSize) {
    return `<button class="primary" data-action="practice-again">Қайта машқ қилиш ${arrow}</button>`;
  }
  const currentIds = state.generalPracticeProgress?.previousIds;
  const isCurrent = !currentIds || samePracticeSet(currentIds, session.ids);
  const addCount = Math.min(subject.setSize, subject.count - session.ids.length);
  let continueButton = '';
  if (!isCurrent) {
    continueButton = `<button class="secondary" data-action="current-set">Жорий тўпламга қайтиш ${arrow}</button>`;
  } else if (addCount > 0) {
    continueButton = `<button class="secondary" data-action="next-set">${addCount} та савол қўшиш (жами ${session.ids.length + addCount}) ${arrow}</button>`;
  }
  return `<button class="primary" data-action="retry-set">Шу тўпламни такрорлаш</button>${continueButton}`;
}
function resultScreen() {
  const session = resultFor(resultId);
  if (!session) return `<h1 tabindex="-1">Натижа топилмади</h1><p>Бу натижа браузерда сақланмаган.</p><button class="primary" data-action="home">Барча мавзулар</button>`;
  const score = scoreSession(session, QUESTION_MAP);
  const missed = missedQuestionIds(session, QUESTION_MAP);
  const retryLink = missed.length && session.mode !== 'unknown-practice'
    ? `<a class="secondary" href="#retry/${missed.map(encodeURIComponent).join(',')}" target="_blank" rel="noopener">Хато қилинган саволларни қайта ечиш (${missed.length}) <span aria-hidden="true">↗</span><span class="sr-only">Янги варақда очилади</span></a>`
    : '';
  const unknownIds = session.unknownIds || [];
  const unknownLink = session.mode === 'all' && session.testId === 'general-knowledge' && unknownIds.length
    ? `<a class="primary unknown-practice-link" href="#unknown/${unknownIds.map(encodeURIComponent).join(',')}" target="_blank" rel="noopener">Билмаган саволларимни машқ қилиш (${unknownIds.length}) <span aria-hidden="true">↗</span><span class="sr-only">Янги варақда очилади</span></a>`
    : '';
  const unknownNote = session.mode === 'unknown-practice'
    ? `<p class="study-note">Тўпламдаги ${session.ids.length} та савол сақланади. Тўғри жавоб берилган саволлар ҳам олиб ташланмайди. Ҳар бир такрорлашда саволлар ва жавоб вариантлари аралаштирилади.</p>`
    : unknownLink ? `<p class="study-note">«Билмайман» деб белгиланган ${unknownIds.length} та саволни янги варақда машқ қилинг. Шу тўпламни хоҳлаганча қайта ечишингиз мумкин.</p>` : '';
  const ids = showAll ? session.ids : missed;
  return `<p class="eyebrow">${escape(sessionLabel(session))}</p><div class="result-top"><div><h1 tabindex="-1">${score.passed ? 'Тестдан ўтдингиз.' : 'Яна машқ қилинг.'}</h1><p class="result-description">Ўтиш учун ${score.required} та тўғри жавоб керак.${unknownIds.length ? ` ${unknownIds.length} та савол «Билмайман» деб белгиланган.` : ''}${score.unanswered > unknownIds.length ? ` ${score.unanswered - unknownIds.length} та саволга жавоб берилмаган.` : ''}</p></div><div class="score"><strong>${score.correct}<span> / ${score.total}</span></strong><p>${score.percent}% тўғри</p></div></div>${unknownNote}<div class="result-actions">${unknownLink}${retryLink}${resultActions(session)}<button class="secondary" data-action="home">Барча мавзулар</button></div>
    <section class="review">${keywordSwitch()}<div class="review-header"><h2>${showAll ? 'Барча жавоблар' : `Хатоларни кўриб чиқиш (${missed.length})`}</h2><label class="show-all"><input type="checkbox" id="show-all" ${showAll ? 'checked' : ''}> Барчаси</label></div>${!ids.length ? '<p class="empty-review">Барча саволларга тўғри жавоб бердингиз.</p>' : ids.map(id => reviewQuestion(session, id)).join('')}</section>`;
}
function render() {
  const test = testSession();
  if ((view === 'test' || view === 'retry') && !test) view = 'home';
  const subject = view === 'subject' ? SUBJECT_MAP[subjectId] : test ? subjectFor(test) : view === 'result' ? subjectFor(resultFor(resultId) || {}) : null;
  app.innerHTML = `<header class="header"><a class="site-title" href="#home" data-action="home"><span class="wordmark">CDL</span><span>Машқ</span></a>${test ? '<button class="text-button" data-action="exit">Сақлаш ва чиқиш</button>' : '<span class="header-location">Миссури</span>'}</header><main id="main" class="${test ? 'test-main' : view === 'result' ? 'result-main' : ''}" tabindex="-1"><p id="storage-warning" class="storage-warning" role="status" ${(saveFailed || retrySaveFailed) ? '' : 'hidden'}>Натижаларни сақлаб бўлмади. Тестни тугатгунча бу саҳифани ёпманг.</p>${test ? testScreen(test) : view === 'result' ? resultScreen() : view === 'subject' ? subjectScreen() : home()}</main><footer class="footer"><span>Миссури CDL машқлари</span>${subject ? `<a href="${subject.sourceUrl}" download>Асл ҳужжат</a>` : '<span>Ўтиш учун 80% тўғри жавоб</span>'}</footer>`;
  document.title = `${subject?.title || 'Миссури'} — CDL машқлари`;
}
function start(setOptions = {}) {
  const subject = SUBJECT_MAP[subjectId];
  const settings = { sourceId: SOURCE.id, testId: subject.id };
  if (subject.setSize && mode === 'sets') {
    const progress = state.generalPracticeProgress;
    let previousAttempt = setOptions.previousAttempt;
    if (progress && !previousAttempt && !setOptions.advance) {
      previousAttempt = [state.active, ...state.results].find(session =>
        session?.mode === 'sets' && session.testId === subject.id && samePracticeSet(session.ids, progress.previousIds));
    }
    const attempt = createPracticeSetSession(subject.questions, { ...settings, count: subject.setSize }, progress, { ...setOptions, previousAttempt });
    state.active = attempt.session;
    state.generalPracticeProgress = attempt.progress;
  } else {
    let questions = mode === 'numbers' ? subject.numberQuestions : mode === 'mph' ? subject.mphQuestions : mode === 'new' ? subject.newQuestions : mode === 'wording' ? subject.wordingQuestions : subject.questions;
    const count = ['all', 'numbers', 'mph', 'new', 'wording'].includes(mode) ? questions.length : subject.practiceCount;
    const previousAttempt = mode === 'wording' ? [state.active, ...state.results].find(session => session?.mode === mode && session.testId === subject.id) : undefined;
    if (mode === 'wording') questions = shuffle(questions.map(question => question.id), Math.random, previousAttempt?.ids).map(id => QUESTION_MAP[id]);
    state.active = createSession(questions, { ...settings, count, randomize: mode !== 'wording', previousAttempt });
    state.active.mode = mode;
  }
  save(); navigate('test');
}
function requestStart(setOptions) {
  if (state.active) {
    pendingStart = setOptions;
    openDialog('Янги тестни бошлайсизми?', `«${escape(subjectFor(state.active)?.title)}» бўйича тугалланмаган тест ўрнига янги тест бошланади.`, 'start-confirm', 'Янги тест');
    return;
  }
  start(setOptions);
}
function finish(session) {
  if (view === 'retry') {
    storeRetry(session);
  } else {
    state.results = [session, ...state.results.filter(item => item.id !== session.id)].slice(0, 20);
    state.active = null;
    save();
  }
  resultId = session.id; showAll = false;
  navigate('result');
}
function openDialog(title, message, action, confirmText) {
  returnFocus = document.activeElement;
  dialog.innerHTML = `<h2 id="dialog-title">${title}</h2><p>${message}</p><div class="dialog-actions"><button class="secondary" data-action="cancel">Бекор қилиш</button><button class="primary" data-action="${action}">${confirmText}</button></div>`;
  dialog.showModal();
}
function closeDialog() { pendingStart = undefined; dialog.close(); returnFocus?.focus(); }

document.addEventListener('submit', event => {
  if (!['start-form', 'answer-form'].includes(event.target.id)) return;
  event.preventDefault();
  if (event.target.id === 'start-form') {
    requestStart();
    return;
  }
  const session = testSession();
  if (!session?.feedbackId) return;
  const next = advanceQuestion(session);
  if (next.finishedAt !== null) finish(next);
  else { saveTest(next); render(); window.scrollTo(0, 0); focusHeading(); announce(''); }
});
document.addEventListener('change', event => {
  if (event.target.id === 'keyword-hints') {
    keywordHints = event.target.checked;
    const saved = saveKeywordHints(keywordHints);
    render();
    document.querySelector('#keyword-hints')?.focus({ preventScroll: true });
    announce(saved ? '' : 'Таянч сўзлар созламасини сақлаб бўлмади. У ҳозирги саҳифада амал қилади.');
  }
  if (event.target.name === 'test-mode') {
    mode = event.target.value; render(); document.querySelector(`input[name="test-mode"][value="${mode}"]`).focus();
  }
  if (event.target.id === 'show-all') { showAll = event.target.checked; render(); document.querySelector('#show-all').focus({ preventScroll: true }); }
});
document.addEventListener('click', event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); document.querySelector('#main').focus(); return; }
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  event.preventDefault();
  const session = testSession();
  switch (button.dataset.action) {
    case 'home':
    case 'exit':
      if (retrySaveFailed && !failedRetryIds.size) persistRetry(retry);
      for (const id of [...failedRetryIds]) persistRetry(retrySessions.get(id));
      if (saveFailed) save();
      navigate('home'); break;
    case 'subject': if (SUBJECT_MAP[button.dataset.id]) { subjectId = button.dataset.id; mode = 'practice'; navigate('subject'); } break;
    case 'retry-set':
    case 'next-set':
    case 'current-set': {
      const result = resultFor(resultId);
      if (result?.mode !== 'sets' || !subjectFor(result).setSize) break;
      subjectId = result.testId; mode = 'sets';
      if (button.dataset.action === 'retry-set') requestStart({ previousAttempt: result });
      else if (button.dataset.action === 'next-set') requestStart({ advance: true, previousAttempt: result });
      else requestStart();
      break;
    }
    case 'practice-again': {
      const result = resultFor(resultId);
      subjectId = result.testId;
      mode = ['numbers', 'mph', 'new', 'wording'].includes(result.mode) ? result.mode : 'practice';
      navigate('subject'); break;
    }
    case 'resume-retry': navigate('retry'); break;
    case 'resume': navigate('test'); break;
    case 'repeat-unknown': {
      const result = resultFor(resultId);
      if (result?.mode !== 'unknown-practice') break;
      const next = createUnknownSession(result.ids, QUESTION_MAP, SOURCE.id, result);
      if (next) { storeRetry(next); navigate('retry'); }
      break;
    }
    case 'unknown': {
      if (!session || !canMarkUnknown(session) || session.feedbackId) break;
      const next = markUnknown(session, QUESTION_MAP);
      if (next.finishedAt !== null) finish(next);
      else { saveTest(next); render(); window.scrollTo(0, 0); focusHeading(); announce('Савол «Билмайман» рўйхатига қўшилди.'); }
      break;
    }
    case 'answer': {
      if (!session || session.feedbackId) break;
      saveTest(submitAnswer(session, Number(button.dataset.choice), QUESTION_MAP));
      render();
      const feedback = document.querySelector('#answer-feedback');
      feedback.focus({ preventScroll: true });
      feedback.scrollIntoView({ block: 'nearest' });
      break;
    }
    case 'skip': saveTest(skipQuestion(session)); render(); focusHeading(); announce('Савол ўтказиб юборилди. У тест охирида яна кўрсатилади.'); break;
    case 'finish': openDialog('Тестни якунлайсизми?', session.pending.length ? `Жавоб берилмаган ${session.pending.length} та савол нотўғри деб ҳисобланади.` : 'Барча жавоблар сақланган. Натижаларни кўришингиз мумкин.', 'finish-confirm', 'Якунлаш'); break;
    case 'finish-confirm': closeDialog(); finish(finishSession(session)); break;
    case 'start-confirm': {
      const setOptions = pendingStart;
      closeDialog(); start(setOptions); break;
    }
    case 'cancel': closeDialog(); break;
    case 'result': resultId = button.dataset.id; showAll = false; navigate('result'); break;
    case 'clear': openDialog('Сақланган натижалар ўчирилсинми?', 'Тугалланмаган тест ва аввалги натижалар шу браузердан ўчирилади.', 'clear-confirm', 'Ўчириш'); break;
    case 'clear-confirm': closeDialog(); state = emptyState(); storeRetry(null); clearState(); save(); navigate('home'); break;
  }
});
document.addEventListener('keydown', event => {
  if (!testSession() || dialog.open || event.ctrlKey || event.metaKey || event.altKey) return;
  if (/^[1-9]$/.test(event.key)) {
    const answer = document.querySelectorAll('[data-action="answer"]')[Number(event.key) - 1];
    if (answer && !answer.disabled && !event.repeat) { event.preventDefault(); answer.click(); }
  } else if (event.key === 'Enter' && event.target.id === 'answer-feedback' && !event.repeat) {
    event.preventDefault(); document.querySelector('#answer-form').requestSubmit();
  }
});
function restoreRoute() {
  if (dialog.open) closeDialog();
  const hash = location.hash.slice(1);
  if (hash === 'retry' || hash.startsWith('retry/session/')) {
    const id = hash === 'retry' ? undefined : hash.slice(14);
    const session = id === undefined ? retry : retryFor(id);
    if (session) {
      retry = session;
      resultId = session.finishedAt !== null ? session.id : null;
      view = resultId ? 'result' : 'retry';
      history.replaceState(null, '', `#${resultId ? `result/${resultId}` : `retry/session/${session.id}`}`);
    } else view = 'home';
  } else if (hash.startsWith('unknown/')) {
    const session = createUnknownSession(hash.slice(8).split(','), QUESTION_MAP, SOURCE.id);
    view = session ? 'retry' : 'home';
    if (session) storeRetry(session);
    history.replaceState(null, '', session ? `#retry/session/${session.id}` : '#home');
  } else if (hash.startsWith('retry/')) {
    const session = createMissedSession(hash.slice(6).split(','), QUESTION_MAP, SOURCE.id);
    view = session ? 'retry' : 'home';
    if (session) storeRetry(session);
    history.replaceState(null, '', session ? `#retry/session/${session.id}` : '#home');
  } else if (hash.startsWith('result/')) { resultId = hash.slice(7); view = 'result'; }
  else if (hash.startsWith('subject/') && SUBJECT_MAP[hash.slice(8)]) {
    if (subjectId !== hash.slice(8)) mode = 'practice';
    subjectId = hash.slice(8); view = 'subject';
  } else view = hash === 'test' && state.active ? 'test' : 'home';
  render();
}
window.addEventListener('popstate', restoreRoute);
window.addEventListener('storage', event => {
  if (event.storageArea !== localStorage) return;
  if (event.key === null || event.key === KEYWORD_HINTS_KEY) {
    const focusId = document.activeElement?.id;
    keywordHints = readKeywordHints();
    render();
    if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
    if (event.key === KEYWORD_HINTS_KEY) return;
  }
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  state = readState(QUESTION_MAP, SOURCE.id);
  if (view === 'retry' || (view === 'result' && resultId === retry?.id)) return;
  saveFailed = false;
  if (dialog.open) closeDialog();
  render();
});
restoreRoute();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
