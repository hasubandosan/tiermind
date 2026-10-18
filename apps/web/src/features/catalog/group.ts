import type { CategoryRef, PreferenceRow } from './types'

export type PreferenceGroup = { category: CategoryRef; rows: PreferenceRow[] }

/** Группирует предпочтения по категориям (порядок — sort_order), внутри: сначала самые любимые, затем по алфавиту */
export function groupPreferences(rows: PreferenceRow[]): PreferenceGroup[] {
  const map = new Map<string, PreferenceGroup>()
  for (const row of rows) {
    const c = row.item.category
    let g = map.get(c.slug)
    if (!g) {
      g = { category: c, rows: [] }
      map.set(c.slug, g)
    }
    g.rows.push(row)
  }
  const groups = [...map.values()].sort((a, b) => a.category.sort_order - b.category.sort_order)
  for (const g of groups) {
    g.rows.sort((a, b) => b.rating - a.rating || a.item.title.localeCompare(b.item.title, 'ru'))
  }
  return groups
}
