import { supabase } from '../../lib/supabase'
import type { CatalogItem, Category, PreferenceRow, PrefVisibility, Rating } from './types'

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name, emoji, subtitle_label, sort_order')
    .order('sort_order')
  if (error) throw new Error(error.message)
  return (data ?? []) as Category[]
}

export async function browseItems(params: {
  category: string | null
  query: string
  limit: number
  offset: number
}): Promise<CatalogItem[]> {
  const { data, error } = await supabase.rpc('browse_items', {
    p_category: params.category,
    p_query: params.query.trim() || null,
    p_limit: params.limit,
    p_offset: params.offset,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as CatalogItem[]
}

export async function createItem(input: {
  userId: string
  categoryId: number
  title: string
  subtitle: string | null
  imageUrl: string | null
}): Promise<void> {
  const { error } = await supabase.from('items').insert({
    category_id: input.categoryId,
    title: input.title,
    subtitle: input.subtitle,
    image_url: input.imageUrl,
    created_by: input.userId,
  })
  if (error) {
    if (error.code === '23505') {
      throw new Error('Такой элемент уже есть в каталоге — найдите его через поиск')
    }
    throw new Error(error.message)
  }
}

export async function uploadItemImage(userId: string, blob: Blob): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from('item-images')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(`Не удалось загрузить картинку: ${error.message}`)
  return supabase.storage.from('item-images').getPublicUrl(path).data.publicUrl
}

export async function setRating(userId: string, itemId: string, rating: Rating): Promise<void> {
  const { error } = await supabase
    .from('preferences')
    .upsert({ user_id: userId, item_id: itemId, rating }, { onConflict: 'user_id,item_id' })
  if (error) throw new Error(error.message)
}

export async function clearRating(userId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from('preferences')
    .delete()
    .eq('user_id', userId)
    .eq('item_id', itemId)
  if (error) throw new Error(error.message)
}

/** Предпочтения пользователя, которые разрешено видеть текущему (фильтрует RLS) */
export async function fetchPreferencesOf(userId: string): Promise<PreferenceRow[]> {
  const { data, error } = await supabase
    .from('preferences')
    .select('rating, items(id, title, subtitle, image_url, categories(slug, name, emoji, sort_order))')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)

  const rows: PreferenceRow[] = []
  for (const r of (data ?? []) as unknown as {
    rating: Rating
    items: {
      id: string
      title: string
      subtitle: string | null
      image_url: string | null
      categories: PreferenceRow['item']['category'] | null
    } | null
  }[]) {
    if (!r.items || !r.items.categories) continue
    rows.push({
      rating: r.rating,
      item: {
        id: r.items.id,
        title: r.items.title,
        subtitle: r.items.subtitle,
        image_url: r.items.image_url,
        category: r.items.categories,
      },
    })
  }
  return rows
}

export async function fetchMyPreferencesVisibility(userId: string): Promise<PrefVisibility> {
  const { data, error } = await supabase
    .from('profiles')
    .select('preferences_visibility')
    .eq('id', userId)
    .single()
  if (error) throw new Error(error.message)
  return (data as { preferences_visibility: PrefVisibility }).preferences_visibility
}

export async function setMyPreferencesVisibility(userId: string, v: PrefVisibility): Promise<void> {
  const { error } = await supabase.from('profiles').update({ preferences_visibility: v }).eq('id', userId)
  if (error) throw new Error(error.message)
}
