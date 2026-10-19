import { useEffect, useRef, useState } from 'react'
import AddItemForm from '../catalog/AddItemForm'
import { browseItems, fetchCategories } from '../catalog/api'
import ItemImage from '../catalog/ItemImage'
import type { CatalogItem, Category } from '../catalog/types'
import { addEntry } from './api'

/** Поиск по общему каталогу и добавление найденного в банк тир-листа */
export default function AddEntries({
  listId,
  existingItemIds,
  poolLength,
  onChanged,
}: {
  listId: string
  existingItemIds: Set<string>
  poolLength: number
  onChanged: () => Promise<void>
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [category, setCategory] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [items, setItems] = useState<CatalogItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const added = useRef(0) // сколько добавили за сессию: чтобы позиции в банке не совпадали

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    let cancelled = false
    browseItems({ category, query: debounced, limit: 20, offset: 0 })
      .then((rows) => {
        if (!cancelled) setItems(rows)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [category, debounced, reloadKey])

  async function add(item: CatalogItem) {
    setBusy(true)
    setError(null)
    try {
      await addEntry(listId, item.id, poolLength + added.current)
      added.current += 1
      await onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  const chip = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1 text-sm ${active ? 'border-violet-600 bg-violet-600 text-white' : 'border-gray-300'}`

  return (
    <div className="mb-4 rounded-lg border border-gray-200 p-4">
      <h2 className="mb-3 font-semibold">Добавить элементы из каталога</h2>
      <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
        <button type="button" className={chip(category === null)} onClick={() => setCategory(null)}>Все</button>
        {categories.map((c) => (
          <button key={c.slug} type="button" className={chip(category === c.slug)} onClick={() => setCategory(c.slug)}>
            {c.emoji} {c.name}
          </button>
        ))}
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Найти в каталоге…"
        className="mb-3 w-full rounded border border-gray-300 p-2"
      />
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <ul className="mb-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
        {items.map((it) => {
          const inList = existingItemIds.has(it.id)
          return (
            <li key={it.id} className="flex items-center gap-3">
              <ItemImage key={it.image_url ?? 'none'} url={it.image_url} emoji={it.category_emoji} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{it.title}</p>
                {it.subtitle && <p className="truncate text-xs text-gray-500">{it.subtitle}</p>}
              </div>
              <button
                type="button"
                disabled={busy || inList}
                onClick={() => add(it)}
                className="rounded border border-violet-600 px-2 py-1 text-sm text-violet-700 disabled:border-gray-300 disabled:text-gray-400"
              >
                {inList ? 'В списке' : '＋'}
              </button>
            </li>
          )
        })}
        {items.length === 0 && <li className="text-sm text-gray-500">Ничего не найдено.</li>}
      </ul>

      {showForm ? (
        <AddItemForm
          categories={categories}
          defaultCategorySlug={category}
          defaultTitle={query.trim()}
          onCancel={() => setShowForm(false)}
          onCreated={(slug, title) => {
            setShowForm(false)
            setCategory(slug)
            setQuery(title)
            setDebounced(title)
            setReloadKey((k) => k + 1)
          }}
        />
      ) : (
        <button type="button" onClick={() => setShowForm(true)} className="text-sm text-violet-700 underline">
          Нет нужного? Создать новый элемент в каталоге
        </button>
      )}
    </div>
  )
}
