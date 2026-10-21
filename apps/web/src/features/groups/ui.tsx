import { heatColor, type Pair } from './compare'
import type { Member } from './types'

export const nameOf = (m: Pick<Member, 'username' | 'display_name'>) => m.display_name || m.username

export function nameMap(members: Member[]): Map<string, string> {
  return new Map(members.map((m) => [m.user_id, nameOf(m)]))
}

export function ScoreBadge({ score }: { score: number | null }) {
  return (
    <span className="inline-block min-w-[3rem] rounded px-2 py-0.5 text-center text-sm font-medium" style={{ backgroundColor: heatColor(score) }}>
      {score === null ? '—' : `${score}%`}
    </span>
  )
}

/** Список пар «Анна и Борис — 87%», самые близкие сверху */
export function PairList({ pairs, names, emptyText }: { pairs: Pair[]; names: Map<string, string>; emptyText: string }) {
  const sorted = [...pairs].sort((x, y) => (y.score ?? -1) - (x.score ?? -1))
  if (sorted.length === 0) return <p className="text-sm text-gray-500">{emptyText}</p>
  return (
    <ul className="flex flex-col gap-1.5">
      {sorted.map((p) => (
        <li key={`${p.a}|${p.b}`} className="flex items-center gap-3 text-sm">
          <ScoreBadge score={p.score} />
          <span>
            {names.get(p.a) ?? '?'} и {names.get(p.b) ?? '?'}
          </span>
          <span className="text-xs text-gray-400">
            {p.score === null ? `мало общего (${p.common})` : `общих: ${p.common}`}
          </span>
        </li>
      ))}
    </ul>
  )
}
