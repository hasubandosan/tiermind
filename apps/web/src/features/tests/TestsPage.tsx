import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { fetchMyLatestResults, type SavedResult } from './api'
import { tests } from './registry'
import type { TestKind } from './types'

function KindBadge({ kind }: { kind: TestKind }) {
  return kind === 'scientific' ? (
    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Научный</span>
  ) : (
    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Развлекательный</span>
  )
}

export default function TestsPage() {
  const { user } = useAuth()
  const [results, setResults] = useState<Record<string, SavedResult>>({})

  useEffect(() => {
    if (!user) return
    fetchMyLatestResults(user.id)
      .then(setResults)
      .catch(() => setResults({}))
  }, [user])

  const mine = user ? results : {}

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Тесты</h1>
      <div className="flex flex-col gap-4">
        {tests.map((t) => {
          const last = mine[t.slug]
          return (
            <div key={t.slug} className="rounded-lg border border-gray-200 p-4">
              <div className="mb-1 flex items-center gap-2">
                <h2 className="text-lg font-semibold">{t.title}</h2>
                <KindBadge kind={t.kind} />
              </div>
              <p className="text-sm text-gray-700">{t.description}</p>
              {t.note && <p className="mt-1 text-xs text-gray-500">{t.note}</p>}
              <p className="mt-1 text-xs text-gray-400">
                {t.items.length} вопросов · {t.source}
              </p>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <Link to={`/tests/${t.slug}`} className="rounded bg-violet-600 px-3 py-1.5 font-medium text-white">
                  {last ? 'Пройти заново' : 'Пройти'}
                </Link>
                {last && (
                  <Link to={`/tests/${t.slug}/result`} className="text-violet-700 underline">
                    Мой результат ({new Date(last.taken_at).toLocaleDateString('ru-RU')})
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {!user && (
        <p className="mt-6 text-sm text-gray-600">
          <Link to="/login" className="text-violet-700 underline">Войдите</Link>, чтобы результаты сохранялись в профиле.
        </p>
      )}
    </div>
  )
}
