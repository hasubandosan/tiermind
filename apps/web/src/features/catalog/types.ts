export type Category = {
  id: number
  slug: string
  name: string
  emoji: string
  /** Подпись поля «текст под названием»: «Вселенная», «Исполнитель или группа» и т.д. */
  subtitle_label: string | null
  sort_order: number
}

export type Rating = -2 | -1 | 0 | 1 | 2

export const RATINGS: { value: Rating; emoji: string; label: string }[] = [
  { value: 2, emoji: '😍', label: 'Обожаю' },
  { value: 1, emoji: '🙂', label: 'Нравится' },
  { value: 0, emoji: '😐', label: 'Нейтрально' },
  { value: -1, emoji: '🙁', label: 'Не нравится' },
  { value: -2, emoji: '😡', label: 'Ненавижу' },
]

export function ratingInfo(value: Rating) {
  return RATINGS.find((r) => r.value === value)!
}

export type CatalogItem = {
  id: string
  category_slug: string
  category_name: string
  category_emoji: string
  title: string
  subtitle: string | null
  image_url: string | null
  created_by: string | null
  my_rating: Rating | null
}

export type CategoryRef = { slug: string; name: string; emoji: string; sort_order: number }

export type PreferenceRow = {
  rating: Rating
  item: {
    id: string
    title: string
    subtitle: string | null
    image_url: string | null
    category: CategoryRef
  }
}

export type PrefVisibility = 'public' | 'friends' | 'private'
