import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../../components/Avatar'
import { acceptFriendRequest, fetchMyFriendships, removeFriendship, type FriendEntry } from './api'

function Row({ entry, children }: { entry: FriendEntry; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
      <Avatar name={entry.display_name || entry.username} />
      <Link to={`/u/${entry.username}`} className="flex-1">
        <p className="font-medium">{entry.display_name || entry.username}</p>
        <p className="text-sm text-gray-500">@{entry.username}</p>
      </Link>
      <div className="flex gap-2 text-sm">{children}</div>
    </li>
  )
}

export default function FriendsPage() {
  const [entries, setEntries] = useState<FriendEntry[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setEntries(await fetchMyFriendships())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    await reload()
    setBusy(false)
  }

  if (!entries) return <p className="p-6">{error ?? 'Загрузка…'}</p>

  const incoming = entries.filter((e) => e.status === 'pending' && !e.i_am_requester)
  const friends = entries.filter((e) => e.status === 'accepted')
  const outgoing = entries.filter((e) => e.status === 'pending' && e.i_am_requester)
  const btn = 'rounded border border-gray-300 px-2 py-1 disabled:opacity-50'

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Друзья</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {incoming.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-semibold">Входящие заявки ({incoming.length})</h2>
          <ul className="flex flex-col gap-2">
            {incoming.map((e) => (
              <Row key={e.friendship_id} entry={e}>
                <button type="button" disabled={busy} className="rounded bg-violet-600 px-2 py-1 text-white disabled:opacity-50" onClick={() => run(() => acceptFriendRequest(e.friendship_id))}>
                  Принять
                </button>
                <button type="button" disabled={busy} className={btn} onClick={() => run(() => removeFriendship(e.friendship_id))}>
                  Отклонить
                </button>
              </Row>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Мои друзья ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-gray-600">
            Пока никого. <Link to="/people" className="text-violet-700 underline">Найти людей</Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {friends.map((e) => (
              <Row key={e.friendship_id} entry={e}>
                <button type="button" disabled={busy} className={btn} onClick={() => run(() => removeFriendship(e.friendship_id))}>
                  Удалить
                </button>
              </Row>
            ))}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Отправленные заявки ({outgoing.length})</h2>
          <ul className="flex flex-col gap-2">
            {outgoing.map((e) => (
              <Row key={e.friendship_id} entry={e}>
                <button type="button" disabled={busy} className={btn} onClick={() => run(() => removeFriendship(e.friendship_id))}>
                  Отменить
                </button>
              </Row>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
