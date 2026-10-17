/**
 * Базовый класс для всех тестов личности
 * Каждый тест наследуется от этого класса и реализует:
 * - questions() - возвращает массив вопросов
 * - calculate(rawScores) - вычисляет результат из сырых баллов
 * 
 * @module TestRunner
 */

export class TestRunner {
  /**
   * @param {Object} config - Конфигурация теста
   * @param {string} config.id - Уникальный ID теста
   * @param {string} config.name - Название теста
   * @param {Array} config.questions - Массив вопросов
   * @param {number} config.scaleMin - Минимальное значение шкалы (по умолчанию 1)
   * @param {number} config.scaleMax - Максимальное значение шкалы (по умолчанию 5)
   */
  constructor(config) {
    if (new.target === TestRunner) {
      throw new Error('TestRunner - абстрактный класс. Используйте наследование.');
    }
    this.id = config.id;
    this.name = config.name;
    this.questions = config.questions;
    this.scaleMin = config.scaleMin ?? 1;
    this.scaleMax = config.scaleMax ?? 5;
  }

  /**
   * Возвращает массив вопросов для теста
   * Каждый вопрос: { id, text, scale, reversed? }
   * @returns {Array}
   */
  getQuestions() {
    return this.questions;
  }

  /**
   * Нормализует значение по шкале 0-100
   * @param {number} raw - Сырое значение
   * @param {number} min - Минимум шкалы
   * @param {number} max - Максимум шкалы
   * @returns {number} Процент (0-100)
   */
  normalizeToPercent(raw, min, max) {
    return Math.round(((raw - min) / (max - min)) * 100);
  }

  /**
   * Инвертирует ответ для reversed-вопросов
   * @param {number} value - Значение ответа
   * @returns {number} Инвертированное значение
   */
  reverseValue(value) {
    return this.scaleMax - (value - this.scaleMin);
  }

  /**
   * Подсчитывает сырые баллы по шкалам с учетом reversed-вопросов
   * @param {Object} answers - Объект { questionId: answer }
   * @returns {Object} rawScores - Сырые баллы по каждой шкале
   */
  scoreAnswers(answers) {
    throw new Error('Метод scoreAnswers() должен быть реализован в подклассе');
  }

  /**
   * Вычисляет обработанный результат из сырых баллов
   * @param {Object} rawScores - Сырые баллы
   * @returns {Object} processedResult - Обработанный результат
   */
  calculate(rawScores) {
    throw new Error('Метод calculate() должен быть реализован в подклассе');
  }

  /**
   * Полный цикл: сбор ответов -> сырые баллы -> результат
   * @param {Object} answers - Ответы пользователя
   * @returns {Object} Полный результат теста
   */
  run(answers) {
    const rawScores = this.scoreAnswers(answers);
    const processedResult = this.calculate(rawScores);

    return {
      testId: this.id,
      testName: this.name,
      completedAt: new Date().toISOString(),
      rawScores,
      processedResult,
    };
  }
}