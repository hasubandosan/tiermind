/**
 * Сервис управления профилем пользователя
 * @module profileService
 */

import { createProfileFromGoogle, validateProfile, createVerification } from '../types/schemas.js';
import { saveProfile, loadProfile, hasProfile } from './storageService.js';

const GOOGLE_STORAGE_KEY = 'psycho_soc_google_token';

/**
 * Сохраняет Google токен в storage
 */
export function saveGoogleToken(response) {
  try {
    localStorage.setItem(GOOGLE_STORAGE_KEY, JSON.stringify({
      accessToken: response.access_token,
      credential: response.credential,
      expiresAt: Date.now() + (response.expires_in || 3600) * 1000,
    }));
  } catch (e) { /* ignore */ }
}

/**
 * Загружает Google токен
 */
export function getGoogleToken() {
  try {
    const data = localStorage.getItem(GOOGLE_STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (parsed.expiresAt < Date.now()) {
      localStorage.removeItem(GOOGLE_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch { return null; }
}

/**
 * Удаляет Google токен
 */
export function clearGoogleToken() {
  localStorage.removeItem(GOOGLE_STORAGE_KEY);
}

/**
 * Создаёт профиль после Google-авторизации
 */
export function createProfileFromGoogleAuth(googleData) {
  const profile = createProfileFromGoogle(googleData);
  saveProfile(profile);
  return profile;
}

export function getProfile() {
  return loadProfile();
}

export function updateProfileField(field, value) {
  const profile = loadProfile();
  if (!profile) return null;
  if (field in profile) {
    profile[field] = value;
    profile.updatedAt = new Date().toISOString();
    saveProfile(profile);
    return profile;
  }
  return null;
}

/**
 * Сохраняет результат теста с verification
 */
export function saveTestResult(testResult) {
  const profile = loadProfile();
  if (!profile) return null;

  const resultKeyMap = {
    'ocean': 'ocean',
    'dark-triad': 'darkTriad',
    'mbti': 'mbti',
    'enneagram': 'enneagram',
  };
  const key = resultKeyMap[testResult.testId];
  if (!key) return null;

  profile.results[key] = testResult;
  profile.updatedAt = new Date().toISOString();
  profile.metadata.lastActive = profile.updatedAt;
  profile.metadata.testsCompleted = Object.values(profile.results).filter(Boolean).length;
  saveProfile(profile);
  return profile;
}

/**
 * Сохраняет результат с ручным вводом (verification: manual, 0%)
 */
export function saveManualResult(testId, testName, rawScores, processedResult) {
  const profile = loadProfile();
  if (!profile) return null;

  const resultKeyMap = {
    'ocean': 'ocean',
    'dark-triad': 'darkTriad',
    'mbti': 'mbti',
    'enneagram': 'enneagram',
  };
  const key = resultKeyMap[testId];
  if (!key) return null;

  const testResult = {
    testId,
    testName,
    completedAt: new Date().toISOString(),
    rawScores,
    processedResult,
    verification: createVerification('manual', 0, 1),
  };

  profile.results[key] = testResult;
  profile.updatedAt = new Date().toISOString();
  profile.metadata.lastActive = profile.updatedAt;
  profile.metadata.testsCompleted = Object.values(profile.results).filter(Boolean).length;
  saveProfile(profile);
  return profile;
}

export function profileExists() {
  return hasProfile();
}

export function deleteProfile() {
  try {
    localStorage.removeItem('psycho_soc_profile');
    clearGoogleToken();
    return true;
  } catch { return false; }
}

/**
 * Экспорт профиля в .json
 */
export function exportProfileToJSON() {
  const profile = loadProfile();
  if (!profile) return false;
  try {
    const jsonString = JSON.stringify(profile, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `psycho-soc-${profile.username}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch { return false; }
}

/**
 * Импорт профиля из .json
 */
export function importProfileFromJSON(file) {
  return new Promise((resolve) => {
    if (!file || !file.name.endsWith('.json')) {
      resolve({ success: false, profile: null, error: 'Выберите .json файл' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const profile = JSON.parse(event.target.result);
        const validation = validateProfile(profile);
        if (!validation.valid) {
          resolve({ success: false, profile: null, error: `Ошибка: ${validation.errors.join(', ')}` });
          return;
        }
        profile.updatedAt = new Date().toISOString();
        saveProfile(profile);
        resolve({ success: true, profile, error: null });
      } catch {
        resolve({ success: false, profile: null, error: 'Ошибка парсинга JSON' });
      }
    };
    reader.onerror = () => resolve({ success: false, profile: null, error: 'Ошибка чтения файла' });
    reader.readAsText(file);
  });
}