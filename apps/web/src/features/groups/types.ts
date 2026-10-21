import type { Rating } from '../catalog/types'
import type { TestResult } from '../tests/types'

export type GroupSummary = {
  id: string
  name: string
  owner_id: string
  owner_username: string
  my_status: 'invited' | 'joined'
  member_count: number
  created_at: string
}

export type Member = {
  user_id: string
  username: string
  display_name: string | null
  status: 'invited' | 'joined'
  share_tests: boolean
  share_preferences: boolean
  is_owner: boolean
}

export type GroupTestRow = {
  user_id: string
  test_slug: string
  test_version: number
  scores: TestResult
  taken_at: string
}

export type GroupPrefRow = {
  user_id: string
  item_id: string
  rating: Rating
  title: string
  subtitle: string | null
  image_url: string | null
  category_slug: string
  category_name: string
  category_emoji: string
  category_sort: number
}

export type TierScoreRow = {
  user_id: string
  tierlist_id: string
  tierlist_title: string
  item_id: string
  title: string
  subtitle: string | null
  image_url: string | null
  category_slug: string
  category_name: string
  category_emoji: string
  tier_label: string
  /** 1 — верхний тир, 0 — нижний */
  tier_score: number
}

export type Attachment = { tierlist_id: string; user_id: string }

export type GroupData = {
  id: string
  name: string
  owner_id: string
  members: Member[]
  tests: GroupTestRow[]
  prefs: GroupPrefRow[]
  tiers: TierScoreRow[]
  attachments: Attachment[]
}
