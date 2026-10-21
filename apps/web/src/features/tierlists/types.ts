import type { Visibility } from '../tests/types'

export type { Visibility }

export type TierListSummary = {
  id: string
  owner_id: string
  title: string
  note: string | null
  tags: string[]
  visibility: Visibility
  updated_at: string
  entries_count: number
  parent_list_id: string | null
  is_template: boolean
  source_template_id: string | null
  source_template_title: string | null
}

export type Tier = { id: string; label: string; color: string; position: number }

export type EntryItem = {
  id: string
  title: string
  subtitle: string | null
  image_url: string | null
  category_slug: string
  category_name: string
  category_emoji: string
}

export type Entry = {
  id: string
  /** null — запись лежит в «банке» (ещё не расставлена по тирам) */
  tier_id: string | null
  position: number
  note: string | null
  child_tierlist_id: string | null
  item: EntryItem
}

export type TierListFull = {
  id: string
  owner_id: string
  title: string
  note: string | null
  tags: string[]
  visibility: Visibility
  is_template: boolean
  source_template_id: string | null
  tiers: Tier[]
  entries: Entry[]
}

export type Crumb = { id: string; title: string }

/** Карточка шаблона в галерее */
export type TemplateCard = {
  id: string
  owner_id: string
  owner_username: string
  owner_display_name: string | null
  title: string
  note: string | null
  tags: string[]
  visibility: Visibility
  entries_count: number
  /** Сколько разных людей проходили шаблон (включая закрытые прохождения — только число) */
  passes_count: number
  updated_at: string
  /** Ваше последнее прохождение этого шаблона */
  my_pass_id: string | null
}

/** Открытое (видимое вам) прохождение шаблона — по одному на человека */
export type TemplatePass = {
  tierlist_id: string
  owner_id: string
  username: string
  display_name: string | null
  placed: number
  total: number
  updated_at: string
}

export type TemplateScoreRow = {
  user_id: string
  tierlist_id: string
  item_id: string
  tier_label: string
  /** 1 — верхний тир, 0 — нижний */
  tier_score: number
}
