import { validateSession } from './engine.js';

const KEY = 'cdl-document-practice-v3';
const LEGACY_SOURCE = 'user-air-brakes-docx-65-v1';
const COMBINED_SOURCE = 'user-cdl-documents-v1';
export const emptyState = () => ({ active: null, results: [] });

export function readState(questionMap, sourceId, storage) {
  try {
    storage ??= globalThis.localStorage;
    const data = JSON.parse(storage.getItem(KEY));
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
    return {
      active: active && active.finishedAt === null ? active : null,
      results,
    };
  } catch { return emptyState(); }
}

export function saveState(state, storage) {
  try {
    storage ??= globalThis.localStorage;
    storage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch { return false; }
}

export function clearState(storage) {
  try {
    storage ??= globalThis.localStorage;
    storage.removeItem(KEY);
    return true;
  } catch { return false; }
}
