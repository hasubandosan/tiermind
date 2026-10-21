import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { createTierList, listTierLists } from './api'
import type { TierListSummary } from './types'

const VISIBILITY_LABEL = { public: 'Открытый', friends: 'Друзья', private: 'Только я' }

export function TierListCard({ list, nestedCount, showVisibility }: { list: TierListSummary; nestedCount: number; showVisibility?: boolean }) {
  return (
    <Link to={`/tierlists/${list.id}`} className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
      <p className="font-medium">
        {list.title}
        {list.is_template && <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-normal text-violet-700">шаблон</span>}
      </p>
      {list.source_template_title && <p className="text-xs text-gray-500">по шаблону «{list.source_template_title}»</p>}
      {list.note && <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{list.note}</p>}
      <p className="mt-1 text-xs text-gray-500">
        {list.entries_count} элем.
        {nestedCount > 0 ? ` · 📂 вложенных: ${nestedCount}` : ''}
        {showVisibility ? ` · ${VISIBILITY_LABEL[list.visibility]}` : ''}
      </p>
      {list.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {list.tags.map((t) => (
            <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">#{t}</span>
          ))}
        </div>
      )}
    </Link>
  )
}

/** Сколько вложенных тир-листов (прямых) у каждого списка */
export function nestedCounts(lists: TierListSummary[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const l of lists) if (l.parent_list_id) m.set(l.parent_list_id, (m.get(l.parent_list_id) ?? 0) + 1)
  return m
}

export default function TierListsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [lists, setLists] = useState<TierListSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [sort, setSort] = useState<'updated' | 'title'>('updated')

  useEffect(() => {
    if (!user) return
    listTierLists(user.id)
      .then(setLists)
      .catch((e: Error) => setError(e.message))
  }, [user])

  const counts = useMemo(() => nestedCounts(lists ?? []), [lists])
  const allTags = useMemo(() => [...new Set((lists ?? []).flatMap((l) => l.tags))].sort(), [lists])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const roots = (lists ?? []).filter((l) => l.parent_list_id === null)
    const filtered = roots.filter(
      (l) =>
        (!tag || l.tags.includes(tag)) &&
        (!q || l.title.toLowerCase().includes(q) || (l.note ?? '').toLowerCase().includes(q)),
    )
    return sort === 'title'
      ? [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'ru'))
      : filtered // сервер уже отдаёт по updated_at desc
  }, [lists, query, tag, sort])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    setBusy(true)
    setError(null)
    try {
      const id = await createTierList(t)
      navigate(`/tierlists/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  if (!lists) return <p className="p-6">{error ?? 'Загрузка…'}</p>

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Мои тир-листы</h1>

      <form onSubmit={onCreate} className="mb-6 flex gap-2">
        <input
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название нового тир-листа"
          className="flex-1 rounded border border-gray-300 p-2"
        />
        <button type="submit" disabled={busy} className="rounded bg-violet-600 px-4 font-medium text-white disabled:opacity-50">
          Создать
        </button>
      </form>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {lists.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск…"
            className="min-w-[160px] flex-1 rounded border border-gray-300 p-1.5 text-sm"
          />
          <select value={sort} onChange={(e) => setSort(e.target.value as 'updated' | 'title')} className="rounded border border-gray-300 p-1.5 text-sm">
            <option value="updated">Сначала недавние</option>
            <option value="title">По алфавиту</option>
          </select>
        </div>
      )}
      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(tag === t ? null : t)}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${tag === t ? 'border-violet-600 bg-violet-600 text-white' : 'border-gray-300'}`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {lists.length === 0 ? (
        <p className="text-sm text-gray-600">Пока нет тир-листов. Создайте первый выше.</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-gray-600">Ничего не найдено.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((l) => (
            <TierListCard key={l.id} list={l} nestedCount={counts.get(l.id) ?? 0} showVisibility />
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-gray-400">
        Здесь показаны только тир-листы верхнего уровня. Вложенные открываются из элементов внутри тир-листа (значок 📂).
      </p>
    </div>
  )
}
