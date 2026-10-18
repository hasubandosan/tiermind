import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../../lib/supabase'

type Visibility = 'public' | 'friends' | 'private'

type Profile = {
  username: string
  display_name: string | null
  bio: string | null
  visibility: Visibility
}

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('username, display_name, bio, visibility')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setProfile(data as Profile)
      })
  }, [user])

  if (!profile) return <p className="p-6">{error ?? 'Загрузка…'}</p>

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!user || !profile) return
    setError(null)
    setSaved(false)

    const username = profile.username.trim().toLowerCase()
    if (!USERNAME_RE.test(username)) {
      setError('Ник: 3–20 символов, только латиница a–z, цифры и _')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        username,
        display_name: profile.display_name?.trim() || null,
        bio: profile.bio?.trim() || null,
        visibility: profile.visibility,
      })
      .eq('id', user.id)
    setSaving(false)

    if (error) {
      setError(error.code === '23505' ? 'Этот ник уже занят' : error.message)
    } else {
      setProfile({ ...profile, username })
      setSaved(true)
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-1 text-2xl font-bold">Мой профиль</h1>
      <p className="mb-1 text-sm text-gray-500">{user?.email}</p>
      <p className="mb-4 text-sm">
        <Link to={`/u/${profile.username}`} className="text-violet-700 underline">Открыть мою страницу</Link>
      </p>
      <form onSubmit={onSave} className="flex flex-col gap-3">
        <label className="text-sm font-medium">
          Ник
          <input
            value={profile.username}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            className="mt-1 w-full rounded border border-gray-300 p-2 font-normal"
          />
        </label>
        <label className="text-sm font-medium">
          Имя
          <input
            value={profile.display_name ?? ''}
            onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
            className="mt-1 w-full rounded border border-gray-300 p-2 font-normal"
          />
        </label>
        <label className="text-sm font-medium">
          О себе
          <textarea
            rows={3}
            value={profile.bio ?? ''}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            className="mt-1 w-full rounded border border-gray-300 p-2 font-normal"
          />
        </label>
        <label className="text-sm font-medium">
          Кто видит профиль
          <select
            value={profile.visibility}
            onChange={(e) => setProfile({ ...profile, visibility: e.target.value as Visibility })}
            className="mt-1 w-full rounded border border-gray-300 p-2 font-normal"
          >
            <option value="public">Все</option>
            <option value="friends">Только друзья (имя и ник видны всем)</option>
            <option value="private">Только я (меня нельзя найти)</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-violet-600 p-2 font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Сохраняю…' : 'Сохранить'}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {saved && <p className="mt-3 text-sm text-green-700">Сохранено</p>}
    </div>
  )
}
