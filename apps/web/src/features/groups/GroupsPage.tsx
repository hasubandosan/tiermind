import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createGroup, myGroups, respondInvite } from './api'
import type { GroupSummary } from './types'

function InviteCard({ group, onDone }: { group: GroupSummary; onDone: () => Promise<void> }) {
  const [shareTests, setShareTests] = useState(false)
  const [sharePrefs, setSharePrefs] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function answer(accept: boolean) {
    setBusy(true)
    setError(null)
    try {
      await respondInvite(group.id, accept, shareTests, sharePrefs)
      await onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="font-medium">{group.name}</p>
      <p className="mb-3 text-sm text-gray-600">Вас приглашает @{group.owner_username}</p>
      <p className="mb-1 text-xs text-gray-600">Чем вы поделитесь с участниками группы (по умолчанию ничем; можно изменить позже):</p>
      <label className="mb-1 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={shareTests} onChange={(e) => setShareTests(e.target.checked)} /> Результаты тестов
      </label>
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={sharePrefs} onChange={(e) => setSharePrefs(e.target.checked)} /> Оценки из каталога
      </label>
      <div className="flex gap-3">
        <button type="button" disabled={busy} onClick={() => answer(true)} className="rounded bg-violet-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          Принять
        </button>
        <button type="button" disabled={busy} onClick={() => answer(false)} className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50">
          Отклонить
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export default function GroupsPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<GroupSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [shareTests, setShareTests] = useState(true)
  const [sharePrefs, setSharePrefs] = useState(true)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      setGroups(await myGroups())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    setBusy(true)
    setError(null)
    try {
      const id = await createGroup(n, shareTests, sharePrefs)
      navigate(`/groups/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  if (!groups) return <p className="p-6">{error ?? 'Загрузка…'}</p>
  const invites = groups.filter((g) => g.my_status === 'invited')
  const joined = groups.filter((g) => g.my_status === 'joined')

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Группы сравнения</h1>
      <p className="mb-6 text-sm text-gray-600">
        Соберите друзей в группу и сравните результаты тестов, вкусы и тир-листы. Каждый сам решает, чем делиться.
      </p>

      {invites.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-semibold">Приглашения ({invites.length})</h2>
          <div className="flex flex-col gap-3">
            {invites.map((g) => (
              <InviteCard key={g.id} group={g} onDone={reload} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Мои группы</h2>
        {joined.length === 0 ? (
          <p className="text-sm text-gray-600">Пока вы не состоите ни в одной группе.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {joined.map((g) => (
              <Link key={g.id} to={`/groups/${g.id}`} className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-gray-500">
                  Участников: {g.member_count} · владелец @{g.owner_username}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <form onSubmit={onCreate} className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 font-semibold">Новая группа</h2>
        <input
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название группы"
          className="mb-3 w-full rounded border border-gray-300 p-2"
        />
        <p className="mb-1 text-xs text-gray-600">Чем вы делитесь с группой (можно изменить потом):</p>
        <label className="mb-1 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={shareTests} onChange={(e) => setShareTests(e.target.checked)} /> Результаты тестов
        </label>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sharePrefs} onChange={(e) => setSharePrefs(e.target.checked)} /> Оценки из каталога
        </label>
        <button type="submit" disabled={busy || !name.trim()} className="rounded bg-violet-600 px-4 py-2 font-medium text-white disabled:opacity-50">
          Создать группу
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>
    </div>
  )
}
