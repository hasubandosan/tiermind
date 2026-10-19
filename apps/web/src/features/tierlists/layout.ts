import type { Entry, Tier } from './types'

export const TIER_PREFIX = 'tier:'
export const ENTRY_PREFIX = 'entry:'
export const POOL_ID = 'pool'

export type Layout = {
  tiers: { tier: Tier; entries: Entry[] }[]
  pool: Entry[]
}

export type Move = { tierId: string | null; index: number }

const byPosition = (a: Entry, b: Entry) => a.position - b.position || a.id.localeCompare(b.id)

export function buildLayout(tiers: Tier[], entries: Entry[]): Layout {
  const sortedTiers = [...tiers].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
  const known = new Set(sortedTiers.map((t) => t.id))
  return {
    tiers: sortedTiers.map((tier) => ({
      tier,
      entries: entries.filter((e) => e.tier_id === tier.id).sort(byPosition),
    })),
    pool: entries.filter((e) => e.tier_id === null || !known.has(e.tier_id)).sort(byPosition),
  }
}

type Column = { id: string | null; entries: Entry[] }

function columnsOf(layout: Layout): Column[] {
  return [...layout.tiers.map((t) => ({ id: t.tier.id as string | null, entries: t.entries })), { id: null, entries: layout.pool }]
}

/**
 * Куда попадёт запись activeId, если бросить её на элемент overId.
 * overId: "pool" | "tier:<id>" | "entry:<id>". Возвращает null, если положение не изменится.
 * Бросок на запись = встать на её место (при перемещении внутри тира вправо — после неё).
 */
export function computeMove(layout: Layout, activeId: string, overId: string): Move | null {
  const columns = columnsOf(layout)
  const from = columns.find((c) => c.entries.some((e) => e.id === activeId))
  if (!from) return null
  const fromIndex = from.entries.findIndex((e) => e.id === activeId)

  let target: Column | undefined
  let index: number

  if (overId === POOL_ID) {
    target = columns[columns.length - 1]
    index = target.entries.filter((e) => e.id !== activeId).length
  } else if (overId.startsWith(TIER_PREFIX)) {
    const id = overId.slice(TIER_PREFIX.length)
    target = columns.find((c) => c.id === id)
    if (!target) return null
    index = target.entries.filter((e) => e.id !== activeId).length
  } else if (overId.startsWith(ENTRY_PREFIX)) {
    const overEntryId = overId.slice(ENTRY_PREFIX.length)
    if (overEntryId === activeId) return null
    target = columns.find((c) => c.entries.some((e) => e.id === overEntryId))
    if (!target) return null
    index = target.entries.findIndex((e) => e.id === overEntryId)
  } else {
    return null
  }

  if (target.id === from.id && index === fromIndex) return null
  return { tierId: target.id, index }
}

/** Локально повторяет то, что делает серверная функция move_entry (для мгновенного отклика интерфейса) */
export function applyMove(entries: Entry[], activeId: string, move: Move): Entry[] {
  const active = entries.find((e) => e.id === activeId)
  if (!active) return entries
  const oldTier = active.tier_id

  const target = entries.filter((e) => e.tier_id === move.tierId && e.id !== activeId).sort(byPosition)
  const idx = Math.min(Math.max(move.index, 0), target.length)
  target.splice(idx, 0, active)

  const updates = new Map<string, { tier_id: string | null; position: number }>()
  target.forEach((e, i) => updates.set(e.id, { tier_id: move.tierId, position: i }))
  if (oldTier !== move.tierId) {
    entries
      .filter((e) => e.tier_id === oldTier && e.id !== activeId)
      .sort(byPosition)
      .forEach((e, i) => updates.set(e.id, { tier_id: oldTier, position: i }))
  }
  return entries.map((e) => {
    const u = updates.get(e.id)
    return u ? { ...e, ...u } : e
  })
}

/** Цвет текста (чёрный/белый), читаемый на фоне hex-цвета */
export function readableTextColor(hex: string): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return '#000000'
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16))
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? '#000000' : '#ffffff'
}

/** Разбирает строку тегов «rpg, fav» в чистый массив (до 10 штук, до 30 символов) */
export function parseTags(input: string): string[] {
  const out: string[] = []
  for (const raw of input.split(/[,\n]/)) {
    const t = raw.trim().toLowerCase().slice(0, 30)
    if (t && !out.includes(t)) out.push(t)
    if (out.length >= 10) break
  }
  return out
}
