import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { fetchGroupData } from './api'
import MembersTab from './MembersTab'
import OverviewTab from './OverviewTab'
import PrefsTab from './PrefsTab'
import TestsTab from './TestsTab'
import TierListsTab from './TierListsTab'
import type { GroupData } from './types'

type Tab = 'overview' | 'tests' | 'prefs' | 'tiers' | 'members'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Обзор' },
  { id: 'tests', label: 'Тесты' },
  { id: 'prefs', label: 'Предпочтения' },
  { id: 'tiers', label: 'Тир-листы' },
  { id: 'members', label: 'Участники' },
]

function Inner({ id }: { id: string }) {
  const { user } = useAuth()
  const [data, setData] = useState<GroupData | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')

  const reload = useCallback(async () => {
    try {
      setData(await fetchGroupData(id))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload, user?.id])

  if (error && !data) return <p className="p-6 text-red-600">{error}</p>
  if (data === undefined) return <p className="p-6">Загрузка…</p>
  if (data === null) {
    return (
      <p className="p-6">
        Группа не найдена, или вы ещё не приняли приглашение. <Link to="/groups" className="text-violet-700 underline">К моим группам</Link>
      </p>
    )
  }

  const me = data.members.find((m) => m.user_id === user?.id)
  const sharesNothing = me && !me.share_tests && !me.share_preferences && !data.attachments.some((a) => a.user_id === user?.id)

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <p className="mb-1 text-sm">
        <Link to="/groups" className="text-violet-700 underline">Группы</Link> / <span className="text-gray-500">{data.name}</span>
      </p>
      <h1 className="mb-3 text-2xl font-bold">{data.name}</h1>

      {sharesNothing && (
        <p className="mb-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          Вы пока ничем не делитесь с группой, поэтому друзья вас не видят в сравнении. Выберите, что показывать, на вкладке «Участники» или прикрепите тир-лист.
        </p>
      )}

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === t.id ? 'border-violet-600 font-medium text-violet-700' : 'border-transparent text-gray-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {tab === 'overview' && <OverviewTab data={data} />}
      {tab === 'tests' && <TestsTab data={data} />}
      {tab === 'prefs' && <PrefsTab data={data} />}
      {tab === 'tiers' && <TierListsTab data={data} onChanged={reload} />}
      {tab === 'members' && <MembersTab data={data} onChanged={reload} />}
    </div>
  )
}

export default function GroupPage() {
  const { id } = useParams()
  if (!id) return null
  return <Inner key={id} id={id} />
}
