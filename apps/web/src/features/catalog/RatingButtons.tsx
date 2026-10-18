import { RATINGS, ratingInfo, type Rating } from './types'

export default function RatingButtons({
  value,
  onChange,
}: {
  value: Rating | null
  onChange: (v: Rating | null) => void
}) {
  return (
    <div>
      <div className="flex gap-1">
        {RATINGS.map((r) => {
          const active = value === r.value
          return (
            <button
              key={r.value}
              type="button"
              title={r.label}
              aria-label={r.label}
              aria-pressed={active}
              onClick={() => onChange(active ? null : r.value)}
              className={`rounded border px-1.5 py-0.5 text-lg ${
                active ? 'border-violet-600 bg-violet-100' : 'border-gray-200 opacity-60 hover:opacity-100'
              }`}
            >
              {r.emoji}
            </button>
          )
        })}
      </div>
      {value !== null && <p className="mt-0.5 text-xs text-gray-500">{ratingInfo(value).label}</p>}
    </div>
  )
}
