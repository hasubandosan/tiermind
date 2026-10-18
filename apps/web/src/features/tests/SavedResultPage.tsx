import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { fetchMyLatestResult, updateResultVisibility, type SavedResult } from './api'
import { getTest } from './registry'
import ResultView from './ResultView'
import VisibilitySelect from './VisibilitySelect'
import type { Visibility } from './types'

export default function SavedResultPage() {
  const { slug } = useParams()
  const test = slug ? getTest(slug) : undefined
  const { user } = useAuth()
  // undefined — загрузка, null — результата нет
  const [saved, setSaved] = useState<SavedResult | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !slug) return
    fetchMyLatestResult(user.id, slug)
      .then(setSaved)
      .catch((e: Error) => setError(e.message))
  }, [user, slug])

  async function changeVisibility(v: Visibility) {
    if (!saved) return
    try {
      await updateResultVisibility(saved.id, v)
      setSaved({ ...saved, visibility: v })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (!test) {
    return (
      <p className="p-6">
        Тест не найден. <Link to="/tests" className="text-violet-700 underline">К списку тестов</Link>
      </p>
    )
  }
  if (error) return <p className="p-6 text-red-600">{error}</p>
  if (saved === undefined) return <p className="p-6">Загрузка…</p>
  if (saved === null) {
    return (
      <p className="p-6">
        Вы ещё не проходили этот тест. <Link to={`/tests/${test.slug}`} className="text-violet-700 underline">Пройти</Link>
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-2xl font-bold">{test.title}</h1>
      <p className="mb-4 text-sm text-gray-500">
        Пройден {new Date(saved.taken_at).toLocaleString('ru-RU')}
        {saved.test_version !== test.version ? ' · по прежней версии теста' : ''}
      </p>
      <ResultView test={test} result={saved.scores} />
      <div className="mt-6">
        <VisibilitySelect value={saved.visibility} onChange={changeVisibility} />
      </div>
      <div className="mt-6 flex gap-4 text-sm">
        <Link to={`/tests/${test.slug}`} className="rounded bg-violet-600 px-3 py-1.5 font-medium text-white">
          Пройти заново
        </Link>
        <Link to="/tests" className="self-center text-violet-700 underline">К списку тестов</Link>
      </div>
    </div>
  )
}
