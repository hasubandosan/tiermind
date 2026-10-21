import type { GroupPrefRow, GroupTestRow, TierScoreRow } from './types'

/** Минимум общих элементов, чтобы считать совпадение осмысленным */
export const MIN_COMMON = 3

export type Pair = { a: string; b: string; score: number | null; common: number }
export type OverallPair = Pair & { parts: { tests: number | null; prefs: number | null; tiers: number | null } }

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/**
 * Совпадение двух людей по общим ключам: 100 — одинаково, 0 — максимально противоположно.
 * range — максимально возможная разница значений (для оценок −2…2 это 4, для процентов 100, для тиров 1).
 */
export function similarity(
  a: Map<string, number>,
  b: Map<string, number>,
  range: number,
  minCommon: number,
): { score: number | null; common: number } {
  let sum = 0
  let n = 0
  for (const [key, va] of a) {
    const vb = b.get(key)
    if (vb === undefined) continue
    sum += Math.abs(va - vb)
    n++
  }
  if (n < minCommon || n === 0) return { score: null, common: n }
  return { score: Math.round(100 * (1 - sum / n / range)), common: n }
}

function allPairs(vectors: Map<string, Map<string, number>>, range: number, minCommon: number): Pair[] {
  const ids = [...vectors.keys()].sort()
  const out: Pair[] = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const { score, common } = similarity(vectors.get(ids[i])!, vectors.get(ids[j])!, range, minCommon)
      out.push({ a: ids[i], b: ids[j], score, common })
    }
  }
  return out
}

/** Результаты одного теста: у каждого типа результата есть percents (шкалы, полюса, типы эннеаграммы) */
export function compareTest(rows: GroupTestRow[], slug: string): Pair[] {
  const vectors = new Map<string, Map<string, number>>()
  for (const r of rows) {
    if (r.test_slug !== slug) continue
    vectors.set(r.user_id, new Map(Object.entries(r.scores.percents)))
  }
  return allPairs(vectors, 100, 1)
}

export function comparePrefs(rows: GroupPrefRow[]): Pair[] {
  const vectors = new Map<string, Map<string, number>>()
  for (const r of rows) {
    if (!vectors.has(r.user_id)) vectors.set(r.user_id, new Map())
    vectors.get(r.user_id)!.set(r.item_id, r.rating)
  }
  return allPairs(vectors, 4, MIN_COMMON)
}

/** Достаточно полей user_id, item_id, tier_score — подходит и для групп, и для прохождений шаблона */
export type ScoreLike = Pick<TierScoreRow, 'user_id' | 'item_id' | 'tier_score'>

export function compareTiers(rows: ScoreLike[]): Pair[] {
  // один элемент может быть в нескольких тир-листах человека — берём среднее
  const acc = new Map<string, Map<string, { sum: number; n: number }>>()
  for (const r of rows) {
    if (!acc.has(r.user_id)) acc.set(r.user_id, new Map())
    const m = acc.get(r.user_id)!
    const cur = m.get(r.item_id) ?? { sum: 0, n: 0 }
    cur.sum += r.tier_score
    cur.n += 1
    m.set(r.item_id, cur)
  }
  const vectors = new Map<string, Map<string, number>>()
  for (const [uid, m] of acc) vectors.set(uid, new Map([...m].map(([k, v]) => [k, v.sum / v.n])))
  return allPairs(vectors, 1, MIN_COMMON)
}

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null)

/**
 * Общее совпадение пары = среднее по доступным составляющим: тесты (среднее по тестам), предпочтения, тир-листы.
 * Если по составляющей данных не хватает — она просто не учитывается.
 */
export function overallPairs(userIds: string[], testPairs: Pair[][], prefPairs: Pair[], tierPairs: Pair[]): OverallPair[] {
  const ids = [...userIds].sort()
  const find = (list: Pair[], a: string, b: string) => list.find((p) => p.a === a && p.b === b)
  const out: OverallPair[] = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]
      const b = ids[j]
      const tests = mean(testPairs.map((tp) => find(tp, a, b)?.score).filter((s): s is number => typeof s === 'number'))
      const prefs = find(prefPairs, a, b)?.score ?? null
      const tiers = find(tierPairs, a, b)?.score ?? null
      const parts = [tests, prefs, tiers].filter((s): s is number => s !== null)
      const common = (find(prefPairs, a, b)?.common ?? 0) + (find(tierPairs, a, b)?.common ?? 0)
      out.push({ a, b, score: mean(parts), common, parts: { tests, prefs, tiers } })
    }
  }
  return out
}

export type Highlight = {
  item: { id: string; title: string; subtitle: string | null; category_emoji: string }
  ratings: { user_id: string; rating: number }[]
}

/** Элементы, которые оценили хотя бы двое: всем нравится / всем не нравится / спорные */
export function prefHighlights(rows: GroupPrefRow[]): { love: Highlight[]; hate: Highlight[]; disputed: Highlight[] } {
  const byItem = new Map<string, Highlight>()
  for (const r of rows) {
    let h = byItem.get(r.item_id)
    if (!h) {
      h = { item: { id: r.item_id, title: r.title, subtitle: r.subtitle, category_emoji: r.category_emoji }, ratings: [] }
      byItem.set(r.item_id, h)
    }
    h.ratings.push({ user_id: r.user_id, rating: r.rating })
  }
  const shared = [...byItem.values()].filter((h) => h.ratings.length >= 2)
  const sum = (h: Highlight) => h.ratings.reduce((s, r) => s + r.rating, 0)
  const min = (h: Highlight) => Math.min(...h.ratings.map((r) => r.rating))
  const max = (h: Highlight) => Math.max(...h.ratings.map((r) => r.rating))
  return {
    love: shared.filter((h) => min(h) >= 1).sort((x, y) => sum(y) - sum(x) || x.item.title.localeCompare(y.item.title, 'ru')),
    hate: shared.filter((h) => max(h) <= -1).sort((x, y) => sum(x) - sum(y) || x.item.title.localeCompare(y.item.title, 'ru')),
    disputed: shared
      .filter((h) => max(h) - min(h) >= 3)
      .sort((x, y) => max(y) - min(y) - (max(x) - min(x)) || x.item.title.localeCompare(y.item.title, 'ru')),
  }
}

/** Цвет ячейки по проценту совпадения: от красного (0) к зелёному (100) */
export function heatColor(score: number | null): string {
  if (score === null) return '#f3f4f6'
  return `hsl(${Math.round((score / 100) * 120)}, 65%, 85%)`
}
