import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { fetchMyFriendships, type FriendEntry } from '../friends/api'
import { deleteGroup, inviteToGroup, leaveGroup, removeMember, renameGroup, updateSharing } from './api'
import type { GroupData } from './types'
import { nameOf } from './ui'

export default function MembersTab({ data, onChanged }: { data: GroupData; onChanged: () => Promise<void> }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const me = data.members.find((m) => m.user_id === user?.id)
  const isOwner = data.owner_id === user?.id
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [pick, setPick] = useState('')
  const [name, setName] = useState(data.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOwner) return
    fetchMyFriendships()
      .then((all) => setFriends(all.filter((f) => f.status === 'accepted')))
      .catch(() => setFriends([]))
  }, [isOwner])

  async function run(action: () => Promise<void>, after?: () => void) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onChanged()
      after?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  const memberIds = new Set(data.members.map((m) => m.user_id))
  const invitable = friends.filter((f) => !memberIds.has(f.user_id))
  const btn = 'rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50'

  return (
    <div>
      {me && (
        <div className="mb-6 rounded-lg border border-gray-200 p-4">
          <h2 className="mb-1 font-semibold">Чем я делюсь с этой группой</h2>
          <p className="mb-3 text-xs text-gray-500">Остальные участники видят только отмеченное. Это можно изменить в любой момент. Обычная приватность вашего профиля не меняется.</p>
          <label className="mb-1 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={me.share_tests} disabled={busy} onChange={(e) => run(() => updateSharing(data.id, e.target.checked, me.share_preferences))} />
            Последние результаты тестов
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={me.share_preferences} disabled={busy} onChange={(e) => run(() => updateSharing(data.id, me.share_tests, e.target.checked))} />
            Мои оценки из каталога (предпочтения)
          </label>
          <p className="mt-2 text-xs text-gray-500">Тир-листы прикрепляются по одному на вкладке «Тир-листы».</p>
        </div>
      )}

      <h2 className="mb-2 font-semibold">Участники ({data.members.length})</h2>
      <ul className="mb-6 flex flex-col gap-2">
        {data.members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3 rounded border border-gray-200 p-2 text-sm">
            <span className="flex-1">
              <b>{nameOf(m)}</b> <span className="text-gray-500">@{m.username}</span>
              {m.is_owner && <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-700">владелец</span>}
              {m.status === 'invited' && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">приглашён</span>}
            </span>
            {isOwner && !m.is_owner && (
              <button
                type="button"
                disabled={busy}
                className={btn}
                onClick={() => {
                  if (window.confirm(`Убрать ${nameOf(m)} из группы?`)) void run(() => removeMember(data.id, m.user_id))
                }}
              >
                {m.status === 'invited' ? 'Отозвать' : 'Убрать'}
              </button>
            )}
          </li>
        ))}
      </ul>

      {isOwner && (
        <div className="mb-6 rounded-lg border border-gray-200 p-4">
          <h2 className="mb-2 font-semibold">Пригласить друга</h2>
          {invitable.length === 0 ? (
            <p className="text-sm text-gray-600">Некого приглашать: в группу можно звать только друзей, которых в ней ещё нет.</p>
          ) : (
            <div className="flex gap-2">
              <select value={pick} onChange={(e) => setPick(e.target.value)} className="flex-1 rounded border border-gray-300 p-2 text-sm">
                <option value="">Выберите друга…</option>
                {invitable.map((f) => (
                  <option key={f.user_id} value={f.user_id}>
                    {f.display_name || f.username} (@{f.username})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || !pick}
                onClick={() => run(() => inviteToGroup(data.id, pick), () => setPick(''))}
                className="rounded bg-violet-600 px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                Пригласить
              </button>
            </div>
          )}
        </div>
      )}

      {isOwner ? (
        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="mb-2 font-semibold">Управление группой</h2>
          <div className="mb-3 flex gap-2">
            <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="flex-1 rounded border border-gray-300 p-2 text-sm" />
            <button type="button" disabled={busy || !name.trim() || name.trim() === data.name} className={btn} onClick={() => run(() => renameGroup(data.id, name.trim()))}>
              Переименовать
            </button>
          </div>
          <button
            type="button"
            disabled={busy}
            className="text-sm text-red-600 underline disabled:opacity-50"
            onClick={() => {
              if (window.confirm(`Удалить группу «${data.name}»? Это действие нельзя отменить.`)) void run(() => deleteGroup(data.id), () => navigate('/groups'))
            }}
          >
            Удалить группу
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          className="text-sm text-red-600 underline disabled:opacity-50"
          onClick={() => {
            if (window.confirm('Выйти из группы? Ваши данные перестанут быть видны участникам.')) void run(() => leaveGroup(data.id), () => navigate('/groups'))
          }}
        >
          Выйти из группы
        </button>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
