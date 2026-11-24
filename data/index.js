import { QUESTIONS as AIR_QUESTIONS, EXCLUDED_QUESTIONS as AIR_EXCLUDED } from './questions.js';
import { QUESTIONS as GENERAL_QUESTIONS, EXCLUDED_QUESTIONS as GENERAL_EXCLUDED } from './general-knowledge.js';
import { QUESTIONS as COMBINATION_QUESTIONS, EXCLUDED_QUESTIONS as COMBINATION_EXCLUDED } from './combination-vehicles.js';
import { WORDING_GROUPS } from './wording-groups.js';
export { WORDING_GROUPS };

const ANSWER_NUMBER = /\d|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|half|halves|quarter|quarters|twice)\b/i;

export function hasNumericAnswer(question) {
  return question.choices.some(choice => ANSWER_NUMBER.test(choice));
}

export function hasMphAnswer(question) {
  return question.choices.some(choice => /\b(?:mph|miles[\s-]+per[\s-]+hour)\b/i.test(choice));
}

const NEW_QUESTION_IDS = new Set([
  'gk-016', 'gk-110', 'gk-140', 'gk-158', 'gk-183', 'gk-297',
  'docx-13',
  'cv-024', 'cv-030', 'cv-043', 'cv-055', 'cv-068',
]);

export const SOURCE = { id: 'user-cdl-documents-v1', title: 'CDL машқлари' };
export const SUBJECTS = [
  {
    id: 'general-knowledge', title: 'Умумий билимлар',
    description: 'Хавфсиз ҳайдаш, транспортни текшириш ва йўл ҳаракати қоидалари.',
    practiceCount: 50, setSize: 20, sourceUrl: './source/general-knowledge.docx',
    excluded: GENERAL_EXCLUDED,
  },
  {
    id: 'air-brakes', title: 'Ҳаво тормозлари',
    description: 'Ҳаво тизимлари, тормозларни текшириш ва хавфсиз тўхташ.',
    practiceCount: 25, sourceUrl: './source/air-brakes.docx',
    excluded: AIR_EXCLUDED,
  },
  {
    id: 'combination-vehicles', title: 'Тиркамали транспорт',
    description: 'Улаш, тиркама тормозлари ва тиркамали транспортни бошқариш.',
    practiceCount: 20, sourceUrl: './source/combination-vehicles.docx',
    excluded: COMBINATION_EXCLUDED,
  },
];
export const QUESTIONS = [
  ...GENERAL_QUESTIONS,
  ...AIR_QUESTIONS.map(question => ({ ...question, testId: 'air-brakes' })),
  ...COMBINATION_QUESTIONS,
];
export const QUESTION_MAP = Object.fromEntries(QUESTIONS.map(question => [question.id, question]));
export const SUBJECT_MAP = Object.fromEntries(SUBJECTS.map(subject => {
  subject.questions = QUESTIONS.filter(question => question.testId === subject.id);
  subject.count = subject.questions.length;
  subject.newQuestions = subject.questions.filter(question => NEW_QUESTION_IDS.has(question.id));
  subject.wordingGroups = WORDING_GROUPS.filter(group => group.matches.every(match => QUESTION_MAP[match.id]?.testId === subject.id));
  const wordingIds = new Set(subject.wordingGroups.flatMap(group => group.matches.map(match => match.id)));
  subject.wordingQuestions = subject.questions.filter(question => wordingIds.has(question.id));
  if (subject.id === 'general-knowledge') {
    subject.numberQuestions = subject.questions.filter(hasNumericAnswer);
    subject.mphQuestions = subject.questions.filter(hasMphAnswer);
  }
  return [subject.id, subject];
}));
