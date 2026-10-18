import { describe, expect, it } from 'vitest'
import { groupPreferences } from './group'
import { RATINGS, type PreferenceRow, type Rating } from './types'

const music = { slug: 'music', name: 'Музыка', emoji: '🎵', sort_order: 50 }
const movies = { slug: 'movies', name: 'Фильмы', emoji: '🎬', sort_order: 10 }

function row(title: string, rating: Rating, category = music): PreferenceRow {
  return { rating, item: { id: title, title, subtitle: null, image_url: null, category } }
}

describe('groupPreferences', () => {
  it('сортирует категории по sort_order', () => {
    const g = groupPreferences([row('Queen', 2), row('Alien', 1, movies)])
    expect(g.map((x) => x.category.slug)).toEqual(['movies', 'music'])
  })

  it('внутри категории: сначала высокий рейтинг, затем по алфавиту', () => {
    const g = groupPreferences([row('Б', 1), row('А', 1), row('В', 2), row('Г', -2)])
    expect(g[0].rows.map((r) => r.item.title)).toEqual(['В', 'А', 'Б', 'Г'])
  })

  it('пустой список даёт пустой результат', () => {
    expect(groupPreferences([])).toEqual([])
  })
})

describe('шкала оценок', () => {
  it('5 уровней от 2 до -2 без повторов', () => {
    expect(RATINGS.map((r) => r.value)).toEqual([2, 1, 0, -1, -2])
    expect(new Set(RATINGS.map((r) => r.emoji)).size).toBe(5)
  })
})
