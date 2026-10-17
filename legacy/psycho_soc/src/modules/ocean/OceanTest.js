/**
 * Тест "Большая пятерка" (OCEAN / Big Five)
 * Измеряет 5 черт личности: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
 * 
 * Используется сокращенная версия TIPI (Ten-Item Personality Inventory)
 * для MVP. В будущем можно расширить до полной версии (BFI-44).
 * 
 * @module OceanTest
 */

import { TestRunner } from '../TestRunner.js';
import oceanQuestions from '../../data/oceanQuestions.js';

const SCALES = {
  O: 'openness',       // Открытость опыту
  C: 'conscientiousness', // Добросовестность
  E: 'extraversion',   // Экстраверсия
  A: 'agreeableness',  // Доброжелательность
  N: 'neuroticism',    // Нейротизм
};

export class OceanTest extends TestRunner {
  constructor() {
    super({
      id: 'ocean',
      name: 'Большая пятерка (OCEAN)',
      questions: oceanQuestions,
      scaleMin: 1,
      scaleMax: 5,
    });
  }

  /**
   * Подсчитывает сырые баллы по 5 шкалам
   * @param {Object} answers - { questionId: 1-5 }
   * @returns {Object} { openness, conscientiousness, extraversion, agreeableness, neuroticism }
   */
  scoreAnswers(answers) {
    const rawScores = {
      openness: 0,
      conscientiousness: 0,
      extraversion: 0,
      agreeableness: 0,
      neuroticism: 0,
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
   * Конвертирует сырые баллы в проценты (0-100)
   * @param {Object} rawScores
   * @returns {Object} { openness, conscientiousness, extraversion, agreeableness, neuroticism }
   */
  calculate(rawScores) {
    const result = {};
    for (const [key, value] of Object.entries(rawScores)) {
      // Шкала 1-5 -> проценты 0-100
      result[key] = this.normalizeToPercent(value, 1, 5);
    }
    return result;
  }
}