import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { listTierLists } from '../tierlists/api'
import type { TierListSummary } from '../tierlists/types'
import { setGroupTierlist } from './api'
import { compareTiers, heatColor } from './compare'
import type { GroupData } from './types'
import { PairList, nameMap } from './ui'

export default function TierListsTab({ data, onChanged }: { data: GroupData; onChanged: () => Promise<void> }) {
  const { user } = useAuth()
  const names = useMemo(() => nameMap(data.members), [data.members])
  const [mine, setMine] = useState<TierListSummary[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    listTierLists(user.id).then(setMine).catch(() => setMine([]))
  }, [user])

  const attached = new Set(data.attachments.filter((a) => a.user_id === user?.id).map((a) => a.tierlist_id))

  async function toggle(id: string, on: boolean) {
    setBusy(true)
    setError(null)
    try {
      await setGroupTierlist(data.id, id, on)
      await onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  // общие элементы: оценённые в тир-листах хотя бы двумя участниками
  const memberIds = data.members.filter((m) => m.status === 'joined').map((m) => m.user_id)
  const rows = useMemo(() => {
    const byItem = new Map<string, { id: string; title: string; emoji: string; cells: Map<string, { label: string; score: number }> }>()
    for (const r of data.tiers) {
      let it = byItem.get(r.item_id)
      if (!it) {
        it = { id: r.item_id, title: r.title, emoji: r.category_emoji, cells: new Map() }
        byItem.set(r.item_id, it)
      }
      const prev = it.cells.get(r.user_id)
      it.cells.set(r.user_id, prev ? { label: `${prev.label}/${r.tier_label}`, score: (prev.score + r.tier_score) / 2 } : { label: r.tier_label, score: r.tier_score })
    }
    return [...byItem.values()].filter((i) => i.cells.size >= 2).sort((a, b) => a.title.localeCompare(b.title, 'ru'))
  }, [data.tiers])

  const pairs = useMemo(() => compareTiers(data.tiers), [data.tiers])
  const withLists = new Set(data.tiers.map((t) => t.user_id))

  return (
    <div>
      <section className="mb-6 rounded-lg border border-gray-200 p-4">
        <h2 className="mb-1 font-semibold">Мои тир-листы в этой группе</h2>
        <p className="mb-3 text-xs text-gray-500">
          Прикреплённый тир-лист (даже приватный) видят участники группы — только расстановку по тирам. Открепить можно в любой момент.
        </p>
        {mine.length === 0 ? (
          <p className="text-sm text-gray-600">У вас пока нет тир-листов.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {mine.map((l) => (
              <li key={l.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={attached.has(l.id)} disabled={busy} onChange={(e) => toggle(l.id, e.target.checked)} />
                  {l.title} <span className="text-xs text-gray-400">({l.entries_count} элем.)</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      {withLists.size < 2 ? (
        <p className="text-sm text-gray-600">Чтобы сравнивать, хотя бы двое участников должны прикрепить тир-листы с общими элементами.</p>
      ) : (
        <>
          <section className="mb-6">
            <h2 className="mb-2 font-semibold">Совпадение расстановки</h2>
            <PairList pairs={pairs} names={names} emptyText="Нет данных" />
            <p className="mt-1 text-xs text-gray-400">Верхний тир = 1, нижний = 0; нужно минимум 3 общих элемента.</p>
          </section>
          <section>
            <h2 className="mb-2 font-semibold">Общие элементы</h2>
            {rows.length === 0 ? (
              <p className="text-sm text-gray-600">Пока нет элементов, которые стоят в тир-листах хотя бы у двоих.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="p-1.5">Элемент</th>
                      {memberIds.map((id) => (
                        <th key={id} className="p-1.5 font-medium">{names.get(id)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t border-gray-100">
                        <td className="p-1.5">{r.emoji} {r.title}</td>
                        {memberIds.map((id) => {
                          const c = r.cells.get(id)
                          return (
                            <td key={id} className="p-1 text-center">
                              {c ? (
                                <span className="inline-block min-w-[2rem] rounded px-1.5 py-0.5 font-medium" style={{ backgroundColor: heatColor(Math.round(c.score * 100)) }}>
                                  {c.label}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
