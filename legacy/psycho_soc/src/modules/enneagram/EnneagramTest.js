/**
 * Тест Эннеаграммы — система типов личности на основе базовых мотиваций и страхов
 * 
 * Определяет основной тип (1-9) и крыло (w)
 * 
 * 9 типов:
 * 1 - Перфекционист (Реформатор)
 * 2 - Помощник
 * 3 - Достигатель
 * 4 - Индивидуалист (Романтик)
 * 5 - Наблюдатель (Мыслитель)
 * 6 - Скептик (Лоялист)
 * 7 - Энтузиаст
 * 8 - Вызывающий (Лидер)
 * 9 - Миротворец
 * 
 * @module EnneagramTest
 */

import { TestRunner } from '../TestRunner.js';
import enneagramQuestions from '../../data/enneagramQuestions.js';

/**
 * Описание типов Эннеаграммы
 */
const TYPE_INFO = {
  1: { name: 'Перфекционист (Реформатор)', passion: 'Гнев', fear: 'Быть плохим/несовершенным' },
  2: { name: 'Помощник', passion: 'Гордость', fear: 'Быть нелюбимым/ненужным' },
  3: { name: 'Достигатель', passion: 'Тщеславие', fear: 'Быть никем/неудачником' },
  4: { name: 'Индивидуалист (Романтик)', passion: 'Зависть', fear: 'Быть обычным/незначительным' },
  5: { name: 'Наблюдатель (Мыслитель)', passion: 'Жадность', fear: 'Быть поглощенным/опустошенным' },
  6: { name: 'Скептик (Лоялист)', passion: 'Страх', fear: 'Быть без поддержки/безопасности' },
  7: { name: 'Энтузиаст', passion: 'Обжорство', fear: 'Быть ограниченным/страдать' },
  8: { name: 'Вызывающий (Лидер)', passion: 'Похоть', fear: 'Быть уязвимым/контролируемым' },
  9: { name: 'Миротворец', passion: 'Лень', fear: 'Потерять покой/быть в конфликте' },
};

/**
 * Правила определения крыла:
 * Крыло — это соседний тип, который имеет наибольший балл
 */
const WING_MAP = {
  1: [9, 2],
  2: [1, 3],
  3: [2, 4],
  4: [3, 5],
  5: [4, 6],
  6: [5, 7],
  7: [6, 8],
  8: [7, 9],
  9: [8, 1],
};

export class EnneagramTest extends TestRunner {
  constructor() {
    super({
      id: 'enneagram',
      name: 'Эннеаграмма',
      questions: enneagramQuestions,
      scaleMin: 1,
      scaleMax: 5,
    });
  }

  /**
   * Подсчитывает сырые баллы по 9 типам
   * @param {Object} answers
   * @returns {Object} { type1, type2, ... type9 }
   */
  scoreAnswers(answers) {
    const rawScores = {};
    const counts = {};

    for (let i = 1; i <= 9; i++) {
      rawScores[`type${i}`] = 0;
      counts[`type${i}`] = 0;
    }

    for (const q of this.questions) {
      const answer = answers[q.id];
      if (answer == null) continue;

      const scaleKey = `type${q.scale}`;
      const value = q.reversed ? this.reverseValue(answer) : answer;
      rawScores[scaleKey] += value;
      counts[scaleKey] += 1;
    }

    // Усредняем баллы
    for (let i = 1; i <= 9; i++) {
      const key = `type${i}`;
      rawScores[key] = counts[key] > 0
        ? Math.round((rawScores[key] / counts[key]) * 100) / 100
        : 0;
    }

    return rawScores;
  }

  /**
   * Определяет основной тип и крыло
   * @param {Object} rawScores - { type1: number, ... type9: number }
   * @returns {Object} { mainType, wing, wingLabel, description }
   */
  calculate(rawScores) {
    // Находим тип с максимальным баллом
    let maxScore = -1;
    let mainType = 1;

    for (let i = 1; i <= 9; i++) {
      if (rawScores[`type${i}`] > maxScore) {
        maxScore = rawScores[`type${i}`];
        mainType = i;
      }
    }

    // Определяем крыло (соседний тип с наибольшим баллом)
    const wings = WING_MAP[mainType];
    const wingScore1 = rawScores[`type${wings[0]}`] || 0;
    const wingScore2 = rawScores[`type${wings[1]}`] || 0;
    const wing = wingScore1 >= wingScore2 ? wings[0] : wings[1];

    // Баллы по уровням развития (проценты)
    const levels = {};
    for (let i = 1; i <= 9; i++) {
      levels[`type${i}`] = this.normalizeToPercent(rawScores[`type${i}`], 1, 5);
    }

    return {
      mainType,
      wing,
      wingLabel: `${mainType}w${wing}`,
      description: TYPE_INFO[mainType] || { name: 'Неизвестный тип', passion: '?', fear: '?' },
      levels,
    };
  }
}