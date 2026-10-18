import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import AddItemForm from './AddItemForm'
import { browseItems, clearRating, fetchCategories, setRating } from './api'
import ItemCard from './ItemCard'
import type { CatalogItem, Category, Rating } from './types'

const PAGE = 30

export default function CatalogPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [category, setCategory] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [items, setItems] = useState<CatalogItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const requestId = useRef(0)

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const id = ++requestId.current
    setLoading(true)
    browseItems({ category, query: debounced, limit: PAGE, offset: 0 })
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
  }, [category, debounced, reloadKey, user?.id])

  async function loadMore() {
    const id = requestId.current
    try {
      const rows = await browseItems({ category, query: debounced, limit: PAGE, offset: items.length })
      if (id !== requestId.current) return
      setItems((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))])
      setHasMore(rows.length === PAGE)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function patchRating(itemId: string, value: Rating | null) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, my_rating: value } : i)))
  }

  async function rate(item: CatalogItem, value: Rating | null) {
    if (!user) return
    const previous = item.my_rating
    patchRating(item.id, value)
    try {
      if (value === null) await clearRating(user.id, item.id)
      else await setRating(user.id, item.id, value)
    } catch (e) {
      patchRating(item.id, previous)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function onCreated(categorySlug: string, title: string) {
    setShowForm(false)
    setCategory(categorySlug)
    setQuery(title)
    setDebounced(title)
    setReloadKey((k) => k + 1)
  }

  const chip = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
      active ? 'border-violet-600 bg-violet-600 text-white' : 'border-gray-300 hover:bg-gray-50'
    }`

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-2xl font-bold">Каталог</h1>
        {user && (
          <Link to="/preferences" className="ml-auto text-sm text-violet-700 underline">
            Мои предпочтения
          </Link>
        )}
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <button type="button" className={chip(category === null)} onClick={() => setCategory(null)}>
          Все
        </button>
        {categories.map((c) => (
          <button key={c.slug} type="button" className={chip(category === c.slug)} onClick={() => setCategory(c.slug)}>
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по названию или уточнению…"
        className="mb-4 w-full rounded border border-gray-300 p-2"
      />

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {showForm && user ? (
        <AddItemForm
          categories={categories}
          defaultCategorySlug={category}
          defaultTitle={query.trim()}
          onCreated={onCreated}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <div className="mb-4 text-sm">
          {user ? (
            <button type="button" onClick={() => setShowForm(true)} className="rounded border border-violet-600 px-3 py-1.5 font-medium text-violet-700">
              + Добавить элемент в каталог
            </button>
          ) : (
            <p className="text-gray-600">
              <Link to="/login" className="text-violet-700 underline">Войдите</Link>, чтобы оценивать и добавлять элементы.
            </p>
          )}
        </div>
      )}

      {loading && items.length === 0 ? (
        <p className="text-sm text-gray-500">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600">
          Ничего не найдено.{user ? ' Добавьте этот элемент первым — кнопка выше.' : ''}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} canRate={!!user} showCategory={category === null} onRate={rate} />
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
