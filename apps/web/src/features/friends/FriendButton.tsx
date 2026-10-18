import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import {
  acceptFriendRequest,
  fetchMyFriendships,
  removeFriendship,
  sendFriendRequest,
  type FriendEntry,
} from './api'

const primary = 'rounded bg-violet-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50'
const secondary = 'rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50'

export default function FriendButton({ otherUserId, onChange }: { otherUserId: string; onChange?: () => void }) {
  const { user } = useAuth()
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
    if (user) void reload()
  }, [user, reload])

  if (!user) {
    return (
      <p className="text-sm text-gray-600">
        <Link to="/login" className="text-violet-700 underline">Войдите</Link>, чтобы добавить в друзья.
      </p>
    )
  }
  if (user.id === otherUserId) return null
  if (!entries) return <p className="text-sm text-gray-500">{error ?? 'Загрузка…'}</p>

  const rel = entries.find((e) => e.user_id === otherUserId)

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
    onChange?.()
  }

  let buttons
  if (!rel) {
    buttons = (
      <button type="button" disabled={busy} className={primary} onClick={() => run(() => sendFriendRequest(user!.id, otherUserId))}>
        Добавить в друзья
      </button>
    )
  } else if (rel.status === 'accepted') {
    buttons = (
      <>
        <span className="text-sm text-green-700">Вы друзья</span>
        <button type="button" disabled={busy} className={secondary} onClick={() => run(() => removeFriendship(rel.friendship_id))}>
          Удалить из друзей
        </button>
      </>
    )
  } else if (rel.i_am_requester) {
    buttons = (
      <>
        <span className="text-sm text-gray-600">Заявка отправлена</span>
        <button type="button" disabled={busy} className={secondary} onClick={() => run(() => removeFriendship(rel.friendship_id))}>
          Отменить
        </button>
      </>
    )
  } else {
    buttons = (
      <>
        <button type="button" disabled={busy} className={primary} onClick={() => run(() => acceptFriendRequest(rel.friendship_id))}>
          Принять заявку
        </button>
        <button type="button" disabled={busy} className={secondary} onClick={() => run(() => removeFriendship(rel.friendship_id))}>
          Отклонить
        </button>
      </>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">{buttons}</div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
