/**
 * Реестр всех тестов личности
 * Единая точка доступа для регистрации и получения всех тестов
 * 
 * @module testRegistry
 */

import { OceanTest } from './ocean/OceanTest.js';
import { DarkTriadTest } from './darkTriad/DarkTriadTest.js';
import { MBTITest } from './mbti/MBTITest.js';
import { EnneagramTest } from './enneagram/EnneagramTest.js';

/**
 * Словарь всех доступных тестов
 * Ключ — testId, значение — экземпляр класса TestRunner
 */
const testInstances = {
  ocean: new OceanTest(),
  'dark-triad': new DarkTriadTest(),
  mbti: new MBTITest(),
  enneagram: new EnneagramTest(),
};

/**
 * Возвращает экземпляр теста по его ID
 * @param {string} testId - ID теста (ocean, dark-triad, mbti, enneagram)
 * @returns {TestRunner|null}
 */
export function getTest(testId) {
  return testInstances[testId] || null;
}

/**
 * Возвращает список всех доступных тестов
 * @returns {Array<{ id: string, name: string, questionCount: number }>}
 */
export function getAllTests() {
  return Object.values(testInstances).map(test => ({
    id: test.id,
    name: test.name,
    questionCount: test.getQuestions().length,
  }));
}

/**
 * Выполняет тест по его ID с переданными ответами
 * @param {string} testId - ID теста
 * @param {Object} answers - Объект с ответами { questionId: answer }
 * @returns {Object|null} Результат теста или null, если тест не найден
 */
export function runTest(testId, answers) {
  const test = testInstances[testId];
  if (!test) {
    console.error(`Тест "${testId}" не найден`);
    return null;
  }
  return test.run(answers);
}

/**
 * Возвращает вопросы теста по его ID
 * @param {string} testId - ID теста
 * @returns {Array|null} Массив вопросов или null
 */
export function getTestQuestions(testId) {
  const test = testInstances[testId];
  if (!test) return null;
  return test.getQuestions();
}

export { OceanTest, DarkTriadTest, MBTITest, EnneagramTest };