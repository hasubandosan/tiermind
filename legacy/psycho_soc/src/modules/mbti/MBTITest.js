/**
 * Тест MBTI на основе когнитивных функций Юнга
 * 
 * Определяет 4-буквенный тип через 8 когнитивных функций:
 * - Экстравертное/Интровертное мышление (Te/Ti)
 * - Экстравертное/Интровертное чувство (Fe/Fi)
 * - Экстравертная/Интровертная интуиция (Ne/Ni)
 * - Экстравертная/Интровертная сенсорика (Se/Si)
 * 
 * Каждый тип имеет стек функций: Dominant - Auxiliary - Tertiary - Inferior
 * 
 * @module MBTITest
 */

import { TestRunner } from '../TestRunner.js';
import mbtiQuestions from '../../data/mbtiQuestions.js';

/**
 * Стеки когнитивных функций для каждого типа MBTI
 * Порядок: Dominant - Auxiliary - Tertiary - Inferior
 */
const FUNCTION_STACKS = {
  INTJ: { dominant: 'Ni', auxiliary: 'Te', tertiary: 'Fi', inferior: 'Se' },
  INTP: { dominant: 'Ti', auxiliary: 'Ne', tertiary: 'Si', inferior: 'Fe' },
  ENTJ: { dominant: 'Te', auxiliary: 'Ni', tertiary: 'Se', inferior: 'Fi' },
  ENTP: { dominant: 'Ne', auxiliary: 'Ti', tertiary: 'Fe', inferior: 'Si' },
  INFJ: { dominant: 'Ni', auxiliary: 'Fe', tertiary: 'Ti', inferior: 'Se' },
  INFP: { dominant: 'Fi', auxiliary: 'Ne', tertiary: 'Si', inferior: 'Te' },
  ENFJ: { dominant: 'Fe', auxiliary: 'Ni', tertiary: 'Se', inferior: 'Ti' },
  ENFP: { dominant: 'Ne', auxiliary: 'Fi', tertiary: 'Te', inferior: 'Si' },
  ISTJ: { dominant: 'Si', auxiliary: 'Te', tertiary: 'Fi', inferior: 'Ne' },
  ISFJ: { dominant: 'Si', auxiliary: 'Fe', tertiary: 'Ti', inferior: 'Ne' },
  ESTJ: { dominant: 'Te', auxiliary: 'Si', tertiary: 'Ne', inferior: 'Fi' },
  ESFJ: { dominant: 'Fe', auxiliary: 'Si', tertiary: 'Ne', inferior: 'Ti' },
  ISTP: { dominant: 'Ti', auxiliary: 'Se', tertiary: 'Ni', inferior: 'Fe' },
  ISFP: { dominant: 'Fi', auxiliary: 'Se', tertiary: 'Ni', inferior: 'Te' },
  ESTP: { dominant: 'Se', auxiliary: 'Ti', tertiary: 'Fe', inferior: 'Ni' },
  ESFP: { dominant: 'Se', auxiliary: 'Fi', tertiary: 'Te', inferior: 'Ni' },
};

export class MBTITest extends TestRunner {
  constructor() {
    super({
      id: 'mbti',
      name: 'MBTI (когнитивные функции)',
      questions: mbtiQuestions,
      scaleMin: 1,
      scaleMax: 5,
    });
  }

  /**
   * Подсчитывает сырые баллы по 4 дихотомиям
   * @param {Object} answers
   * @returns {Object} { E, I, S, N, T, F, J, P }
   */
  scoreAnswers(answers) {
    const raw = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    const counts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

    // Маппинг шкалы -> к каким дихотомиям относится
    const scaleMap = {
      EI: ['E', 'I'],
      SN: ['S', 'N'],
      TF: ['T', 'F'],
      JP: ['J', 'P'],
    };

    for (const q of this.questions) {
      const answer = answers[q.id];
      if (answer == null) continue;

      const [first, second] = scaleMap[q.scale];
      const value = q.reversed ? this.reverseValue(answer) : answer;

      // Если вопрос не reversed: высокий балл = первая буква, низкий = вторая
      // Если reversed: высокий балл = вторая буква, низкий = первая
      if (q.reversed) {
        raw[second] += value;
        raw[first] += (this.scaleMax + this.scaleMin - value);
      } else {
        raw[first] += value;
        raw[second] += (this.scaleMax + this.scaleMin - value);
      }
      counts[first] += 1;
      counts[second] += 1;
    }

    // Усредняем
    for (const key of Object.keys(raw)) {
      raw[key] = counts[key] > 0 ? raw[key] / counts[key] : 0;
    }

    return raw;
  }

  /**
   * Определяет тип MBTI и когнитивные функции
   * @param {Object} rawScores - { E, I, S, N, T, F, J, P }
   * @returns {Object} { type, functions, dimensions }
   */
  calculate(rawScores) {
    // Определяем предпочтения
    const e = rawScores.E >= rawScores.I ? 'E' : 'I';
    const s = rawScores.S >= rawScores.N ? 'S' : 'N';
    const t = rawScores.T >= rawScores.F ? 'T' : 'F';
    const j = rawScores.J >= rawScores.P ? 'J' : 'P';

    const type = `${e}${s}${t}${j}`;
    const funcStack = FUNCTION_STACKS[type] || { dominant: '?', auxiliary: '?', tertiary: '?', inferior: '?' };

    return {
      type,
      functions: funcStack,
      dimensions: {
        extraversion: this.normalizeToPercent(rawScores.E, 1, 5),
        introversion: this.normalizeToPercent(rawScores.I, 1, 5),
        sensing: this.normalizeToPercent(rawScores.S, 1, 5),
        intuition: this.normalizeToPercent(rawScores.N, 1, 5),
        thinking: this.normalizeToPercent(rawScores.T, 1, 5),
        feeling: this.normalizeToPercent(rawScores.F, 1, 5),
        judging: this.normalizeToPercent(rawScores.J, 1, 5),
        perceiving: this.normalizeToPercent(rawScores.P, 1, 5),
      },
    };
  }
}