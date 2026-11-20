import { validateSession } from './engine.js';

export const STORAGE_KEY = 'cdl-document-practice-v3';
export const KEYWORD_HINTS_KEY = 'cdl-keyword-hints';
const RETRY_KEY = 'cdl-missed-practice';
const LEGACY_SOURCE = 'user-air-brakes-docx-65-v1';
const COMBINED_SOURCE = 'user-cdl-documents-v1';
export const emptyState = () => ({ active: null, results: [] });

export function readKeywordHints(storage) {
  try {
    return (storage ?? globalThis.localStorage).getItem(KEYWORD_HINTS_KEY) === 'true';
  } catch { return false; }
}

export function saveKeywordHints(enabled, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(KEYWORD_HINTS_KEY, String(enabled === true));
    return true;
  } catch { return false; }
}

export function readRetry(questionMap, sourceId) {
  try {
    const session = JSON.parse(globalThis.sessionStorage.getItem(RETRY_KEY));
    if (session?.mode !== 'missed' || !validateSession(session, questionMap, sourceId)) return null;
    return session.testId === questionMap[session.ids[0]].testId ? session : null;
  } catch { return null; }
}

export function saveRetry(session) {
  try {
    if (session) globalThis.sessionStorage.setItem(RETRY_KEY, JSON.stringify(session));
    else globalThis.sessionStorage.removeItem(RETRY_KEY);
    return true;
  } catch { return false; }
}

function restoreGeneralPracticeProgress(progress, questionMap, state) {
  const validIds = ids => Array.isArray(ids) && new Set(ids).size === ids.length
    && ids.every(id => typeof id === 'string' && Object.hasOwn(questionMap, id)
      && questionMap[id].testId === 'general-knowledge');
  if (validIds(progress?.previousIds) && progress.previousIds.length && validIds(progress.seenIds)) {
    return { previousIds: progress.previousIds, seenIds: progress.seenIds };
  }
  const lastSet = [state.active, ...state.results].find(session =>
    session?.testId === 'general-knowledge' && session.mode === 'sets');
  if (lastSet) return { previousIds: [...lastSet.ids], seenIds: [...lastSet.ids] };
}

export function readState(questionMap, sourceId, storage) {
  try {
    storage ??= globalThis.localStorage;
    const data = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return emptyState();
    const legacyMap = sourceId === COMBINED_SOURCE ? Object.fromEntries(Object.entries(questionMap)
      .filter(([, question]) => question.testId === 'air-brakes')
      .map(([id, question]) => [id, { ...question, testId: 'document' }])) : {};
    const subjectIds = new Set(Object.values(questionMap).map(question => question.testId));
    const restore = session => {
      if (validateSession(session, questionMap, sourceId)
        && (sourceId !== COMBINED_SOURCE || subjectIds.has(session.testId))) return session;
      if (sourceId !== COMBINED_SOURCE || session?.sourceId !== LEGACY_SOURCE
        || !['all', 'document'].includes(session?.testId)
        || !validateSession(session, legacyMap, LEGACY_SOURCE)) return null;
      const migrated = { ...session, sourceId, testId: 'air-brakes' };
      return validateSession(migrated, questionMap, sourceId) ? migrated : null;
    };
    const seen = new Set();
    const results = Array.isArray(data.results) ? data.results.map(restore).filter(session => {
      if (!session || session.finishedAt === null || seen.has(session.id)) return false;
      seen.add(session.id);
      return true;
    }).slice(0, 20) : [];
    const active = restore(data.active);
    const state = {
      active: active && active.finishedAt === null ? active : null,
      results,
    };
    const progress = restoreGeneralPracticeProgress(data.generalPracticeProgress, questionMap, state);
    if (progress) state.generalPracticeProgress = progress;
    return state;
  } catch { return emptyState(); }
}

export function saveState(state, storage) {
  try {
    storage ??= globalThis.localStorage;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch { return false; }
}

export function clearState(storage) {
  try {
    storage ??= globalThis.localStorage;
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch { return false; }
}
