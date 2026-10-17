/**
 * Тест "Темная триада" (SD3 — Short Dark Triad)
 * Измеряет: макиавеллизм, нарциссизм, психопатию
 * Каждая шкала содержит 9 вопросов (всего 27), используется шкала 1-5
 * 
 * @module DarkTriadTest
 */

import { TestRunner } from '../TestRunner.js';
import darkTriadQuestions from '../../data/darkTriadQuestions.js';

const SCALES = {
  M: 'machiavellianism',
  N: 'narcissism',
  P: 'psychopathy',
};

export class DarkTriadTest extends TestRunner {
  constructor() {
    super({
      id: 'dark-triad',
      name: 'Темная триада (SD3)',
      questions: darkTriadQuestions,
      scaleMin: 1,
      scaleMax: 5,
    });
  }

  /**
   * Подсчитывает сырые баллы по 3 шкалам
   * @param {Object} answers
   * @returns {Object} { machiavellianism, narcissism, psychopathy }
   */
  scoreAnswers(answers) {
    const rawScores = {
      machiavellianism: 0,
      narcissism: 0,
      psychopathy: 0,
    };

    const counts = { ...rawScores };

    for (const q of this.questions) {
      const answer = answers[q.id];
      if (answer == null) continue;

      const scaleKey = SCALES[q.scale];
      const value = q.reversed ? this.reverseValue(answer) : answer;
      rawScores[scaleKey] += value;
      counts[scaleKey] += 1;
    }

    // Усредняем баллы
    for (const key of Object.keys(rawScores)) {
      rawScores[key] = counts[key] > 0
        ? Math.round((rawScores[key] / counts[key]) * 100) / 100
        : 0;
    }

    return rawScores;
  }

  /**
   * Конвертирует средние баллы в проценты (0-100)
   * @param {Object} rawScores
   * @returns {Object} { machiavellianism, narcissism, psychopathy }
   */
  calculate(rawScores) {
    const result = {};
    for (const [key, value] of Object.entries(rawScores)) {
      result[key] = this.normalizeToPercent(value, 1, 5);
    }
    return result;
  }
}