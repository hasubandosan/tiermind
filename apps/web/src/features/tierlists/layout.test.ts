import { describe, expect, it } from 'vitest'
import { applyMove, buildLayout, computeMove, parseTags, readableTextColor } from './layout'
import type { Entry, Tier } from './types'

const tiers: Tier[] = [
  { id: 'S', label: 'S', color: '#ff7f7f', position: 0 },
  { id: 'A', label: 'A', color: '#ffbf7f', position: 1 },
]

function entry(id: string, tier: string | null, position: number): Entry {
  return {
    id,
    tier_id: tier,
    position,
    note: null,
    child_tierlist_id: null,
    item: { id: 'i' + id, title: id, subtitle: null, image_url: null, category_slug: 'x', category_name: 'x', category_emoji: '🎮' },
  }
}

/** Порядок записей в колонке как строка: "e1,e2" */
function col(entries: Entry[], tier: string | null) {
  return entries
    .filter((e) => e.tier_id === tier)
    .sort((a, b) => a.position - b.position)
    .map((e) => `${e.id}:${e.position}`)
    .join(',')
}

describe('buildLayout', () => {
  it('раскладывает записи по тирам и банку, сортирует по позиции', () => {
    const l = buildLayout(tiers, [entry('b', 'S', 1), entry('a', 'S', 0), entry('p', null, 0), entry('x', 'GONE', 0)])
    expect(l.tiers[0].entries.map((e) => e.id)).toEqual(['a', 'b'])
    expect(l.pool.map((e) => e.id).sort()).toEqual(['p', 'x']) // запись с неизвестным тиром попадает в банк
  })
})

describe('computeMove', () => {
  const entries = [entry('e1', 'S', 0), entry('e2', 'S', 1), entry('e3', 'S', 2), entry('e4', null, 0), entry('e5', 'A', 0)]
  const layout = buildLayout(tiers, entries)

  it('бросок на пустое место тира = в конец тира', () => {
    expect(computeMove(layout, 'e4', 'tier:S')).toEqual({ tierId: 'S', index: 3 })
    expect(computeMove(layout, 'e4', 'tier:A')).toEqual({ tierId: 'A', index: 1 })
  })

  it('бросок на банк = в конец банка (из тира)', () => {
    expect(computeMove(layout, 'e1', 'pool')).toEqual({ tierId: null, index: 1 })
  })

  it('бросок на запись другого тира = встать на её место', () => {
    expect(computeMove(layout, 'e4', 'entry:e2')).toEqual({ tierId: 'S', index: 1 })
  })

  it('внутри тира: вправо — после записи, влево — перед', () => {
    expect(computeMove(layout, 'e1', 'entry:e3')).toEqual({ tierId: 'S', index: 2 })
    expect(computeMove(layout, 'e3', 'entry:e1')).toEqual({ tierId: 'S', index: 0 })
  })

  it('ничего не меняется: на себя / на свой же тир в конец', () => {
    expect(computeMove(layout, 'e1', 'entry:e1')).toBeNull()
    expect(computeMove(layout, 'e3', 'tier:S')).toBeNull()
    expect(computeMove(layout, 'e1', 'entry:e2')).toEqual({ tierId: 'S', index: 1 })
  })

  it('неизвестные цели игнорируются', () => {
    expect(computeMove(layout, 'e1', 'tier:ZZZ')).toBeNull()
    expect(computeMove(layout, 'nope', 'pool')).toBeNull()
    expect(computeMove(layout, 'e1', 'garbage')).toBeNull()
  })
})

describe('applyMove — тот же результат, что у серверной move_entry (сценарий из supabase/tests)', () => {
  // банк: Item1..Item5 с позициями 0..4
  let es: Entry[] = [1, 2, 3, 4, 5].map((n) => entry('Item' + n, null, n - 1))

  it('три записи в S по порядку', () => {
    es = applyMove(es, 'Item1', { tierId: 'S', index: 0 })
    es = applyMove(es, 'Item2', { tierId: 'S', index: 1 })
    es = applyMove(es, 'Item3', { tierId: 'S', index: 2 })
    expect(col(es, 'S')).toBe('Item1:0,Item2:1,Item3:2')
    expect(col(es, null)).toBe('Item4:0,Item5:1')
  })
  it('Item3 на позицию 0 внутри тира', () => {
    es = applyMove(es, 'Item3', { tierId: 'S', index: 0 })
    expect(col(es, 'S')).toBe('Item3:0,Item1:1,Item2:2')
  })
  it('Item2 в тир A: в S закрывается дырка', () => {
    es = applyMove(es, 'Item2', { tierId: 'A', index: 0 })
    expect(col(es, 'S')).toBe('Item3:0,Item1:1')
    expect(col(es, 'A')).toBe('Item2:0')
  })
  it('Item1 в начало банка', () => {
    es = applyMove(es, 'Item1', { tierId: null, index: 0 })
    expect(col(es, null)).toBe('Item1:0,Item4:1,Item5:2')
    expect(col(es, 'S')).toBe('Item3:0')
  })
  it('индекс за пределами = в конец', () => {
    es = applyMove(es, 'Item4', { tierId: 'S', index: 99 })
    expect(col(es, 'S')).toBe('Item3:0,Item4:1')
    expect(col(es, null)).toBe('Item1:0,Item5:1')
  })
  it('неизвестная запись не ломает список', () => {
    expect(applyMove(es, 'nope', { tierId: 'S', index: 0 })).toBe(es)
  })
})

describe('вспомогательные', () => {
  it('readableTextColor', () => {
    expect(readableTextColor('#ffff7f')).toBe('#000000')
    expect(readableTextColor('#101010')).toBe('#ffffff')
    expect(readableTextColor('bad')).toBe('#000000')
  })
  it('parseTags: чистит, убирает дубли, ограничивает', () => {
    expect(parseTags(' RPG, fav ,rpg,,  ')).toEqual(['rpg', 'fav'])
    expect(parseTags(Array.from({ length: 15 }, (_, i) => 't' + i).join(','))).toHaveLength(10)
  })
})
