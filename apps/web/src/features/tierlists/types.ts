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
  tiers: Tier[]
  entries: Entry[]
}

export type Crumb = { id: string; title: string }
