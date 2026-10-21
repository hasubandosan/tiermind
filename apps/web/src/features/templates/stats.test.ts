import { describe, expect, it } from 'vitest'
import { communityStats, tierForAverage } from './stats'
import type { Tier } from '../tierlists/types'

const tiers: Tier[] = ['S', 'A', 'B', 'C', 'D'].map((label, i) => ({ id: label, label, color: '#000000', position: i }))

describe('communityStats', () => {
  it('усредняет оценки по людям и сортирует от лучших к худшим', () => {
    const s = communityStats([
      { user_id: 'a', item_id: 'x', tier_score: 1 },
      { user_id: 'b', item_id: 'x', tier_score: 0.5 },
      { user_id: 'a', item_id: 'y', tier_score: 0.25 },
      { user_id: 'b', item_id: 'z', tier_score: 1 },
    ])
    expect(s.map((i) => i.item_id)).toEqual(['z', 'x', 'y'])
    expect(s.find((i) => i.item_id === 'x')).toEqual({ item_id: 'x', avg: 0.75, n: 2 })
  })
  it('при равных оценках выше тот, кого оценили больше людей', () => {
    const s = communityStats([
      { user_id: 'a', item_id: 'p', tier_score: 1 },
      { user_id: 'a', item_id: 'q', tier_score: 1 },
      { user_id: 'b', item_id: 'q', tier_score: 1 },
    ])
    expect(s[0].item_id).toBe('q')
  })
  it('пусто — пусто', () => {
    expect(communityStats([])).toEqual([])
  })
})

describe('tierForAverage', () => {
  it('1 → верхний тир, 0 → нижний, 0.5 → средний', () => {
    expect(tierForAverage(1, tiers)?.label).toBe('S')
    expect(tierForAverage(0, tiers)?.label).toBe('D')
    expect(tierForAverage(0.5, tiers)?.label).toBe('B')
    expect(tierForAverage(0.74, tiers)?.label).toBe('A')
  })
  it('значения за пределами и один тир', () => {
    expect(tierForAverage(2, tiers)?.label).toBe('S')
    expect(tierForAverage(-1, tiers)?.label).toBe('D')
    expect(tierForAverage(0.3, [tiers[0]])?.label).toBe('S')
    expect(tierForAverage(0.3, [])).toBeNull()
  })
})
