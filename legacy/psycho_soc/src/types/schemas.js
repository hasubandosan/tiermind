/**
 * Схемы данных для профиля пользователя и результатов тестов
 * @module schemas
 */

/**
 * @typedef {Object} VerificationLevel
 * @property {'manual'|'test'|'extended'|'expert'} source - Источник результата
 * @property {number} percent - Процент достоверности (0-200)
 * @property {number} blocksCompleted - Количество пройденных блоков вопросов
 * @property {number} totalBlocks - Всего блоков для 100% достоверности
 * @property {string|null} verifiedBy - ID психолога, если подтверждено
 */

/**
 * @typedef {Object} TestResult - Результат теста
 * @property {string} testId - ID теста
 * @property {string} testName - Название
 * @property {string} completedAt - ISO дата
 * @property {Object} rawScores - Сырые баллы
 * @property {Object} processedResult - Обработанный результат
 * @property {VerificationLevel} verification - Достоверность
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} email - Email от Google
 * @property {string} username - Никнейм
 * @property {string} realName - Реальное имя (серым)
 * @property {string} avatar - URL аватара (из Google)
 * @property {number|null} age - Возраст
 * @property {'male'|'female'|'other'|null} gender - Пол
 * @property {'google'} authProvider - Провайдер авторизации
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Object} results
 * @property {TestResult|null} results.ocean
 * @property {TestResult|null} results.darkTriad
 * @property {TestResult|null} results.mbti
 * @property {TestResult|null} results.enneagram
 * @property {Object} psychologist - Данные психолога (если есть)
 * @property {boolean} psychologist.isActive
 * @property {'junior'|'mid'|'senior'|'master'|null} psychologist.rank
 * @property {number} psychologist.verificationBonus - Бонус к достоверности (10-100%)
 * @property {string[]} psychologist.specializations
 * @property {string[]} interests
 * @property {Object} preferences
 * @property {boolean} preferences.isProfilePublic
 * @property {boolean} preferences.showInMatching
 * @property {string|null} preferences.geminiApiKey
 * @property {string[]} friends
 * @property {Object} metadata
 * @property {number} metadata.testsCompleted
 * @property {string} metadata.lastActive
 */

/**
 * Создает пустой профиль
 * @param {Object} googleData - { sub, email, name, picture }
 * @returns {UserProfile}
 */
export function createProfileFromGoogle(googleData) {
  const now = new Date().toISOString();
  return {
    id: googleData.sub,
    email: googleData.email || '',
    username: googleData.name || googleData.email?.split('@')[0] || 'user',
    realName: googleData.name || '',
    avatar: googleData.picture || '',
    age: null,
    gender: null,
    authProvider: 'google',
    createdAt: now,
    updatedAt: now,
    results: {
      ocean: null,
      darkTriad: null,
      mbti: null,
      enneagram: null,
    },
    psychologist: {
      isActive: false,
      rank: null,
      verificationBonus: 0,
      specializations: [],
    },
    interests: [],
    preferences: {
      isProfilePublic: true,
      showInMatching: true,
      geminiApiKey: null,
    },
    friends: [],
    metadata: {
      testsCompleted: 0,
      lastActive: now,
    },
  };
}

/**
 * Создает объект достоверности
 * @param {'manual'|'test'|'extended'|'expert'} source
 * @param {number} blocksCompleted - Сколько блоков пройдено
 * @param {number} totalBlocks - Всего блоков
 * @param {string|null} verifiedBy - ID психолога
 * @param {number} psychologistBonus - Бонус от психолога
 * @returns {VerificationLevel}
 */
export function createVerification(source = 'manual', blocksCompleted = 0, totalBlocks = 1, verifiedBy = null, psychologistBonus = 0) {
  let percent = 0;

  if (source === 'manual') percent = 0;
  else if (source === 'test') {
    percent = blocksCompleted > 0 ? Math.round((blocksCompleted / totalBlocks) * 100) : 0;
  } else if (source === 'extended') {
    percent = Math.min(Math.round((blocksCompleted / totalBlocks) * 100), 100);
  } else if (source === 'expert') {
    percent = Math.min(100 + psychologistBonus, 200);
  }

  // Если источник test, но блоков нет — всё равно 100% за базовый тест
  if (source === 'test' && blocksCompleted === 1 && totalBlocks === 1) {
    percent = 100;
  }

  return {
    source,
    percent,
    blocksCompleted,
    totalBlocks,
    verifiedBy,
  };
}

/**
 * Валидация профиля
 */
export function validateProfile(profile) {
  const errors = [];
  if (!profile.id) errors.push('Отсутствует ID');
  if (!profile.email) errors.push('Отсутствует email');
  if (!profile.results) errors.push('Отсутствуют результаты тестов');
  return { valid: errors.length === 0, errors };
}