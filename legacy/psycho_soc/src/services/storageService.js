/**
 * Сервис для работы с LocalStorage
 * Абстрагирует сохранение/загрузку данных на клиенте
 * 
 * @module storageService
 */

const STORAGE_KEYS = {
  PROFILE: 'psycho_soc_profile',
  SETTINGS: 'psycho_soc_settings',
};

/**
 * Сохраняет данные в LocalStorage
 * @param {string} key - Ключ
 * @param {any} data - Данные для сохранения
 * @returns {boolean} Успешно ли сохранено
 */
export function saveToStorage(key, data) {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error('Ошибка сохранения в LocalStorage:', error);
    return false;
  }
}

/**
 * Загружает данные из LocalStorage
 * @param {string} key - Ключ
 * @returns {any|null} Загруженные данные или null, если не найдены
 */
export function loadFromStorage(key) {
  try {
    const serialized = localStorage.getItem(key);
    if (serialized === null) return null;
    return JSON.parse(serialized);
  } catch (error) {
    console.error('Ошибка загрузки из LocalStorage:', error);
    return null;
  }
}

/**
 * Удаляет данные из LocalStorage
 * @param {string} key - Ключ
 */
export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Ошибка удаления из LocalStorage:', error);
  }
}

/**
 * Сохраняет профиль пользователя
 * @param {Object} profile - Профиль пользователя
 * @returns {boolean} Успешно ли сохранено
 */
export function saveProfile(profile) {
  return saveToStorage(STORAGE_KEYS.PROFILE, profile);
}

/**
 * Загружает профиль пользователя
 * @returns {Object|null}
 */
export function loadProfile() {
  return loadFromStorage(STORAGE_KEYS.PROFILE);
}

/**
 * Проверяет, существует ли профиль в LocalStorage
 * @returns {boolean}
 */
export function hasProfile() {
  return loadFromStorage(STORAGE_KEYS.PROFILE) !== null;
}

/**
 * Удаляет профиль из LocalStorage
 */
export function clearProfile() {
  removeFromStorage(STORAGE_KEYS.PROFILE);
}