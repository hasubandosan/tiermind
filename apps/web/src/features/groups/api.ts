import { supabase } from '../../lib/supabase'
import type { Attachment, GroupData, GroupPrefRow, GroupSummary, GroupTestRow, Member, TierScoreRow } from './types'

function fail(error: { message: string }): never {
  throw new Error(error.message)
}

export async function myGroups(): Promise<GroupSummary[]> {
  const { data, error } = await supabase.rpc('my_groups')
  if (error) fail(error)
  return (data ?? []) as GroupSummary[]
}

export async function createGroup(name: string, shareTests: boolean, sharePreferences: boolean): Promise<string> {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: name,
    p_share_tests: shareTests,
    p_share_preferences: sharePreferences,
  })
  if (error) fail(error)
  return data as string
}

export async function inviteToGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('invite_to_group', { p_group: groupId, p_user: userId })
  if (error) fail(error)
}

export async function respondInvite(groupId: string, accept: boolean, shareTests: boolean, sharePreferences: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_group_invite', {
    p_group: groupId,
    p_accept: accept,
    p_share_tests: shareTests,
    p_share_preferences: sharePreferences,
  })
  if (error) fail(error)
}

export async function updateSharing(groupId: string, shareTests: boolean, sharePreferences: boolean): Promise<void> {
  const { error } = await supabase.rpc('update_group_sharing', {
    p_group: groupId,
    p_share_tests: shareTests,
    p_share_preferences: sharePreferences,
  })
  if (error) fail(error)
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_group', { p_group: groupId })
  if (error) fail(error)
}

export async function removeMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_group_member', { p_group: groupId, p_user: userId })
  if (error) fail(error)
}

export async function setGroupTierlist(groupId: string, tierlistId: string, attached: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_group_tierlist', { p_group: groupId, p_tierlist: tierlistId, p_attached: attached })
  if (error) fail(error)
}

export async function renameGroup(groupId: string, name: string): Promise<void> {
  const { error } = await supabase.from('groups').update({ name }).eq('id', groupId)
  if (error) fail(error)
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId)
  if (error) fail(error)
}

/** Всё, что нужно странице группы. null — группы нет или вы в ней не участник */
export async function fetchGroupData(groupId: string): Promise<GroupData | null> {
  const { data: g, error } = await supabase.from('groups').select('id, name, owner_id').eq('id', groupId).maybeSingle()
  if (error) fail(error)
  if (!g) return null

  const [members, tests, prefs, tiers, attachments] = await Promise.all([
    supabase.rpc('group_members_view', { p_group: groupId }),
    supabase.rpc('group_tests', { p_group: groupId }),
    supabase.rpc('group_preferences', { p_group: groupId }),
    supabase.rpc('group_tier_scores', { p_group: groupId }),
    supabase.from('group_tierlists').select('tierlist_id, user_id').eq('group_id', groupId),
  ])
  for (const r of [members, tests, prefs, tiers, attachments]) if (r.error) fail(r.error)

  const memberList = (members.data ?? []) as Member[]
  if (memberList.length === 0) return null // приглашённый (ещё не участник) данных группы не видит

  const base = g as { id: string; name: string; owner_id: string }
  return {
    ...base,
    members: memberList,
    tests: (tests.data ?? []) as GroupTestRow[],
    prefs: (prefs.data ?? []) as GroupPrefRow[],
    tiers: (tiers.data ?? []) as TierScoreRow[],
    attachments: (attachments.data ?? []) as Attachment[],
  }
}
