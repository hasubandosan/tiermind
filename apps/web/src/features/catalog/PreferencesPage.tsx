import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import {
  clearRating,
  fetchMyPreferencesVisibility,
  fetchPreferencesOf,
  setMyPreferencesVisibility,
  setRating,
} from './api'
import { groupPreferences } from './group'
import ItemCard from './ItemCard'
import type { CatalogItem, PreferenceRow, PrefVisibility, Rating } from './types'

function toItem(row: PreferenceRow): CatalogItem {
  return {
    id: row.item.id,
    category_slug: row.item.category.slug,
    category_name: row.item.category.name,
    category_emoji: row.item.category.emoji,
    title: row.item.title,
    subtitle: row.item.subtitle,
    image_url: row.item.image_url,
    created_by: null,
    my_rating: row.rating,
  }
}

export default function PreferencesPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<PreferenceRow[] | null>(null)
  const [visibility, setVisibility] = useState<PrefVisibility>('private')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchPreferencesOf(user.id)
      .then(setRows)
      .catch((e: Error) => setError(e.message))
    fetchMyPreferencesVisibility(user.id)
      .then(setVisibility)
      .catch((e: Error) => setError(e.message))
  }, [user])

  async function rate(item: CatalogItem, value: Rating | null) {
    if (!user || !rows) return
    const snapshot = rows
    setRows(
      value === null
        ? rows.filter((r) => r.item.id !== item.id)
        : rows.map((r) => (r.item.id === item.id ? { ...r, rating: value } : r)),
    )
    try {
      if (value === null) await clearRating(user.id, item.id)
      else await setRating(user.id, item.id, value)
    } catch (e) {
      setRows(snapshot)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function changeVisibility(v: PrefVisibility) {
    if (!user) return
    setError(null)
    setNote(null)
    try {
      await setMyPreferencesVisibility(user.id, v)
      setVisibility(v)
      setNote('Сохранено')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (!rows) return <p className="p-6">{error ?? 'Загрузка…'}</p>

  const groups = groupPreferences(rows)

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold">Мои предпочтения</h1>
      <p className="mb-4 text-sm text-gray-500">Оценено элементов: {rows.length}</p>

      <label className="mb-6 block text-sm">
        Кто видит мои предпочтения:{' '}
        <select
          value={visibility}
          onChange={(e) => changeVisibility(e.target.value as PrefVisibility)}
          className="ml-1 rounded border border-gray-300 p-1"
        >
          <option value="private">Только я</option>
          <option value="friends">Друзья</option>
          <option value="public">Все</option>
        </select>
        {note && <span className="ml-2 text-green-700">{note}</span>}
      </label>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {groups.length === 0 ? (
        <p className="text-sm text-gray-600">
          Пока ничего не оценено. <Link to="/catalog" className="text-violet-700 underline">Открыть каталог</Link>
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.category.slug} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">
              {g.category.emoji} {g.category.name} ({g.rows.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.rows.map((r) => (
                <ItemCard key={r.item.id} item={toItem(r)} canRate onRate={rate} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
