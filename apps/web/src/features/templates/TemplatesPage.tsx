import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { listTemplates } from '../tierlists/api'
import type { TemplateCard } from '../tierlists/types'

const PAGE = 24

export function TemplateCardView({ t }: { t: TemplateCard }) {
  return (
    <Link to={`/templates/${t.id}`} className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
      <p className="font-medium">{t.title}</p>
      {t.note && <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{t.note}</p>}
      <p className="mt-1 text-xs text-gray-500">
        @{t.owner_username} · {t.entries_count} элем. · прошли: {t.passes_count}
        {t.visibility === 'friends' ? ' · для друзей' : ''}
      </p>
      {t.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {t.tags.map((g) => (
            <span key={g} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">#{g}</span>
          ))}
        </div>
      )}
      {t.my_pass_id && <p className="mt-2 text-xs text-green-700">✓ вы проходили этот шаблон</p>}
    </Link>
  )
}

export default function TemplatesPage() {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [sort, setSort] = useState<'popular' | 'new'>('popular')
  const [items, setItems] = useState<TemplateCard[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const id = ++requestId.current
    setLoading(true)
    listTemplates({ query: debounced, tag, sort, limit: PAGE, offset: 0 })
      .then((rows) => {
        if (id !== requestId.current) return
        setItems(rows)
        setHasMore(rows.length === PAGE)
        setError(null)
      })
      .catch((e: Error) => {
        if (id === requestId.current) setError(e.message)
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false)
      })
  }, [debounced, tag, sort])

  async function loadMore() {
    const id = requestId.current
    try {
      const rows = await listTemplates({ query: debounced, tag, sort, limit: PAGE, offset: items.length })
      if (id !== requestId.current) return
      setItems((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))])
      setHasMore(rows.length === PAGE)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const tags = [...new Set(items.flatMap((t) => t.tags))].sort()

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold">Шаблоны тир-листов</h1>
      <p className="mb-4 text-sm text-gray-600">
        Выберите шаблон и расставьте элементы по-своему, а потом сравните с другими. Свой шаблон можно создать из любого тир-листа:{' '}
        <Link to="/tierlists" className="text-violet-700 underline">Тир-листы → Настройки → «Сделать шаблоном»</Link>.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по названию и описанию…"
          className="min-w-[180px] flex-1 rounded border border-gray-300 p-2 text-sm"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as 'popular' | 'new')} className="rounded border border-gray-300 p-2 text-sm">
          <option value="popular">Популярные</option>
          <option value="new">Новые</option>
        </select>
      </div>
      {(tags.length > 0 || tag) && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tag && !tags.includes(tag) && (
            <button type="button" onClick={() => setTag(null)} className="rounded-full border border-violet-600 bg-violet-600 px-2.5 py-0.5 text-xs text-white">#{tag} ×</button>
          )}
          {tags.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setTag(tag === g ? null : g)}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${tag === g ? 'border-violet-600 bg-violet-600 text-white' : 'border-gray-300'}`}
            >
              #{g}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading && items.length === 0 ? (
        <p className="text-sm text-gray-500">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600">Шаблонов не найдено.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((t) => (
              <TemplateCardView key={t.id} t={t} />
            ))}
          </div>
          {hasMore && (
            <button type="button" onClick={loadMore} className="mt-4 rounded border border-gray-300 px-4 py-2 text-sm">
              Показать ещё
            </button>
          )}
        </>
      )}
    </div>
  )
}
