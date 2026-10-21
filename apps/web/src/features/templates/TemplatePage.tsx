import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { compareTiers } from '../groups/compare'
import { ScoreBadge } from '../groups/ui'
import { fetchTierList, getTemplate, startFromTemplate, templatePasses, templateScores } from '../tierlists/api'
import { EntryTileView } from '../tierlists/EntryTile'
import { readableTextColor } from '../tierlists/layout'
import type { TemplateCard, TemplatePass, TemplateScoreRow, TierListFull } from '../tierlists/types'
import { communityStats, tierForAverage } from './stats'

function Inner({ id }: { id: string }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [card, setCard] = useState<TemplateCard | null | undefined>(undefined)
  const [tpl, setTpl] = useState<TierListFull | null>(null)
  const [passes, setPasses] = useState<TemplatePass[]>([])
  const [scores, setScores] = useState<TemplateScoreRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([getTemplate(id), fetchTierList(id), templatePasses(id), templateScores(id)])
      .then(([c, t, p, s]) => {
        if (cancelled) return
        setCard(c)
        setTpl(t)
        setPasses(p)
        setScores(s)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [id, user?.id])

  const itemsById = useMemo(() => new Map((tpl?.entries ?? []).map((e) => [e.item.id, e.item])), [tpl])
  const stats = useMemo(() => communityStats(scores).filter((s) => itemsById.has(s.item_id)), [scores, itemsById])
  const withMe = useMemo(() => {
    if (!user) return new Map<string, { score: number | null; common: number }>()
    const m = new Map<string, { score: number | null; common: number }>()
    for (const p of compareTiers(scores)) {
      if (p.a === user.id) m.set(p.b, { score: p.score, common: p.common })
      else if (p.b === user.id) m.set(p.a, { score: p.score, common: p.common })
    }
    return m
  }, [scores, user])

  async function start() {
    if (!user) {
      navigate('/login')
      return
    }
    setStarting(true)
    setError(null)
    try {
      navigate(`/tierlists/${await startFromTemplate(id)}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStarting(false)
    }
  }

  if (error && card === undefined) return <p className="p-6 text-red-600">{error}</p>
  if (card === undefined) return <p className="p-6">Загрузка…</p>
  if (card === null || !tpl) {
    return (
      <p className="p-6">
        Шаблон не найден или скрыт. <Link to="/templates" className="text-violet-700 underline">К шаблонам</Link>
      </p>
    )
  }

  const isOwner = user?.id === card.owner_id
  const tiers = [...tpl.tiers].sort((a, b) => a.position - b.position)
  const items = [...tpl.entries].sort((a, b) => a.item.title.localeCompare(b.item.title, 'ru'))
  const hasMyScores = !!user && scores.some((s) => s.user_id === user.id)

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <p className="mb-1 text-sm">
        <Link to="/templates" className="text-violet-700 underline">Шаблоны</Link> / <span className="text-gray-500">{card.title}</span>
      </p>
      <h1 className="text-2xl font-bold">{card.title}</h1>
      <p className="text-sm text-gray-500">
        автор <Link to={`/u/${card.owner_username}`} className="text-violet-700 underline">@{card.owner_username}</Link> · {card.entries_count} элем. · прошли: {card.passes_count}
      </p>
      {card.note && <p className="mt-2 whitespace-pre-wrap text-sm">{card.note}</p>}
      {card.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {card.tags.map((t) => (
            <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">#{t}</span>
          ))}
        </div>
      )}

      <div className="my-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={starting} onClick={start} className="rounded bg-violet-600 px-4 py-2 font-medium text-white disabled:opacity-50">
          {card.my_pass_id ? 'Пройти ещё раз' : 'Пройти этот шаблон'}
        </button>
        {card.my_pass_id && (
          <Link to={`/tierlists/${card.my_pass_id}`} className="text-sm text-violet-700 underline">Продолжить моё прохождение</Link>
        )}
        {isOwner && <Link to={`/tierlists/${card.id}`} className="text-sm text-violet-700 underline">Редактировать шаблон</Link>}
        {!user && <span className="text-xs text-gray-500">Для прохождения нужно войти.</span>}
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Тиры</h2>
        <div className="flex flex-wrap gap-1.5">
          {tiers.map((t) => (
            <span key={t.id} className="rounded px-2.5 py-1 text-sm font-bold" style={{ backgroundColor: t.color, color: readableTextColor(t.color) }}>
              {t.label}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold">Элементы ({items.length})</h2>
        <div className="flex flex-wrap gap-2">
          {items.map((e) => (
            <EntryTileView key={e.id} entry={e} />
          ))}
        </div>
        {items.some((e) => e.child_tierlist_id) && (
          <p className="mt-2 text-xs text-gray-500">📂 — у элемента есть вложенный тир-лист: он тоже скопируется в ваше прохождение.</p>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-1 font-semibold">Сообщество</h2>
        {stats.length === 0 ? (
          <p className="text-sm text-gray-600">
            Пока нет открытых прохождений с расставленными элементами. Своё прохождение можно открыть в его настройках («Кто видит» → «Все» или «Друзья»), тогда оно появится здесь.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-gray-500">Средняя расстановка по открытым прохождениям ({passes.filter((p) => p.placed > 0).length}). Только то, что люди сами открыли.</p>
            <ul className="flex flex-col gap-1.5">
              {stats.map((s) => {
                const it = itemsById.get(s.item_id)!
                const tier = tierForAverage(s.avg, tiers)
                return (
                  <li key={s.item_id} className="flex items-center gap-3 text-sm">
                    <span
                      className="w-8 shrink-0 rounded py-0.5 text-center text-xs font-bold"
                      style={tier ? { backgroundColor: tier.color, color: readableTextColor(tier.color) } : undefined}
                      title={`в среднем: ${Math.round(s.avg * 100)}%`}
                    >
                      {tier?.label ?? '?'}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {it.category_emoji} {it.title}
                    </span>
                    <span className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-gray-200">
                      <span className="block h-full bg-violet-500" style={{ width: `${Math.round(s.avg * 100)}%` }} />
                    </span>
                    <span className="w-14 shrink-0 text-right text-xs text-gray-400">{s.n} чел.</span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Открытые прохождения</h2>
        {user && !hasMyScores && passes.length > 0 && (
          <p className="mb-2 text-xs text-gray-500">Расставьте элементы в своём прохождении, чтобы увидеть, насколько ваши вкусы совпадают с другими.</p>
        )}
        {passes.length === 0 ? (
          <p className="text-sm text-gray-600">Пока нет открытых прохождений.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {passes.map((p) => {
              const mine = p.owner_id === user?.id
              const cmp = withMe.get(p.owner_id)
              return (
                <li key={p.tierlist_id} className="flex items-center gap-3 rounded border border-gray-200 p-2 text-sm">
                  <span className="flex-1">
                    <Link to={`/u/${p.username}`} className="font-medium text-violet-700 underline">
                      {p.display_name || p.username}
                    </Link>
                    {mine && <span className="ml-2 text-xs text-gray-500">(это вы)</span>}
                    <span className="block text-xs text-gray-500">расставлено {p.placed} из {p.total}</span>
                  </span>
                  {!mine && user && hasMyScores && (
                    <span title={cmp ? `общих элементов: ${cmp.common}` : ''}>
                      <ScoreBadge score={cmp?.score ?? null} />
                    </span>
                  )}
                  <Link to={`/tierlists/${p.tierlist_id}`} className="text-xs text-violet-700 underline">Открыть</Link>
                </li>
              )
            })}
          </ul>
        )}
        {hasMyScores && <p className="mt-2 text-xs text-gray-400">Процент — совпадение расстановки с вашей (нужно минимум 3 общих расставленных элемента).</p>}
      </section>
    </div>
  )
}

export default function TemplatePage() {
  const { id } = useParams()
  if (!id) return null
  return <Inner key={id} id={id} />
}
