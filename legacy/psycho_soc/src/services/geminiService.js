/**
 * Сервис для работы с Gemini API
 * Позволяет пользователю использовать свой API-ключ для улучшенной обработки тестов
 * @module geminiService
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Отправляет промпт в Gemini API
 * @param {string} apiKey - Ключ API пользователя
 * @param {string} prompt - Текст запроса
 * @returns {Promise<string>} Ответ модели
 */
export async function queryGemini(apiKey, prompt) {
  if (!apiKey) {
    throw new Error('API ключ Gemini не указан');
  }

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 32,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${response.status} — ${err}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Нет ответа';
  } catch (error) {
    throw new Error(`Ошибка Gemini API: ${error.message}`);
  }
}

/**
 * Анализирует ответы теста через Gemini для получения улучшенного результата
 * @param {string} apiKey
 * @param {string} testType - ocean | dark-triad | mbti | enneagram
 * @param {Object} answers - Ответы пользователя
 * @param {Object} currentResult - Текущий результат теста
 * @returns {Promise<Object>} Улучшенный processedResult
 */
export async function enhanceTestWithGemini(apiKey, testType, answers, currentResult) {
  const prompt = buildEnhancementPrompt(testType, answers, currentResult);
  const response = await queryGemini(apiKey, prompt);
  
  try {
    // Gemini возвращает JSON строкой — парсим
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch { /* fall through */ }

  // Если не удалось распарсить, возвращаем текущий результат
  return currentResult;
}

/**
 * Строит промпт для улучшения результата теста
 */
function buildEnhancementPrompt(testType, answers, currentResult) {
  const answersStr = JSON.stringify(answers, null, 2);
  const resultStr = JSON.stringify(currentResult, null, 2);

  const prompts = {
    'ocean': `Ты — эксперт по психологии, специалист по Большой пятёрке (OCEAN).
Проанализируй ответы пользователя на тест личности и дай более точные проценты по 5 шкалам.

Текущий (сырой) результат:
${resultStr}

Ответы пользователя:
${answersStr}

Верни ТОЛЬКО JSON объект с ключами: openness, conscientiousness, extraversion, agreeableness, neuroticism.
Каждое значение — число от 0 до 100.`,

    'dark-triad': `Ты — эксперт по психологии, специалист по Тёмной триаде (SD3).
Проанализируй ответы и дай более точные проценты по трём шкалам.

Текущий результат:
${resultStr}

Ответы:
${answersStr}

Верни JSON: { "machiavellianism": 0-100, "narcissism": 0-100, "psychopathy": 0-100 }`,

    'mbti': `Ты — эксперт по типологии MBTI и когнитивным функциям Юнга.
Проанализируй ответы пользователя и определи его тип MBTI с когнитивными функциями.

Текущий результат:
${resultStr}

Ответы:
${answersStr}

Верни JSON: { "type": "INTJ", "functions": { "dominant": "Ni", "auxiliary": "Te", ... }, "dimensions": { ... } }`,

    'enneagram': `Ты — эксперт по Эннеаграмме.
Проанализируй ответы пользователя и определи его тип Эннеаграммы с крылом.

Текущий результат:
${resultStr}

Ответы:
${answersStr}

Верни JSON: { "mainType": 5, "wing": 6, "wingLabel": "5w6", "description": { ... }, "levels": { ... } }`,
  };

  return prompts[testType] || `Проанализируй эти данные теста личности: ${answersStr}`;
}