import type { Tier } from '../tierlists/types'

export type ScoreRow = { user_id: string; item_id: string; tier_score: number }
export type ItemStat = { item_id: string; avg: number; n: number }

/**
 * «Общий тир-лист сообщества»: средняя оценка каждого элемента по открытым прохождениям
 * (1 — верхний тир, 0 — нижний). Строки — по одному на человека и элемент.
 */
export function communityStats(rows: ScoreRow[]): ItemStat[] {
  const acc = new Map<string, { sum: number; n: number }>()
  for (const r of rows) {
    const cur = acc.get(r.item_id) ?? { sum: 0, n: 0 }
    cur.sum += r.tier_score
    cur.n += 1
    acc.set(r.item_id, cur)
  }
  return [...acc.entries()]
    .map(([item_id, v]) => ({ item_id, avg: v.sum / v.n, n: v.n }))
    .sort((a, b) => b.avg - a.avg || b.n - a.n || a.item_id.localeCompare(b.item_id))
}

/** Какому тиру шаблона соответствует средняя оценка (ближайший по положению) */
export function tierForAverage(avg: number, tiers: Tier[]): Tier | null {
  if (tiers.length === 0) return null
  const sorted = [...tiers].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
  if (sorted.length === 1) return sorted[0]
  const idx = Math.round((1 - Math.min(1, Math.max(0, avg))) * (sorted.length - 1))
  return sorted[idx]
}
