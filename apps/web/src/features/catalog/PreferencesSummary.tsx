import { groupPreferences } from './group'
import { ratingInfo, type PreferenceRow } from './types'

const LIMIT = 12

export default function PreferencesSummary({ rows }: { rows: PreferenceRow[] }) {
  const groups = groupPreferences(rows)
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.category.slug}>
          <p className="mb-1 text-sm font-medium">
            {g.category.emoji} {g.category.name} <span className="text-gray-400">({g.rows.length})</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {g.rows.slice(0, LIMIT).map((r) => (
              <span
                key={r.item.id}
                title={`${ratingInfo(r.rating).label}${r.item.subtitle ? ` · ${r.item.subtitle}` : ''}`}
                className="rounded-full border border-gray-200 px-2.5 py-0.5 text-sm"
              >
                {ratingInfo(r.rating).emoji} {r.item.title}
              </span>
            ))}
            {g.rows.length > LIMIT && <span className="px-1 py-0.5 text-sm text-gray-400">…и ещё {g.rows.length - LIMIT}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
