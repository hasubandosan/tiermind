import { describe, expect, it } from 'vitest'
import { MIN_COMMON, compareTest, comparePrefs, compareTiers, heatColor, overallPairs, pairKey, prefHighlights, similarity } from './compare'
import type { GroupPrefRow, GroupTestRow, TierScoreRow } from './types'
import type { Rating } from '../catalog/types'

const m = (o: Record<string, number>) => new Map(Object.entries(o))

describe('similarity', () => {
  it('одинаково = 100, противоположно = 0', () => {
    expect(similarity(m({ a: 2, b: -2, c: 1 }), m({ a: 2, b: -2, c: 1 }), 4, 3).score).toBe(100)
    expect(similarity(m({ a: 2, b: 2, c: 2 }), m({ a: -2, b: -2, c: -2 }), 4, 3).score).toBe(0)
  })
  it('учитываются только общие ключи', () => {
    const r = similarity(m({ a: 2, b: 1, x: 0 }), m({ a: 2, b: 1, y: 0 }), 4, 2)
    expect(r).toEqual({ score: 100, common: 2 })
  })
  it('слишком мало общего — оценки нет, но число общих известно', () => {
    expect(similarity(m({ a: 1 }), m({ a: 1, b: 2 }), 4, MIN_COMMON)).toEqual({ score: null, common: 1 })
    expect(similarity(m({ a: 1 }), m({ b: 2 }), 4, 1)).toEqual({ score: null, common: 0 })
  })
  it('частичное расхождение: средняя разница 2/3 из 4 даёт 83', () => {
    expect(similarity(m({ a: 2, b: 0, c: 0 }), m({ a: 0, b: 0, c: 0 }), 4, 3).score).toBe(83) // средняя разница 2/3
  })
})

const test = (user_id: string, o: Record<string, number>): GroupTestRow => ({
  user_id, test_slug: 'ocean-tipi', test_version: 1, taken_at: '', scores: { scoring: 'scales', percents: o },
})

describe('compareTest', () => {
  it('считает по процентам шкал, пары упорядочены', () => {
    const p = compareTest([test('b', { O: 100, C: 0 }), test('a', { O: 80, C: 20 }), { ...test('c', { O: 0 }), test_slug: 'other' }], 'ocean-tipi')
    expect(p).toEqual([{ a: 'a', b: 'b', score: 80, common: 2 }])
  })
})

const pref = (user_id: string, item_id: string, rating: Rating): GroupPrefRow => ({
  user_id, item_id, rating, title: 'T' + item_id, subtitle: null, image_url: null,
  category_slug: 'x', category_name: 'x', category_emoji: '🎮', category_sort: 0,
})

describe('comparePrefs и prefHighlights', () => {
  const rows = [
    pref('a', '1', 2), pref('a', '2', 1), pref('a', '3', -2), pref('a', '4', 0),
    pref('b', '1', 2), pref('b', '2', 1), pref('b', '3', 2), pref('b', '5', 1),
  ]
  it('общих элементов хватает — есть оценка', () => {
    const [p] = comparePrefs(rows)
    expect(p.common).toBe(3)
    expect(p.score).toBe(Math.round(100 * (1 - 4 / 3 / 4)))
  })
  it('общих мало — оценки нет', () => {
    expect(comparePrefs(rows.filter((r) => r.item_id !== '2'))[0].score).toBeNull()
  })
  it('highlights: любят вместе / спорные', () => {
    const h = prefHighlights(rows)
    expect(h.love.map((x) => x.item.id)).toEqual(['1', '2'])
    expect(h.disputed.map((x) => x.item.id)).toEqual(['3'])
    expect(h.hate).toEqual([])
  })
  it('элементы одного человека в highlights не попадают', () => {
    const h = prefHighlights([pref('a', '9', 2)])
    expect(h.love).toEqual([])
  })
  it('общая нелюбовь', () => {
    const h = prefHighlights([pref('a', '1', -1), pref('b', '1', -2), pref('c', '1', -1)])
    expect(h.hate).toHaveLength(1)
  })
})

const tier = (user_id: string, item_id: string, tier_score: number, tierlist_id = 'L' + user_id): TierScoreRow => ({
  user_id, tierlist_id, tierlist_title: 't', item_id, title: 'T' + item_id, subtitle: null, image_url: null,
  category_slug: 'x', category_name: 'x', category_emoji: '🎮', tier_label: 'S', tier_score,
})

describe('compareTiers', () => {
  it('сравнивает положение элементов по тирам', () => {
    const p = compareTiers([
      tier('a', '1', 1), tier('a', '2', 0.5), tier('a', '3', 0),
      tier('b', '1', 1), tier('b', '2', 0.5), tier('b', '3', 0),
    ])
    expect(p[0].score).toBe(100)
  })
  it('один элемент в двух тир-листах человека усредняется', () => {
    const p = compareTiers([
      tier('a', '1', 1, 'L1'), tier('a', '1', 0, 'L2'), tier('a', '2', 0.5), tier('a', '3', 0.5),
      tier('b', '1', 0.5), tier('b', '2', 0.5), tier('b', '3', 0.5),
    ])
    expect(p[0].score).toBe(100) // среднее по «1» = 0.5, как у b
  })
})

describe('overallPairs', () => {
  it('среднее по доступным составляющим; недоступные не учитываются', () => {
    const tests = [[{ a: 'a', b: 'b', score: 80, common: 5 }]]
    const prefs = [{ a: 'a', b: 'b', score: 60, common: 10 }]
    const tiers = [{ a: 'a', b: 'b', score: null, common: 1 }]
    const [o] = overallPairs(['b', 'a'], tests, prefs, tiers)
    expect(o.score).toBe(70)
    expect(o.parts).toEqual({ tests: 80, prefs: 60, tiers: null })
    expect(o.common).toBe(11)
  })
  it('нет данных — нет оценки', () => {
    expect(overallPairs(['a', 'b'], [], [], [])[0].score).toBeNull()
  })
  it('для n человек n(n-1)/2 пар', () => {
    expect(overallPairs(['a', 'b', 'c', 'd'], [], [], [])).toHaveLength(6)
  })
})

describe('вспомогательные', () => {
  it('pairKey симметричен', () => {
    expect(pairKey('x', 'y')).toBe(pairKey('y', 'x'))
  })
  it('heatColor: серый без данных, красный → зелёный', () => {
    expect(heatColor(null)).toBe('#f3f4f6')
    expect(heatColor(0)).toContain('hsl(0,')
    expect(heatColor(100)).toContain('hsl(120,')
  })
})
