import { supabase } from '../../lib/supabase'
import type { Crumb, Entry, Tier, TierListFull, TierListSummary, Visibility } from './types'

function fail(error: { message: string }): never {
  throw new Error(error.message)
}

export async function listTierLists(ownerId: string): Promise<TierListSummary[]> {
  const { data, error } = await supabase.rpc('list_tierlists', { p_owner: ownerId })
  if (error) fail(error)
  return (data ?? []) as TierListSummary[]
}

export async function createTierList(title: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_tierlist', { p_title: title })
  if (error) fail(error)
  return data as string
}

export async function fetchTierList(id: string): Promise<TierListFull | null> {
  const { data: tl, error } = await supabase
    .from('tierlists')
    .select('id, owner_id, title, note, tags, visibility')
    .eq('id', id)
    .maybeSingle()
  if (error) fail(error)
  if (!tl) return null

  const [tiersRes, entriesRes] = await Promise.all([
    supabase.from('tiers').select('id, label, color, position').eq('tierlist_id', id).order('position'),
    supabase
      .from('tierlist_entries')
      .select('id, tier_id, position, note, child_tierlist_id, items(id, title, subtitle, image_url, categories(slug, name, emoji))')
      .eq('tierlist_id', id),
  ])
  if (tiersRes.error) fail(tiersRes.error)
  if (entriesRes.error) fail(entriesRes.error)

  const entries: Entry[] = []
  for (const r of (entriesRes.data ?? []) as unknown as {
    id: string
    tier_id: string | null
    position: number
    note: string | null
    child_tierlist_id: string | null
    items: {
      id: string
      title: string
      subtitle: string | null
      image_url: string | null
      categories: { slug: string; name: string; emoji: string } | null
    } | null
  }[]) {
    if (!r.items || !r.items.categories) continue
    entries.push({
      id: r.id,
      tier_id: r.tier_id,
      position: r.position,
      note: r.note,
      child_tierlist_id: r.child_tierlist_id,
      item: {
        id: r.items.id,
        title: r.items.title,
        subtitle: r.items.subtitle,
        image_url: r.items.image_url,
        category_slug: r.items.categories.slug,
        category_name: r.items.categories.name,
        category_emoji: r.items.categories.emoji,
      },
    })
  }

  const base = tl as { id: string; owner_id: string; title: string; note: string | null; tags: string[]; visibility: Visibility }
  return { ...base, tiers: (tiersRes.data ?? []) as Tier[], entries }
}

export async function updateTierList(
  id: string,
  patch: Partial<{ title: string; note: string | null; tags: string[]; visibility: Visibility }>,
): Promise<void> {
  const { error } = await supabase.from('tierlists').update(patch).eq('id', id)
  if (error) fail(error)
}

export async function deleteTierList(id: string): Promise<void> {
  const { error } = await supabase.from('tierlists').delete().eq('id', id)
  if (error) fail(error)
}

export async function fetchAncestors(id: string): Promise<Crumb[]> {
  const { data, error } = await supabase.rpc('tierlist_ancestors', { p_id: id })
  if (error) fail(error)
  return ((data ?? []) as { id: string; title: string }[]).map((r) => ({ id: r.id, title: r.title }))
}

export async function fetchOwnerName(ownerId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('username').eq('id', ownerId).maybeSingle()
  return (data as { username: string } | null)?.username ?? null
}

// ---- тиры ----

export async function addTier(listId: string, label: string, color: string, position: number): Promise<void> {
  const { error } = await supabase.from('tiers').insert({ tierlist_id: listId, label, color, position })
  if (error) fail(error)
}

export async function updateTier(id: string, patch: Partial<{ label: string; color: string }>): Promise<void> {
  const { error } = await supabase.from('tiers').update(patch).eq('id', id)
  if (error) fail(error)
}

export async function deleteTier(id: string): Promise<void> {
  const { error } = await supabase.from('tiers').delete().eq('id', id)
  if (error) fail(error)
}

export async function reorderTiers(listId: string, ids: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_tiers', { p_list: listId, p_ids: ids })
  if (error) fail(error)
}

// ---- записи ----

export async function addEntry(listId: string, itemId: string, position: number): Promise<void> {
  const { error } = await supabase.from('tierlist_entries').insert({ tierlist_id: listId, item_id: itemId, position })
  if (error) {
    if (error.code === '23505') throw new Error('Этот элемент уже есть в тир-листе')
    fail(error)
  }
}

export async function updateEntryNote(id: string, note: string | null): Promise<void> {
  const { error } = await supabase.from('tierlist_entries').update({ note }).eq('id', id)
  if (error) fail(error)
}

export async function removeEntry(id: string): Promise<void> {
  const { error } = await supabase.from('tierlist_entries').delete().eq('id', id)
  if (error) fail(error)
}

export async function moveEntry(id: string, tierId: string | null, index: number): Promise<void> {
  const { error } = await supabase.rpc('move_entry', { p_entry: id, p_tier: tierId, p_index: index })
  if (error) fail(error)
}

export async function createChildTierList(entryId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_child_tierlist', { p_entry: entryId })
  if (error) fail(error)
  return data as string
}

export async function unlinkChild(entryId: string): Promise<void> {
  const { error } = await supabase.from('tierlist_entries').update({ child_tierlist_id: null }).eq('id', entryId)
  if (error) fail(error)
}
