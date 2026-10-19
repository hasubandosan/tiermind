import { useState } from 'react'
import { addTier, deleteTier, reorderTiers, updateTier } from './api'
import type { Tier } from './types'

function TierEditor({
  tier,
  isFirst,
  isLast,
  disabled,
  onSave,
  onUp,
  onDown,
  onDelete,
}: {
  tier: Tier
  isFirst: boolean
  isLast: boolean
  disabled: boolean
  onSave: (patch: { label?: string; color?: string }) => void
  onUp: () => void
  onDown: () => void
  onDelete: () => void
}) {
  const [label, setLabel] = useState(tier.label)
  const [color, setColor] = useState(tier.color)

  function commit() {
    const patch: { label?: string; color?: string } = {}
    const l = label.trim()
    if (l && l !== tier.label) patch.label = l
    if (color !== tier.color) patch.color = color
    if (!l) setLabel(tier.label)
    if (Object.keys(patch).length) onSave(patch)
  }

  const small = 'rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-30'
  return (
    <div className="flex items-center gap-2">
      <input
        value={label}
        maxLength={20}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={commit}
        className="w-28 rounded border border-gray-300 p-1.5 text-sm"
      />
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} onBlur={commit} className="h-8 w-10 cursor-pointer rounded border border-gray-300" />
      <button type="button" className={small} disabled={disabled || isFirst} onClick={onUp} aria-label="Выше">↑</button>
      <button type="button" className={small} disabled={disabled || isLast} onClick={onDown} aria-label="Ниже">↓</button>
      <button type="button" className={`${small} text-red-600`} disabled={disabled} onClick={onDelete} aria-label="Удалить тир">✕</button>
    </div>
  )
}

export default function TierSettings({
  listId,
  tiers,
  onChanged,
}: {
  listId: string
  tiers: Tier[]
  onChanged: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#c4b5fd')
  const sorted = [...tiers].sort((a, b) => a.position - b.position)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  function move(index: number, delta: -1 | 1) {
    const ids = sorted.map((t) => t.id)
    const j = index + delta
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    void run(() => reorderTiers(listId, ids))
  }

  return (
    <div className="mb-4 rounded-lg border border-gray-200 p-4">
      <h2 className="mb-3 font-semibold">Тиры</h2>
      <div className="flex flex-col gap-2">
        {sorted.map((t, i) => (
          <TierEditor
            key={`${t.id}:${t.label}:${t.color}`}
            tier={t}
            isFirst={i === 0}
            isLast={i === sorted.length - 1}
            disabled={busy}
            onSave={(patch) => run(() => updateTier(t.id, patch))}
            onUp={() => move(i, -1)}
            onDown={() => move(i, 1)}
            onDelete={() => {
              if (window.confirm(`Удалить тир «${t.label}»? Его элементы вернутся в банк.`)) void run(() => deleteTier(t.id))
            }}
          />
        ))}
      </div>
      <form
        className="mt-4 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const label = newLabel.trim()
          if (!label) return
          void run(async () => {
            await addTier(listId, label, newColor, sorted.length)
            setNewLabel('')
          })
        }}
      >
        <input
          value={newLabel}
          maxLength={20}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Новый тир"
          className="w-28 rounded border border-gray-300 p-1.5 text-sm"
        />
        <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-gray-300" />
        <button type="submit" disabled={busy} className="rounded border border-violet-600 px-3 py-1 text-sm text-violet-700 disabled:opacity-50">
          ＋ Добавить
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
