import { supabase } from '../../lib/supabase'

export type FriendEntry = {
  friendship_id: string
  status: 'pending' | 'accepted'
  i_am_requester: boolean
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export type PersonHit = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  visibility: 'public' | 'friends'
}

export type ProfileCard = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  visibility: 'public' | 'friends' | 'private'
  bio: string | null
  can_view: boolean
}

export async function fetchMyFriendships(): Promise<FriendEntry[]> {
  const { data, error } = await supabase.rpc('my_friendships')
  if (error) throw new Error(error.message)
  return (data ?? []) as FriendEntry[]
}

export async function searchProfiles(query: string): Promise<PersonHit[]> {
  const { data, error } = await supabase.rpc('search_profiles', { p_query: query })
  if (error) throw new Error(error.message)
  return (data ?? []) as PersonHit[]
}

export async function fetchProfileCard(username: string): Promise<ProfileCard | null> {
  const { data, error } = await supabase.rpc('profile_card', { p_username: username })
  if (error) throw new Error(error.message)
  return ((data ?? [])[0] as ProfileCard | undefined) ?? null
}

export async function sendFriendRequest(myId: string, otherId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: myId, addressee_id: otherId })
  if (error) {
    if (error.code === '23505') throw new Error('Заявка уже существует — обновите страницу')
    throw new Error(error.message)
  }
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Заявка не найдена (возможно, её уже отменили)')
}

/** Отменить свою заявку / отклонить чужую / удалить из друзей */
export async function removeFriendship(friendshipId: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
  if (error) throw new Error(error.message)
}
