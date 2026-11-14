import { SOURCE, QUESTIONS, QUESTION_MAP, SUBJECTS, SUBJECT_MAP } from './data/index.js';
import { QUESTION_NOTES, EXCLUDED_NOTES } from './data/interface-uz.js';
import { createSession, submitAnswer, advanceQuestion, skipQuestion, finishSession, scoreSession } from './engine.js';
import { readState, saveState, clearState, emptyState } from './storage.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const letter = index => String.fromCharCode(65 + index);
const date = time => new Intl.DateTimeFormat('uz-Cyrl-UZ', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(time);
const arrow = '<span aria-hidden="true">→</span>';
let state = readState(QUESTION_MAP, SOURCE.id);
let view = 'home';
let subjectId = SUBJECTS[0].id;
let mode = 'practice';
let resultId = null;
let showAll = false;
let saveFailed = false;
let returnFocus;

function save() {
  saveFailed = !saveState(state);
  const warning = document.querySelector('#storage-warning');
  if (warning) warning.hidden = !saveFailed;
}
function focusHeading() { document.querySelector('h1')?.focus({ preventScroll: true }); }
function navigate(next) {
  view = next;
  const hash = next === 'result' ? `result/${resultId}` : next === 'subject' ? `subject/${subjectId}` : next;
  history.pushState(null, '', `#${hash}`);
  render();
  window.scrollTo(0, 0);
  focusHeading();
  announce('');
}
function announce(message) { document.querySelector('#status').textContent = message; }
function subjectFor(session) { return SUBJECT_MAP[session.testId]; }
function modeFor(session) { return session.mode === 'all' || (!session.mode && session.ids.length === subjectFor(session)?.count) ? 'Барча саволлар' : 'Машқ тести'; }
function resultFor(id) { return state.results.find(result => result.id === id); }
function sessionLabel(session) { return `${subjectFor(session)?.title || 'Машқ'} · ${modeFor(session)}`; }
function sourceNotes(subject) {
  const corrections = subject.questions.filter(q => q.answer !== q.sourceAnswer);
  return `<details class="source-details"><summary>Саволлар ҳақида</summary><div><p>Саволлар ва жавоб вариантлари сиз юклаган ҳужжатдан олинган. Инглизча матн ва вариантлар тартиби ўзгармаган.</p>${subject.excluded.length ? `<p>Қуйидаги саволлар баҳоланадиган тестларга киритилмаган:</p><ul>${subject.excluded.map(q => `<li>${escape(q.number)}-савол: ${escape(EXCLUDED_NOTES[`${subject.id}:${q.number}`])}</li>`).join('')}</ul>` : ''}${corrections.length ? `<p>${corrections.length} та жавоб калити Миссури CDL қўлланмаси асосида тузатилган. Ҳар бир тузатиш жавобни кўриб чиқишда тушунтирилади.</p><ul>${corrections.map(q => `<li>${q.number}-савол: ${escape(QUESTION_NOTES[q.id]?.correctionNote)}${q.referenceUrl ? ` <a href="${escape(q.referenceUrl)}" target="_blank" rel="noopener">Манба</a>` : ''}</li>`).join('')}</ul>` : ''}<p><a href="${subject.sourceUrl}" download>Асл ҳужжатни юклаб олиш</a></p></div></details>`;
}
function recentResults() {
  if (!state.results.length) return '';
  return `<details class="recent-results"><summary>Аввалги натижалар <span>${state.results.length}</span></summary><ul>${state.results.map(session => {
    const score = scoreSession(session, QUESTION_MAP);
    return `<li><button class="result-link" data-action="result" data-id="${session.id}"><span>${escape(subjectFor(session)?.title)}<small>${date(session.finishedAt)} · ${modeFor(session)}</small></span><span>${score.correct} / ${score.total}<small>${score.passed ? 'Ўтди' : 'Ўтмади'}</small></span></button></li>`;
  }).join('')}</ul><button class="text-button" data-action="clear">Сақланган натижаларни ўчириш</button></details>`;
}
function home() {
  const active = state.active;
  return `<div class="page-heading"><p class="eyebrow">Назарий имтиҳонга тайёргарлик</p><h1 tabindex="-1">CDL назарий тестлари</h1><p class="intro">Ҳар бир саволни ечинг ва тўғри жавобни эслаб қолинг.</p></div>
    ${active ? `<section class="resume" aria-label="Тугалланмаган тест"><div><p class="eyebrow">Қолган жойингиздан давом этинг</p><h2>${escape(subjectFor(active)?.title)}</h2><p>${active.ids.length} та саволдан ${scoreSession(active, QUESTION_MAP).answered} тасига жавоб берилган</p></div><button class="primary" data-action="resume">Давом этиш ${arrow}</button></section>` : ''}
    <section class="subject-list" aria-label="Мавзуни танланг">${SUBJECTS.map((subject, index) => `<button class="subject-row" data-action="subject" data-id="${subject.id}"><span class="subject-number" aria-hidden="true">0${index + 1}</span><span class="subject-copy"><span class="subject-title">${subject.title}</span><span class="subject-description">${subject.description}</span></span><span class="subject-count">${subject.count} та савол</span><span class="subject-arrow" aria-hidden="true">↗</span></button>`).join('')}</section>
    <p class="library-note">Натижалар шу қурилмада сақланади.</p>${recentResults()}`;
}
function subjectScreen() {
  const subject = SUBJECT_MAP[subjectId];
  const count = mode === 'all' ? subject.count : Math.min(subject.practiceCount, subject.count);
  return `<button class="back-link" data-action="home"><span aria-hidden="true">←</span> Барча мавзулар</button><div class="page-heading subject-heading"><p class="eyebrow">Тўпламда ${subject.count} та савол</p><h1 tabindex="-1">${subject.title}</h1><p class="intro">${subject.description}</p></div>
    <form id="start-form"><fieldset class="mode-field"><legend>Қандай машқ қилмоқчисиз?</legend><div class="mode-options"><label class="mode-option"><input type="radio" name="test-mode" value="practice" ${mode === 'practice' ? 'checked' : ''}><span><strong>Машқ тести</strong><span>${Math.min(subject.practiceCount, subject.count)} та савол · Тасодифий танлов</span></span></label><label class="mode-option"><input type="radio" name="test-mode" value="all" ${mode === 'all' ? 'checked' : ''}><span><strong>Барча саволлар</strong><span>${subject.count} та савол · Ҳужжатдаги тартибда</span></span></label></div></fieldset><p class="study-note">Жавобни танласангиз, натижа дарҳол кўринади. Тўғри жавобни эслаб қолинг, кейин давом этинг.</p><div class="start-bar"><p class="test-info">Ўтиш учун ${count} та саволдан ${Math.ceil(count * .8)} тасига тўғри жавоб беринг.<br>Вақт чекланмаган. Сақлаб, исталган пайт давом этинг.</p><button type="submit" class="primary">Машқни бошлаш ${arrow}</button></div></form>${sourceNotes(subject)}`;
}
function questionNotes(question) {
  const notes = QUESTION_NOTES[question.id] || {};
  return [notes.editionNote, notes.explanation, notes.correctionNote ? `Жавоб калитига тузатиш: ${notes.correctionNote}` : null].filter(Boolean);
}
function answerFeedback(question, answer) {
  const correct = answer === question.answer;
  const notes = questionNotes(question);
  return `<section id="answer-feedback" class="answer-feedback ${correct ? 'feedback-correct' : 'feedback-incorrect'}" tabindex="-1" aria-labelledby="feedback-title" aria-describedby="feedback-answer"><div class="feedback-heading"><span class="feedback-icon" aria-hidden="true">${correct ? '✓' : '×'}</span><h2 id="feedback-title">${correct ? 'Тўғри' : 'Нотўғри'}</h2></div><p class="feedback-label">${correct ? 'Тўғри жавоб бердингиз.' : 'Тўғри жавобни эслаб қолинг:'}</p><p id="feedback-answer" lang="en"><span>${letter(question.answer)}.</span> ${escape(question.choices[question.answer])}</p>${notes.length ? `<div class="feedback-notes">${notes.map(note => `<p>${escape(note)}</p>`).join('')}${question.referenceUrl ? `<a href="${escape(question.referenceUrl)}" target="_blank" rel="noopener">Миссури қўлланмаси</a>` : ''}</div>` : ''}</section>`;
}
function testScreen() {
  const session = state.active;
  const subject = subjectFor(session);
  const id = session.feedbackId || session.pending[0];
  const question = QUESTION_MAP[id];
  const answered = session.feedbackId === id;
  const answer = session.answers[id];
  const number = session.ids.indexOf(id) + 1;
  const score = scoreSession(session, QUESTION_MAP);
  return `<div class="test-heading"><p class="eyebrow">${subject.title}</p><span>${modeFor(session)}</span></div><div class="question-count"><span>Савол <strong>${number}</strong> / ${score.total}</span><span>Жавоблар: ${score.answered}</span></div><progress max="${score.total}" value="${score.answered}" aria-label="Жавоб берилган саволлар"></progress>
    <form id="answer-form"><fieldset><legend><h1 tabindex="-1" lang="en">${escape(question.question)}</h1></legend>${question.image ? `<img class="question-image" src="${escape(question.image)}" alt="${escape(question.imageAlt || 'Саволга оид расм')}">` : ''}<div class="answers">${question.choices.map((choice, index) => {
      const correct = answered && index === question.answer;
      const incorrect = answered && index === answer && !correct;
      return `<button type="button" class="answer${correct ? ' answer-correct' : ''}${incorrect ? ' answer-incorrect' : ''}" data-action="answer" data-choice="${index}" ${answered ? 'disabled' : ''}><span class="choice-letter" aria-hidden="true">${letter(index)}</span><span class="choice-copy"><span lang="en">${escape(choice)}</span>${correct || incorrect ? `<span class="answer-label">${correct ? `${answer === index ? '✓ Жавобингиз · Тўғри' : '✓ Тўғри жавоб'}` : '× Жавобингиз · Нотўғри'}</span>` : ''}</span></button>`;
    }).join('')}</div></fieldset>${answered ? answerFeedback(question, answer) : '<p class="answer-hint">Жавобни танланг — натижа дарҳол кўринади.</p>'}<div class="test-actions">${answered ? '<span class="continue-hint">Шошилманг. Тайёр бўлсангиз, давом этинг.</span>' : `<button type="button" class="text-button" data-action="skip" ${session.pending.length < 2 ? 'disabled' : ''}>Ҳозирча ўтказиш</button>`}<button type="submit" class="primary" id="next-answer" ${answered ? '' : 'disabled'}>${answered && session.pending.length === 0 ? 'Натижалар' : 'Кейинги савол'} ${arrow}</button></div></form>
    <div class="question-footer"><span>Манбадаги савол: ${question.number}</span><button class="text-button" data-action="finish">Тестни якунлаш</button></div>`;
}
function reviewQuestion(session, id) {
  const question = QUESTION_MAP[id];
  const answer = session.answers[id];
  const isCorrect = answer === question.answer;
  const notes = questionNotes(question);
  return `<article class="review-question"><p class="reference">${question.number}-савол <span>${isCorrect ? 'Тўғри' : answer === undefined ? 'Жавоб берилмаган' : 'Нотўғри'}</span></p><h3 lang="en">${escape(question.question)}</h3><dl>${!isCorrect ? `<div><dt>Жавобингиз</dt><dd ${answer === undefined ? '' : 'lang="en"'}>${answer === undefined ? 'Жавоб берилмаган' : `${letter(answer)}. ${escape(question.choices[answer])}`}</dd></div>` : ''}<div class="correct-answer"><dt>Тўғри жавоб</dt><dd lang="en">${letter(question.answer)}. ${escape(question.choices[question.answer])}</dd></div></dl>${notes.length ? `<div class="correction">${notes.map(note => `<p>${escape(note)}</p>`).join('')}${question.referenceUrl ? `<a href="${escape(question.referenceUrl)}" target="_blank" rel="noopener">Миссури қўлланмаси</a>` : ''}</div>` : ''}</article>`;
}
function resultScreen() {
  const session = resultFor(resultId);
  if (!session) return `<h1 tabindex="-1">Натижа топилмади</h1><p>Бу натижа браузерда сақланмаган.</p><button class="primary" data-action="home">Барча мавзулар</button>`;
  const score = scoreSession(session, QUESTION_MAP);
  const missed = session.ids.filter(id => session.answers[id] !== QUESTION_MAP[id].answer);
  const ids = showAll ? session.ids : missed;
  return `<p class="eyebrow">${escape(sessionLabel(session))}</p><div class="result-top"><div><h1 tabindex="-1">${score.passed ? 'Тестдан ўтдингиз.' : 'Яна машқ қилинг.'}</h1><p class="result-description">Ўтиш учун ${score.required} та тўғри жавоб керак.${score.unanswered ? ` ${score.unanswered} та саволга жавоб берилмаган.` : ''}</p></div><div class="score"><strong>${score.correct}<span> / ${score.total}</span></strong><p>${score.percent}% тўғри</p></div></div><div class="result-actions"><button class="primary" data-action="practice-again">Қайта машқ қилиш ${arrow}</button><button class="secondary" data-action="home">Барча мавзулар</button></div>
    <section class="review"><div class="review-header"><h2>${showAll ? 'Барча жавоблар' : `Хатоларни кўриб чиқиш (${missed.length})`}</h2><label class="show-all"><input type="checkbox" id="show-all" ${showAll ? 'checked' : ''}> Барчаси</label></div>${!ids.length ? '<p class="empty-review">Барча саволларга тўғри жавоб бердингиз.</p>' : ids.map(id => reviewQuestion(session, id)).join('')}</section>`;
}
function render() {
  if (view === 'test' && !state.active) view = 'home';
  const subject = view === 'subject' ? SUBJECT_MAP[subjectId] : view === 'test' ? subjectFor(state.active) : view === 'result' ? subjectFor(resultFor(resultId) || {}) : null;
  app.innerHTML = `<header class="header"><a class="site-title" href="#home" data-action="home"><span class="wordmark">CDL</span><span>Машқ</span></a>${view === 'test' ? '<button class="text-button" data-action="exit">Сақлаш ва чиқиш</button>' : '<span class="header-location">Миссури</span>'}</header><main id="main" class="${view === 'test' ? 'test-main' : view === 'result' ? 'result-main' : ''}" tabindex="-1"><p id="storage-warning" class="storage-warning" role="status" ${saveFailed ? '' : 'hidden'}>Натижаларни сақлаб бўлмади. Тестни тугатгунча бу саҳифани ёпманг.</p>${view === 'test' ? testScreen() : view === 'result' ? resultScreen() : view === 'subject' ? subjectScreen() : home()}</main><footer class="footer"><span>Миссури CDL машқлари</span>${subject ? `<a href="${subject.sourceUrl}" download>Асл ҳужжат</a>` : '<span>Ўтиш учун 80% тўғри жавоб</span>'}</footer>`;
  document.title = `${subject?.title || 'Миссури'} — CDL машқлари`;
}
function start() {
  const subject = SUBJECT_MAP[subjectId];
  state.active = createSession(QUESTIONS, { sourceId: SOURCE.id, testId: subject.id, count: mode === 'all' ? subject.count : subject.practiceCount, randomize: mode !== 'all' });
  state.active.mode = mode;
  save(); navigate('test');
}
function finish(session) {
  state.results = [session, ...state.results.filter(item => item.id !== session.id)].slice(0, 20);
  state.active = null; resultId = session.id; showAll = false;
  save(); navigate('result');
}
function openDialog(title, message, action, confirmText) {
  returnFocus = document.activeElement;
  dialog.innerHTML = `<h2 id="dialog-title">${title}</h2><p>${message}</p><div class="dialog-actions"><button class="secondary" data-action="cancel">Бекор қилиш</button><button class="primary" data-action="${action}">${confirmText}</button></div>`;
  dialog.showModal();
}
function closeDialog() { dialog.close(); returnFocus?.focus(); }

document.addEventListener('submit', event => {
  if (!['start-form', 'answer-form'].includes(event.target.id)) return;
  event.preventDefault();
  if (event.target.id === 'start-form') {
    if (state.active) openDialog('Янги тестни бошлайсизми?', `«${escape(subjectFor(state.active)?.title)}» бўйича тугалланмаган тест ўрнига янги тест бошланади.`, 'start-confirm', 'Янги тест');
    else start();
    return;
  }
  if (!state.active?.feedbackId) return;
  state.active = advanceQuestion(state.active);
  if (state.active.finishedAt) finish(state.active);
  else { save(); render(); window.scrollTo(0, 0); focusHeading(); announce(''); }
});
document.addEventListener('change', event => {
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
  switch (button.dataset.action) {
    case 'home': save(); navigate('home'); break;
    case 'subject': if (SUBJECT_MAP[button.dataset.id]) { subjectId = button.dataset.id; mode = 'practice'; navigate('subject'); } break;
    case 'practice-again': subjectId = resultFor(resultId).testId; mode = 'practice'; navigate('subject'); break;
    case 'resume': navigate('test'); break;
    case 'exit': save(); navigate('home'); break;
    case 'answer': {
      if (view !== 'test' || !state.active || state.active.feedbackId) break;
      state.active = submitAnswer(state.active, Number(button.dataset.choice), QUESTION_MAP);
      save(); render();
      const feedback = document.querySelector('#answer-feedback');
      feedback.focus({ preventScroll: true });
      feedback.scrollIntoView({ block: 'nearest' });
      break;
    }
    case 'skip': state.active = skipQuestion(state.active); save(); render(); focusHeading(); announce('Савол ўтказиб юборилди. У тест охирида яна кўрсатилади.'); break;
    case 'finish': openDialog('Тестни якунлайсизми?', state.active.pending.length ? `Жавоб берилмаган ${state.active.pending.length} та савол нотўғри деб ҳисобланади.` : 'Барча жавоблар сақланган. Натижаларни кўришингиз мумкин.', 'finish-confirm', 'Якунлаш'); break;
    case 'finish-confirm': closeDialog(); finish(finishSession(state.active)); break;
    case 'start-confirm': closeDialog(); start(); break;
    case 'cancel': closeDialog(); break;
    case 'result': resultId = button.dataset.id; showAll = false; navigate('result'); break;
    case 'clear': openDialog('Сақланган натижалар ўчирилсинми?', 'Тугалланмаган тест ва аввалги натижалар шу браузердан ўчирилади.', 'clear-confirm', 'Ўчириш'); break;
    case 'clear-confirm': closeDialog(); state = emptyState(); clearState(); save(); navigate('home'); break;
  }
});
document.addEventListener('keydown', event => {
  if (view !== 'test' || dialog.open || event.ctrlKey || event.metaKey || event.altKey) return;
  if (/^[1-9]$/.test(event.key)) {
    const answer = document.querySelector(`[data-action="answer"][data-choice="${Number(event.key) - 1}"]`);
    if (answer && !answer.disabled && !event.repeat) { event.preventDefault(); answer.click(); }
  } else if (event.key === 'Enter' && event.target.id === 'answer-feedback' && !event.repeat) {
    event.preventDefault(); document.querySelector('#answer-form').requestSubmit();
  }
});
function restoreRoute() {
  const hash = location.hash.slice(1);
  if (hash.startsWith('result/')) { resultId = hash.slice(7); view = 'result'; }
  else if (hash.startsWith('subject/') && SUBJECT_MAP[hash.slice(8)]) { subjectId = hash.slice(8); view = 'subject'; }
  else view = hash === 'test' && state.active ? 'test' : 'home';
  render();
}
window.addEventListener('popstate', restoreRoute);
window.addEventListener('pagehide', save);
restoreRoute();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
