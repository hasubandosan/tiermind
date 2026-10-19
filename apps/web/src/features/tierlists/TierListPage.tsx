import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import AddEntries from './AddEntries'
import { fetchAncestors, fetchOwnerName, fetchTierList, moveEntry } from './api'
import EntryPanel from './EntryPanel'
import EntryTile, { EntryTileView } from './EntryTile'
import { ENTRY_PREFIX, POOL_ID, TIER_PREFIX, applyMove, buildLayout, computeMove, readableTextColor } from './layout'
import ListSettings from './ListSettings'
import TierSettings from './TierSettings'
import type { Crumb, Entry, Tier, TierListFull } from './types'

const VISIBILITY_LABEL = { public: 'Открытый', friends: 'Для друзей', private: 'Только я' }

/**
 * Цель броска определяется по положению курсора: запись под курсором важнее, чем ряд тира/банк.
 * Если курсор ни над чем — бросок отменяется (запись остаётся на месте).
 */
const collisionDetection: CollisionDetection = (args) => {
  const activeId = String(args.active.id)
  const hits = pointerWithin(args).filter((h) => h.id !== activeId)
  if (hits.length === 0) return []
  const entryHit = hits.find((h) => String(h.id).startsWith(ENTRY_PREFIX))
  return [entryHit ?? hits[0]]
}

/** Банк: зона для нераспределённых записей */
function PoolColumn({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID })
  return (
    <div ref={setNodeRef} className={`flex min-h-[96px] flex-wrap content-start gap-2 p-2 ${isOver ? 'bg-violet-50' : ''}`}>
      {children}
    </div>
  )
}

/** Ряд тира целиком (ярлык + поле с записями) — зона броска */
function TierRow({ tier, children }: { tier: Tier; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: TIER_PREFIX + tier.id })
  return (
    <div ref={setNodeRef} className={`flex border-b border-gray-300 last:border-b-0 ${isOver ? 'ring-2 ring-inset ring-violet-400' : ''}`}>
      <div
        className="flex w-16 shrink-0 items-center justify-center p-1 text-center text-lg font-bold sm:w-20"
        style={{ backgroundColor: tier.color, color: readableTextColor(tier.color) }}
      >
        <span className="break-words">{tier.label}</span>
      </div>
      <div className="flex min-h-[96px] flex-1 flex-wrap content-start gap-2 bg-gray-50 p-2">{children}</div>
    </div>
  )
}

function Inner({ id }: { id: string }) {
  const { user } = useAuth()
  const [data, setData] = useState<TierListFull | null | undefined>(undefined)
  const [crumbs, setCrumbs] = useState<Crumb[]>([])
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [panel, setPanel] = useState<'add' | 'tiers' | 'settings' | null>(null)
  const [openEntryId, setOpenEntryId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  )

  const reload = useCallback(async () => {
    try {
      const d = await fetchTierList(id)
      setData(d)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [id])

  useEffect(() => {
    void reload()
    fetchAncestors(id).then(setCrumbs).catch(() => setCrumbs([]))
  }, [id, reload, user?.id])

  const ownerId = data?.owner_id
  const isOwner = !!user && !!data && user.id === data.owner_id
  useEffect(() => {
    if (ownerId && !isOwner) fetchOwnerName(ownerId).then(setOwnerName).catch(() => setOwnerName(null))
  }, [ownerId, isOwner])

  const layout = useMemo(() => (data ? buildLayout(data.tiers, data.entries) : null), [data])
  const existingItemIds = useMemo(() => new Set((data?.entries ?? []).map((e) => e.item.id)), [data])

  if (error && !data) return <p className="p-6 text-red-600">{error}</p>
  if (data === undefined || !layout) return <p className="p-6">Загрузка…</p>
  if (data === null) {
    return (
      <p className="p-6">
        Тир-лист не найден или скрыт. <Link to="/tierlists" className="text-violet-700 underline">К моим тир-листам</Link>
      </p>
    )
  }

  const list = data
  const openEntry: Entry | undefined = list.entries.find((e) => e.id === openEntryId)
  const dragEntry = dragId ? list.entries.find((e) => ENTRY_PREFIX + e.id === dragId) : undefined

  function tailIndex(tierId: string | null): number {
    return list.entries.filter((e) => e.tier_id === tierId).length
  }

  function onDragStart(e: DragStartEvent) {
    setDragId(String(e.active.id))
  }

  function onDragEnd(e: DragEndEvent) {
    setDragId(null)
    if (!isOwner || !e.over || !layout) return
    const activeId = String(e.active.id).slice(ENTRY_PREFIX.length)
    const move = computeMove(layout, activeId, String(e.over.id))
    if (!move) return
    setData({ ...list, entries: applyMove(list.entries, activeId, move) })
    moveEntry(activeId, move.tierId, move.index).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
      void reload()
    })
  }

  const toggle = (p: 'add' | 'tiers' | 'settings') => setPanel(panel === p ? null : p)
  const tabBtn = (active: boolean) =>
    `rounded border px-3 py-1.5 text-sm ${active ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-gray-300'}`

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <nav className="mb-2 flex flex-wrap items-center gap-1 text-sm text-gray-500">
        {isOwner && (
          <>
            <Link to="/tierlists" className="text-violet-700 underline">Тир-листы</Link>
            <span>/</span>
          </>
        )}
        {crumbs.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <Link to={`/tierlists/${c.id}`} className="text-violet-700 underline">{c.title}</Link>
            <span>/</span>
          </span>
        ))}
        <span className="text-gray-700">{list.title}</span>
      </nav>

      <div className="mb-4">
        <h1 className="text-2xl font-bold">{list.title}</h1>
        <p className="text-sm text-gray-500">
          {VISIBILITY_LABEL[list.visibility]}
          {!isOwner && ownerName && (
            <>
              {' · автор '}
              <Link to={`/u/${ownerName}`} className="text-violet-700 underline">@{ownerName}</Link>
            </>
          )}
        </p>
        {list.note && <p className="mt-1 whitespace-pre-wrap text-sm">{list.note}</p>}
        {list.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {list.tags.map((t) => (
              <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">#{t}</span>
            ))}
          </div>
        )}
      </div>

      {isOwner && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" className={tabBtn(panel === 'add')} onClick={() => toggle('add')}>＋ Элементы</button>
          <button type="button" className={tabBtn(panel === 'tiers')} onClick={() => toggle('tiers')}>Тиры</button>
          <button type="button" className={tabBtn(panel === 'settings')} onClick={() => toggle('settings')}>Настройки</button>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {isOwner && panel === 'add' && (
        <AddEntries listId={list.id} existingItemIds={existingItemIds} poolLength={layout.pool.length} onChanged={reload} />
      )}
      {isOwner && panel === 'tiers' && <TierSettings listId={list.id} tiers={list.tiers} onChanged={reload} />}
      {isOwner && panel === 'settings' && <ListSettings list={list} onChanged={reload} />}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragId(null)}
      >
        <div className="overflow-hidden rounded-lg border border-gray-300">
          {layout.tiers.map(({ tier, entries }) => (
            <TierRow key={tier.id} tier={tier}>
              {entries.map((e) => (
                <EntryTile key={e.id} entry={e} editable={isOwner} onOpen={(en) => setOpenEntryId(en.id)} />
              ))}
            </TierRow>
          ))}
          {layout.tiers.length === 0 && <p className="p-4 text-sm text-gray-500">В этом тир-листе нет тиров.</p>}
        </div>

        <h2 className="mb-2 mt-6 font-semibold">
          Банк <span className="text-sm font-normal text-gray-500">(не расставлено: {layout.pool.length})</span>
        </h2>
        <div className="rounded-lg border border-dashed border-gray-300">
          <PoolColumn>
            {layout.pool.map((e) => (
              <EntryTile key={e.id} entry={e} editable={isOwner} onOpen={(en) => setOpenEntryId(en.id)} />
            ))}
            {layout.pool.length === 0 && (
              <p className="p-2 text-sm text-gray-400">{isOwner ? 'Пусто. Добавьте элементы кнопкой «＋ Элементы».' : 'Пусто.'}</p>
            )}
          </PoolColumn>
        </div>

        <DragOverlay>{dragEntry ? <EntryTileView entry={dragEntry} overlay /> : null}</DragOverlay>
      </DndContext>

      {isOwner && list.entries.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          Перетаскивайте элементы между тирами. На телефоне — зажмите элемент на секунду или нажмите на него и выберите «Переместить в».
        </p>
      )}

      {openEntry && (
        <EntryPanel
          key={openEntry.id}
          entry={openEntry}
          editable={isOwner}
          tiers={[...list.tiers].sort((a, b) => a.position - b.position)}
          tailIndex={tailIndex}
          onClose={() => setOpenEntryId(null)}
          onChanged={reload}
        />
      )}
    </div>
  )
}

export default function TierListPage() {
  const { id } = useParams()
  if (!id) return null
  return <Inner key={id} id={id} />
}
