import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { saveResult, updateResultVisibility, type SavedResult } from './api'
import { getTest } from './registry'
import { scoreTest } from './scoring'
import ResultView from './ResultView'
import VisibilitySelect from './VisibilitySelect'
import type { Answers, Test, TestResult, Visibility } from './types'

const LIKERT = ['Совсем не согласен', 'Скорее не согласен', 'Затрудняюсь ответить', 'Скорее согласен', 'Полностью согласен']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function Runner({ test, onRestart }: { test: Test; onRestart: () => void }) {
  const { user } = useAuth()
  // Вопросы перемешиваем, чтобы вопросы одной шкалы не шли подряд
  const [order] = useState(() => shuffle(test.items))
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [result, setResult] = useState<TestResult | null>(null)
  const [saved, setSaved] = useState<SavedResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function persist(r: TestResult, a: Answers) {
    if (!user) return
    setSaving(true)
    setSaveError(null)
    try {
      setSaved(await saveResult(user.id, test, a, r))
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    }
    setSaving(false)
  }

  function answer(value: number) {
    const item = order[index]
    const next = { ...answers, [item.id]: value }
    setAnswers(next)
    if (index + 1 < order.length) {
      setIndex(index + 1)
      return
    }
    const r = scoreTest(test, next)
    setResult(r)
    void persist(r, next)
  }

  async function changeVisibility(v: Visibility) {
    if (!saved) return
    try {
      await updateResultVisibility(saved.id, v)
      setSaved({ ...saved, visibility: v })
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="mb-1 text-2xl font-bold">{test.title}</h1>
        <p className="mb-4 text-sm text-gray-500">
          {test.kind === 'scientific' ? 'Научный тест' : 'Развлекательный тест'}
          {test.note ? ` · ${test.note}` : ''}
        </p>
        <ResultView test={test} result={result} />

        <div className="mt-6 rounded border border-gray-200 p-3 text-sm">
          {!user && (
            <p>
              Результат не сохранён. <Link to="/login" className="text-violet-700 underline">Войдите</Link>, чтобы
              сохранять результаты (эту страницу при этом лучше не закрывать).
            </p>
          )}
          {user && saving && <p>Сохраняю результат…</p>}
          {user && saveError && (
            <p className="text-red-600">
              Не удалось сохранить: {saveError}{' '}
              {!saved && (
                <button type="button" onClick={() => persist(result, answers)} className="underline">
                  Повторить
                </button>
              )}
            </p>
          )}
          {user && saved && (
            <div className="flex flex-col gap-2">
              <p className="text-green-700">Результат сохранён в вашем профиле.</p>
              <VisibilitySelect value={saved.visibility} onChange={changeVisibility} />
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-4 text-sm">
          <button type="button" onClick={onRestart} className="rounded bg-violet-600 px-3 py-1.5 font-medium text-white">
            Пройти заново
          </button>
          <Link to="/tests" className="self-center text-violet-700 underline">К списку тестов</Link>
        </div>
      </div>
    )
  }

  const item = order[index]
  const values = Array.from({ length: test.scaleMax - test.scaleMin + 1 }, (_, i) => test.scaleMin + i)
  const progress = Math.round((index / order.length) * 100)

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-xl font-bold">{test.title}</h1>
      <p className="mb-2 text-sm text-gray-500">
        Вопрос {index + 1} из {order.length}
      </p>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full bg-violet-600" style={{ width: `${progress}%` }} />
      </div>

      <p className="mb-6 text-lg">{item.text}</p>

      <div className="flex flex-col gap-2">
        {values.map((v, i) => (
          <button
            key={v}
            type="button"
            onClick={() => answer(v)}
            className={`rounded border p-3 text-left ${
              answers[item.id] === v ? 'border-violet-600 bg-violet-50' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {LIKERT[i] ?? String(v)}
          </button>
        ))}
      </div>

      <div className="mt-6 flex gap-4 text-sm">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
          className="text-violet-700 underline disabled:opacity-40"
        >
          ← Назад
        </button>
        <Link to="/tests" className="text-gray-500 underline">Выйти из теста</Link>
      </div>
    </div>
  )
}

export default function TestRunnerPage() {
  const { slug } = useParams()
  const test = slug ? getTest(slug) : undefined
  const [attempt, setAttempt] = useState(0)

  if (!test) {
    return (
      <p className="p-6">
        Тест не найден. <Link to="/tests" className="text-violet-700 underline">К списку тестов</Link>
      </p>
    )
  }
  return <Runner key={attempt} test={test} onRestart={() => setAttempt((a) => a + 1)} />
}
