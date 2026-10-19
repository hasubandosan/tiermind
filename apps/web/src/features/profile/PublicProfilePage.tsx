import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Avatar from '../../components/Avatar'
import { useAuth } from '../auth/AuthProvider'
import { fetchPreferencesOf } from '../catalog/api'
import PreferencesSummary from '../catalog/PreferencesSummary'
import type { PreferenceRow } from '../catalog/types'
import { fetchProfileCard, type ProfileCard } from '../friends/api'
import FriendButton from '../friends/FriendButton'
import { fetchLatestResultsOfUser, type SavedResult } from '../tests/api'
import { getTest } from '../tests/registry'
import ResultView from '../tests/ResultView'
import { listTierLists } from '../tierlists/api'
import { TierListCard, nestedCounts } from '../tierlists/TierListsPage'
import type { TierListSummary } from '../tierlists/types'

const VISIBILITY_LABEL = { public: 'Открытый профиль', friends: 'Профиль для друзей', private: 'Скрытый профиль' }

function Inner({ username }: { username: string }) {
  const { user } = useAuth()
  const [card, setCard] = useState<ProfileCard | null | undefined>(undefined)
  const [results, setResults] = useState<SavedResult[]>([])
  const [prefs, setPrefs] = useState<PreferenceRow[]>([])
  const [lists, setLists] = useState<TierListSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const c = await fetchProfileCard(username)
        if (cancelled) return
        setCard(c)
        if (c?.can_view) {
          const [r, p, l] = await Promise.all([
            fetchLatestResultsOfUser(c.id),
            fetchPreferencesOf(c.id),
            listTierLists(c.id),
          ])
          if (!cancelled) {
            setResults(r)
            setPrefs(p)
            setLists(l)
          }
        } else {
          setResults([])
          setPrefs([])
          setLists([])
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [username, version, user?.id])

  if (error) return <p className="p-6 text-red-600">{error}</p>
  if (card === undefined) return <p className="p-6">Загрузка…</p>
  if (card === null) {
    return (
      <p className="p-6">
        Профиль не найден или скрыт. <Link to="/people" className="text-violet-700 underline">Искать людей</Link>
      </p>
    )
  }

  const isMe = user?.id === card.id
  const shown = results
    .map((r) => ({ r, test: getTest(r.test_slug) }))
    .filter((x) => x.test !== undefined)
    .sort((a, b) => a.test!.order - b.test!.order)

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center gap-4">
        <Avatar name={card.display_name || card.username} size={64} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{card.display_name || card.username}</h1>
          <p className="text-sm text-gray-500">
            @{card.username} · {VISIBILITY_LABEL[card.visibility]}
          </p>
        </div>
      </div>

      <div className="mb-6">
        {isMe ? (
          <Link to="/profile" className="text-sm text-violet-700 underline">Редактировать профиль</Link>
        ) : (
          <FriendButton otherUserId={card.id} onChange={() => setVersion((v) => v + 1)} />
        )}
      </div>

      {!card.can_view ? (
        <p className="rounded border border-gray-200 p-4 text-sm text-gray-600">
          Подробности профиля и результаты тестов видны только друзьям.
        </p>
      ) : (
        <>
          {card.bio && <p className="mb-6 whitespace-pre-wrap">{card.bio}</p>}
          <h2 className="mb-3 text-lg font-semibold">Предпочтения</h2>
          {prefs.length === 0 ? (
            <p className="mb-6 text-sm text-gray-600">Нет доступных предпочтений (они скрыты или ещё не добавлены).</p>
          ) : (
            <div className="mb-6">
              <PreferencesSummary rows={prefs} />
            </div>
          )}
          <h2 className="mb-3 text-lg font-semibold">Тир-листы</h2>
          {lists.filter((l) => l.parent_list_id === null).length === 0 ? (
            <p className="mb-6 text-sm text-gray-600">Нет доступных тир-листов.</p>
          ) : (
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {lists
                .filter((l) => l.parent_list_id === null)
                .map((l) => (
                  <TierListCard key={l.id} list={l} nestedCount={nestedCounts(lists).get(l.id) ?? 0} />
                ))}
            </div>
          )}
          <h2 className="mb-3 text-lg font-semibold">Результаты тестов</h2>
          {shown.length === 0 ? (
            <p className="text-sm text-gray-600">Нет доступных результатов.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {shown.map(({ r, test }) => (
                <div key={r.id} className="rounded-lg border border-gray-200 p-4">
                  <p className="mb-3 font-semibold">
                    {test!.title}{' '}
                    <span className="text-xs font-normal text-gray-500">
                      {test!.kind === 'scientific' ? 'научный' : 'развлекательный'}
                    </span>
                  </p>
                  <ResultView test={test!} result={r.scores} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function PublicProfilePage() {
  const { username } = useParams()
  if (!username) return null
  // key — чтобы при смене ника состояние сбрасывалось
  return <Inner key={username} username={username} />
}
