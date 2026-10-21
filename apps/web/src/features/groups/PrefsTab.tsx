import { useMemo } from 'react'
import { ratingInfo, type Rating } from '../catalog/types'
import { comparePrefs, prefHighlights, type Highlight } from './compare'
import type { GroupData } from './types'
import { PairList, nameMap } from './ui'

function HighlightList({ title, items, names }: { title: string; items: Highlight[]; names: Map<string, string> }) {
  if (items.length === 0) return null
  return (
    <section className="mb-6">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.slice(0, 12).map((h) => (
          <li key={h.item.id} className="rounded border border-gray-200 p-2 text-sm">
            <p className="font-medium">
              {h.item.category_emoji} {h.item.title}
              {h.item.subtitle && <span className="font-normal text-gray-500"> · {h.item.subtitle}</span>}
            </p>
            <p className="mt-0.5 text-xs text-gray-600">
              {h.ratings.map((r) => `${ratingInfo(r.rating as Rating).emoji} ${names.get(r.user_id) ?? '?'}`).join('   ')}
            </p>
          </li>
        ))}
        {items.length > 12 && <li className="text-xs text-gray-400">…и ещё {items.length - 12}</li>}
      </ul>
    </section>
  )
}

export default function PrefsTab({ data }: { data: GroupData }) {
  const names = useMemo(() => nameMap(data.members), [data.members])
  const hl = useMemo(() => prefHighlights(data.prefs), [data.prefs])
  const pairs = useMemo(() => comparePrefs(data.prefs), [data.prefs])
  const sharing = data.members.filter((m) => m.status === 'joined' && m.share_preferences)
  const notSharing = data.members.filter((m) => m.status === 'joined' && !m.share_preferences)

  return (
    <div>
      {sharing.length < 2 && (
        <p className="mb-4 text-sm text-gray-600">Чтобы сравнивать, хотя бы двое участников должны поделиться предпочтениями (оценками из каталога).</p>
      )}
      {sharing.length >= 2 && (
        <section className="mb-6">
          <h2 className="mb-2 font-semibold">Совпадение вкусов</h2>
          <PairList pairs={pairs} names={names} emptyText="Нет данных" />
          <p className="mt-1 text-xs text-gray-400">Считается по общим оценённым элементам; нужно минимум 3 общих.</p>
        </section>
      )}
      <HighlightList title="💞 Нравится всем" items={hl.love} names={names} />
      <HighlightList title="⚡ Спорные: кто-то обожает, кто-то не переносит" items={hl.disputed} names={names} />
      <HighlightList title="💔 Не нравится никому" items={hl.hate} names={names} />
      {sharing.length >= 2 && hl.love.length + hl.disputed.length + hl.hate.length === 0 && (
        <p className="text-sm text-gray-600">Пока нет элементов, оценённых хотя бы двумя участниками. Оценивайте элементы в каталоге!</p>
      )}
      {notSharing.length > 0 && (
        <p className="text-xs text-gray-500">Не делятся предпочтениями: {notSharing.map((m) => m.display_name || m.username).join(', ')}.</p>
      )}
    </div>
  )
}
