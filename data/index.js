import { QUESTIONS as AIR_QUESTIONS, EXCLUDED_QUESTIONS as AIR_EXCLUDED } from './questions.js';
import { QUESTIONS as GENERAL_QUESTIONS, EXCLUDED_QUESTIONS as GENERAL_EXCLUDED } from './general-knowledge.js';
import { QUESTIONS as COMBINATION_QUESTIONS, EXCLUDED_QUESTIONS as COMBINATION_EXCLUDED } from './combination-vehicles.js';

export const SOURCE = { id: 'user-cdl-documents-v1', title: 'CDL машқлари' };
export const SUBJECTS = [
  {
    id: 'general-knowledge', title: 'Умумий билимлар',
    description: 'Хавфсиз ҳайдаш, транспортни текшириш ва йўл ҳаракати қоидалари.',
    practiceCount: 20, setSize: 20, sourceUrl: './source/general-knowledge.docx',
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
  return [subject.id, subject];
}));
