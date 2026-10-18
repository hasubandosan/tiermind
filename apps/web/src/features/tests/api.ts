import { supabase } from '../../lib/supabase'
import type { Answers, Test, TestResult, Visibility } from './types'

export type SavedResult = {
  id: string
  test_slug: string
  test_version: number
  scores: TestResult
  visibility: Visibility
  taken_at: string
}

const COLUMNS = 'id, test_slug, test_version, scores, visibility, taken_at'

export async function saveResult(
  userId: string,
  test: Test,
  answers: Answers,
  scores: TestResult,
): Promise<SavedResult> {
  const { data, error } = await supabase
    .from('test_results')
    .insert({ user_id: userId, test_slug: test.slug, test_version: test.version, answers, scores })
    .select(COLUMNS)
    .single()
  if (error) throw new Error(error.message)
  return data as SavedResult
}

/** Последний результат пользователя по каждому тесту: { slug: результат } */
export async function fetchMyLatestResults(userId: string): Promise<Record<string, SavedResult>> {
  const { data, error } = await supabase
    .from('test_results')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('taken_at', { ascending: false })
  if (error) throw new Error(error.message)
  const latest: Record<string, SavedResult> = {}
  for (const row of (data ?? []) as SavedResult[]) {
    if (!latest[row.test_slug]) latest[row.test_slug] = row
  }
  return latest
}

export async function fetchMyLatestResult(userId: string, slug: string): Promise<SavedResult | null> {
  const { data, error } = await supabase
    .from('test_results')
    .select(COLUMNS)
    .eq('user_id', userId)
    .eq('test_slug', slug)
    .order('taken_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  return ((data ?? [])[0] as SavedResult | undefined) ?? null
}

export async function updateResultVisibility(id: string, visibility: Visibility): Promise<void> {
  const { error } = await supabase.from('test_results').update({ visibility }).eq('id', id)
  if (error) throw new Error(error.message)
}
