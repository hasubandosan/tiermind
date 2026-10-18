import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../../components/Avatar'
import { searchProfiles, type PersonHit } from './api'

export default function PeoplePage() {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<PersonHit[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (q.trim().length < 2) {
      setError('Введите минимум 2 символа')
      return
    }
    setBusy(true)
    try {
      setHits(await searchProfiles(q))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Люди</h1>
      <form onSubmit={onSubmit} className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ник или имя"
          className="flex-1 rounded border border-gray-300 p-2"
        />
        <button type="submit" disabled={busy} className="rounded bg-violet-600 px-4 font-medium text-white disabled:opacity-50">
          {busy ? 'Ищу…' : 'Найти'}
        </button>
      </form>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {hits && hits.length === 0 && <p className="text-sm text-gray-600">Никого не найдено.</p>}
      <ul className="flex flex-col gap-2">
        {hits?.map((h) => (
          <li key={h.id}>
            <Link
              to={`/u/${h.username}`}
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
            >
              <Avatar name={h.display_name || h.username} />
              <div>
                <p className="font-medium">{h.display_name || h.username}</p>
                <p className="text-sm text-gray-500">
                  @{h.username}
                  {h.visibility === 'friends' ? ' · профиль только для друзей' : ''}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
