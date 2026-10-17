/**
 * Psycho Soc MVP v3
 * Навигация по вкладкам: Profile | Search | Settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import {
  createProfileFromGoogleAuth,
  getProfile,
  profileExists,
  saveTestResult,
  updateProfileField,
  exportProfileToJSON,
  importProfileFromJSON,
} from './services/profileService.js';
import { getAllTests, getTest, getTestQuestions } from './modules/index.js';
import { enhanceTestWithGemini } from './services/geminiService.js';

const TEST_LABELS = {
  ocean: 'Большая пятерка',
  'dark-triad': 'Темная триада',
  mbti: 'MBTI',
  enneagram: 'Эннеаграмма',
};

const TEST_ICONS = {
  ocean: '🌊',
  'dark-triad': '🌑',
  mbti: '🧩',
  enneagram: '⭕',
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // profile | search | settings
  const [activeScreen, setActiveScreen] = useState('login'); // login | main
  const [activeTest, setActiveTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [expandedTest, setExpandedTest] = useState(null); // для раскрытия деталей теста

  // Загрузка профиля
  useEffect(() => {
    if (profileExists()) {
      const p = getProfile();
      setUser(p);
      setActiveScreen('main');
      if (p.preferences?.geminiApiKey) setGeminiKey(p.preferences.geminiApiKey);
    }
  }, []);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3500);
      return () => clearTimeout(t);
    }
  }, [message]);

  const showMsg = (type, text) => setMessage({ type, text });

  // Google Login
  const login = useGoogleLogin({
    onSuccess: (response) => {
      fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${response.access_token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          const profile = createProfileFromGoogleAuth(data);
          setUser(profile);
          setActiveScreen('main');
          showMsg('success', `Добро пожаловать, ${data.name}!`);
        })
        .catch(() => showMsg('error', 'Ошибка получения данных'));
    },
    onError: () => showMsg('error', 'Ошибка входа через Google'),
  });

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    setActiveScreen('login');
  };

  // Начать тест
  const handleStartTest = (testId) => {
    setActiveTest(testId);
    setAnswers({});
    setTestResult(null);
    setActiveScreen('test');
  };

  const handleAnswer = (qId, value) => {
    setAnswers((prev) => ({ ...prev, [qId]: Number(value) }));
  };

  const handleSubmitTest = async () => {
    const questions = getTestQuestions(activeTest);
    const unanswered = questions.filter((q) => answers[q.id] == null);
    if (unanswered.length > 0) {
      showMsg('error', `Осталось ответить: ${unanswered.length}`);
      return;
    }
    setLoading(true);
    setMessage(null);
    const result = getTest(activeTest).run(answers);
    if (geminiKey) {
      try {
        const enhanced = await enhanceTestWithGemini(geminiKey, activeTest, answers, result.processedResult);
        result.processedResult = enhanced;
      } catch (e) {
        showMsg('error', 'Gemini: ' + e.message);
      }
    }
    result.verification = { source: 'test', percent: 100, blocksCompleted: 1, totalBlocks: 1, verifiedBy: null };
    const updatedProfile = saveTestResult(result);
    setUser(updatedProfile);
    setTestResult(result);
    setActiveScreen('result');
    setLoading(false);
  };

  // Сохранить Gemini ключ (в настройках)
  const handleSaveGeminiKey = (e) => {
    e.preventDefault();
    if (geminiKey.trim()) {
      updateProfileField('preferences', { ...user.preferences, geminiApiKey: geminiKey.trim() });
      showMsg('success', 'API ключ сохранён');
    }
  };

  // Экспорт / Импорт
  const handleExport = () => {
    const ok = exportProfileToJSON();
    showMsg(ok ? 'success' : 'error', ok ? '✅ Профиль экспортирован!' : '❌ Ошибка экспорта');
  };

  const handleImport = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const r = await importProfileFromJSON(file);
    if (r.success) { setUser(r.profile); showMsg('success', '✅ Профиль импортирован!'); }
    else { showMsg('error', r.error); }
    e.target.value = '';
  }, []);

  // ========== RENDER ==========

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧠 Psycho Soc</h1>
        {activeScreen === 'main' && (
          <button className="btn btn-ghost logout-btn" onClick={handleLogout}>🚪</button>
        )}
      </header>

      {message && <div className={`toast toast-${message.type}`}>{message.text}</div>}

      <main className="app-main">
        {/* ===== LOGIN ===== */}
        {activeScreen === 'login' && (
          <div className="screen-center">
            <div className="card auth-card">
              <div className="auth-icon">🧠</div>
              <h2>Добро пожаловать</h2>
              <p>Войдите через Google, чтобы начать</p>
              <button className="btn btn-google btn-lg" onClick={() => login()}>
                <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Войти через Google
              </button>
            </div>
          </div>
        )}

        {/* ===== TEST SCREEN ===== */}
        {activeScreen === 'test' && activeTest && (
          <div className="test-screen">
            <div className="card">
              <div className="test-header">
                <button className="btn btn-ghost" onClick={() => { setActiveScreen('main'); setActiveTab('profile'); }}>← Назад</button>
                <h2>{TEST_ICONS[activeTest]} {getTest(activeTest).name}</h2>
              </div>
              <p className="test-instruction">Оцените от 1 (не согласен) до 5 (полностью согласен)</p>
              <div className="questions-list">
                {getTestQuestions(activeTest).map((q, i) => (
                  <div key={q.id} className="question-item">
                    <p className="question-text">{i + 1}. {q.text}</p>
                    <div className="scale-row">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <label key={val} className={`scale-option ${answers[q.id] === val ? 'active' : ''}`}>
                          <input type="radio" name={q.id} value={val} checked={answers[q.id] === val}
                            onChange={() => handleAnswer(q.id, val)} />
                          <span className="scale-label">{val}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleSubmitTest} disabled={loading}>
                {loading ? '⏳ Обработка...' : '📊 Получить результат'}
              </button>
            </div>
          </div>
        )}

        {/* ===== RESULT SCREEN ===== */}
        {activeScreen === 'result' && testResult && (
          <div className="results-screen">
            <div className="card">
              <h2>📊 {testResult.testName}</h2>
              <p className="completed-at">Пройдено: {new Date(testResult.completedAt).toLocaleString('ru-RU')}</p>
              <ResultViewer result={testResult} />
              <button className="btn btn-primary btn-lg" onClick={() => { setActiveScreen('main'); setActiveTab('profile'); }}>
                ← В профиль
              </button>
            </div>
          </div>
        )}

        {/* ===== MAIN (Profile / Search / Settings) ===== */}
        {activeScreen === 'main' && user && (
          <div className="main-layout">
            {/* Навигация */}
            <nav className="tab-nav">
              <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                👤 Профиль
              </button>
              <button className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
                🔍 Поиск
              </button>
              <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                ⚙️ Настройки
              </button>
            </nav>

            {/* ===== PROFILE TAB ===== */}
            {activeTab === 'profile' && (
              <div className="tab-content">
                {/* Блок пользователя */}
                <div className="card user-card">
                  <div className="user-header-content">
                    <img src={user.avatar || 'https://i.pravatar.cc/80'} alt="" className="user-avatar" />
                    <div className="user-info-block">
                      <h2 className="user-nickname">{user.username}</h2>
                      {user.realName && <p className="user-realname">{user.realName}</p>}
                      <div className="user-meta">
                        {user.age && <span>🎂 {user.age}</span>}
                        {user.gender && <span> {user.gender === 'male' ? '♂️' : user.gender === 'female' ? '♀️' : '⚧'}</span>}
                      </div>
                    </div>
                  </div>
                  {/* Кнопки действий */}
                  <div className="user-actions">
                    <button className="btn btn-secondary" disabled title="Скоро">👥 Друзья ({user.friends?.length || 0})</button>
                    <button className="btn btn-secondary" disabled title="Скоро">➕ В друзья</button>
                    <button className="btn btn-secondary" onClick={handleExport}>📥 Экспорт</button>
                    <label className="btn btn-secondary">📤 Импорт<input type="file" accept=".json" onChange={handleImport} hidden /></label>
                  </div>
                </div>

                {/* Результаты тестов */}
                <h3 className="section-title">📋 Результаты тестов</h3>
                <div className="tests-grid">
                  {getAllTests().map((test) => {
                    const keyMap = { ocean: 'ocean', 'dark-triad': 'darkTriad', mbti: 'mbti', enneagram: 'enneagram' };
                    const result = user.results[keyMap[test.id]];
                    const isManual = result?.verification?.source === 'manual';
                    const pct = result?.verification?.percent ?? 0;
                    const isExpanded = expandedTest === test.id;

                    return (
                      <div key={test.id} className={`test-cell ${result ? 'has-result' : ''} ${isManual ? 'manual' : ''}`}>
                        <div className="test-cell-header">
                          <span className="test-icon">{TEST_ICONS[test.id]}</span>
                          <h3>{TEST_LABELS[test.id]}</h3>
                        </div>

                        {result ? (
                          <>
                            <div className="test-result-preview" onClick={() => setExpandedTest(isExpanded ? null : test.id)}>
                              <ResultPreview result={result} />
                              <div className={`verification-badge ${isManual ? 'low' : 'high'}`}>
                                {isManual ? '✏️ Ручной' : '✅ Тест'} · {pct}%
                              </div>
                            </div>
                            {/* Раскрытые детали */}
                            {isExpanded && (
                              <div className="test-details">
                                <ResultViewer result={result} compact />
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="test-empty">Не пройден</p>
                        )}

                        <div className="test-actions">
                          <button className="btn btn-primary" onClick={() => handleStartTest(test.id)}>
                            {result ? '🔄 Перепройти' : '▶️ Пройти'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== SEARCH TAB ===== */}
            {activeTab === 'search' && (
              <div className="tab-content">
                <div className="card">
                  <h2>🔍 Поиск людей</h2>
                  <p className="hint">Находите единомышленников по типам личности</p>
                  <div className="search-filters">
                    <input type="text" placeholder="Поиск по имени или типу..." className="search-input" />
                    <div className="filter-tags">
                      <span className="filter-tag">🌊 OCEAN</span>
                      <span className="filter-tag">🌑 Темная триада</span>
                      <span className="filter-tag">🧩 MBTI</span>
                      <span className="filter-tag">⭕ Эннеаграмма</span>
                    </div>
                  </div>
                  <div className="search-placeholder">
                    <p>🔜 Здесь появится список пользователей</p>
                    <p className="hint">Функция поиска и мэтчинга будет доступна в следующем обновлении</p>
                  </div>
                </div>
              </div>
            )}

            {/* ===== SETTINGS TAB ===== */}
            {activeTab === 'settings' && (
              <div className="tab-content">
                <div className="card">
                  <h2>⚙️ Настройки</h2>

                  <div className="settings-section">
                    <h3>🔮 Gemini AI</h3>
                    <p className="hint">Улучшенная оценка тестов через искусственный интеллект</p>
                    <form onSubmit={handleSaveGeminiKey} className="gemini-form">
                      <input type="password" placeholder="API ключ Gemini" value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)} />
                      <button type="submit" className="btn btn-accent">💾 Сохранить</button>
                    </form>
                  </div>

                  <div className="settings-section">
                    <h3>👤 Профиль</h3>
                    <div className="settings-field">
                      <label>Имя пользователя</label>
                      <input type="text" value={user.username}
                        onChange={(e) => {
                          const updated = updateProfileField('username', e.target.value);
                          if (updated) setUser(updated);
                        }} />
                    </div>
                    <div className="settings-field">
                      <label>Возраст</label>
                      <input type="number" min="1" max="150" value={user.age || ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          const updated = updateProfileField('age', val);
                          if (updated) setUser(updated);
                        }} />
                    </div>
                    <div className="settings-field">
                      <label>Пол</label>
                      <select value={user.gender || ''}
                        onChange={(e) => {
                          const val = e.target.value || null;
                          const updated = updateProfileField('gender', val);
                          if (updated) setUser(updated);
                        }}>
                        <option value="">Не указан</option>
                        <option value="male">Мужской</option>
                        <option value="female">Женский</option>
                        <option value="other">Другой</option>
                      </select>
                    </div>
                  </div>

                  <div className="settings-section">
                    <h3>💾 Данные</h3>
                    <div className="profile-actions">
                      <button className="btn btn-secondary" onClick={handleExport}>📥 Экспорт .json</button>
                      <label className="btn btn-secondary">📤 Импорт .json<input type="file" accept=".json" onChange={handleImport} hidden /></label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer"><p>Psycho Soc MVP v3 · {new Date().getFullYear()}</p></footer>
    </div>
  );
}

// ===== Components =====

/**
 * Радарная (звёздчатая) диаграмма для OCEAN
 * Рисуется через SVG — пять осей, каждая от 0 до 100%
 */
function RadarChart({ data, labels, order, size }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const levels = 5; // концентрические кольца: 20%, 40%, 60%, 80%, 100%
  const angleStep = (2 * Math.PI) / order.length;

  // Координаты точки
  const getPoint = (value, index) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 100) * radius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  // Путь для заливки области данных
  const dataPath = order
    .map((k, i) => {
      const p = getPoint(data[k] || 0, i);
      return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
    })
    .join(' ') + ' Z';

  // Путь для сетки (кольца)
  const gridPaths = [];
  for (let lvl = 1; lvl <= levels; lvl++) {
    const pct = (lvl / levels) * 100;
    const pts = order
      .map((k, i) => {
        const p = getPoint(pct, i);
        return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
      })
      .join(' ') + ' Z';
    gridPaths.push(pct);
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="radar-chart">
      {/* Кольца сетки */}
      {gridPaths.map((_, i) => {
        const r = ((i + 1) / levels) * radius;
        const pts = order
          .map((k, idx) => {
            const a = angleStep * idx - Math.PI / 2;
            return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
          })
          .join(' ');
        return (
          <polygon
            key={i}
            points={pts}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
            opacity={0.5}
          />
        );
      })}

      {/* Оси */}
      {order.map((k, i) => {
        const p = getPoint(100, i);
        return (
          <line
            key={k}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="var(--border)"
            strokeWidth={1}
            opacity={0.6}
          />
        );
      })}

      {/* Область данных */}
      <polygon
        points={order
          .map((k, i) => {
            const p = getPoint(data[k] || 0, i);
            return `${p.x},${p.y}`;
          })
          .join(' ')}
        fill="rgba(124, 92, 252, 0.2)"
        stroke="#8f6fff"
        strokeWidth={2}
      />

      {/* Точки данных */}
      {order.map((k, i) => {
        const p = getPoint(data[k] || 0, i);
        return <circle key={k} cx={p.x} cy={p.y} r={4} fill="#8f6fff" stroke="#fff" strokeWidth={1.5} />;
      })}

      {/* Подписи осей */}
      {order.map((k, i) => {
        const p = getPoint(120, i);
        return (
          <text key={k} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fill="var(--text-muted)" fontSize={11} fontWeight={500}>
            {labels[k]}
          </text>
        );
      })}
    </svg>
  );
}

function ResultPreview({ result }) {
  const d = result.processedResult;
  if (result.testId === 'mbti') return <span className="preview-type">{d?.type || '?'}</span>;
  if (result.testId === 'enneagram') return <span className="preview-type">{d?.wingLabel || '?'}</span>;
  const entries = Object.entries(d || {});
  return <span className="preview-type">{entries[0]?.[1]}%</span>;
}

function ResultViewer({ result, compact }) {
  const { processedResult: d } = result;

  if (result.testId === 'ocean') {
    const labels = { openness: 'Открытость', conscientiousness: 'Добросовестность', extraversion: 'Экстраверсия', agreeableness: 'Доброжелательность', neuroticism: 'Нейротизм' };
    const order = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
    const radarColors = ['#74b9ff', '#00b894', '#fdcb6e', '#e17055', '#6c5ce7'];
    return (
      <div className="ocean-result">
        <RadarChart data={d} labels={labels} order={order} size={compact ? 240 : 280} />
        <div className="ocean-legend">
          {order.map((k, i) => (
            <div key={k} className="legend-item">
              <span className="legend-dot" style={{ background: radarColors[i] }} />
              <span className="legend-label">{labels[k]}</span>
              <span className="legend-value">{d[k]}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (result.testId === 'dark-triad') {
    const labels = { machiavellianism: 'Макиавеллизм', narcissism: 'Нарциссизм', psychopathy: 'Психопатия' };
    const colors = ['#d63031', '#e17055', '#6c5ce7'];
    return (
      <div className="result-chart">
        {Object.entries(d).map(([k, v], i) => (
          <div key={k} className="bar-item">
            <div className="bar-label"><span>{labels[k] || k}</span><span>{v}%</span></div>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${v}%`, background: colors[i % colors.length] }} /></div>
          </div>
        ))}
      </div>
    );
  }

  if (result.testId === 'mbti') {
    return (
      <div className="mbti-result">
        <div className="mbti-big">{d.type}</div>
        <div className="functions-grid">
          {Object.entries(d.functions || {}).map(([k, v]) => (
            <div key={k} className="func-item"><span className="func-role">{k}</span><span className="func-code">{v}</span></div>
          ))}
        </div>
      </div>
    );
  }

  if (result.testId === 'enneagram') {
    return (
      <div className="enneagram-result">
        <div className="enneagram-big">{d.wingLabel}</div>
        <p><strong>Тип:</strong> {d.description?.name}</p>
        <p><strong>Страсть:</strong> {d.description?.passion}</p>
        <p><strong>Страх:</strong> {d.description?.fear}</p>
      </div>
    );
  }

  return <pre>{JSON.stringify(d, null, 2)}</pre>;
}