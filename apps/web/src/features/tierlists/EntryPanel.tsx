import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ItemImage from '../catalog/ItemImage'
import { createChildTierList, moveEntry, removeEntry, unlinkChild, updateEntryNote } from './api'
import type { Entry, Tier } from './types'

/** Окно с подробностями записи: заметка, перенос в другой тир (удобно на телефоне), вложенный тир-лист */
export default function EntryPanel({
  entry,
  editable,
  tiers,
  tailIndex,
  onClose,
  onChanged,
}: {
  entry: Entry
  editable: boolean
  tiers: Tier[]
  /** Сколько записей сейчас в каждой колонке: нужно, чтобы «переместить» ставило запись в конец */
  tailIndex: (tierId: string | null) => number
  onClose: () => void
  onChanged: () => Promise<void>
}) {
  const navigate = useNavigate()
  const [note, setNote] = useState(entry.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>, close = false) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onChanged()
      if (close) onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  async function createChild() {
    setBusy(true)
    setError(null)
    try {
      const id = await createChildTierList(entry.id)
      navigate(`/tierlists/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  const btn = 'rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-lg bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex gap-3">
          <ItemImage url={entry.item.image_url} emoji={entry.item.category_emoji} size={80} />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{entry.item.title}</h2>
            {entry.item.subtitle && <p className="text-sm text-gray-500">{entry.item.subtitle}</p>}
            <p className="text-xs text-gray-400">
              {entry.item.category_emoji} {entry.item.category_name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="self-start text-xl leading-none text-gray-400" aria-label="Закрыть">
            ×
          </button>
        </div>

        {editable ? (
          <label className="mb-4 block text-sm font-medium">
            Заметка <span className="font-normal text-gray-500">(видна при наведении)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              rows={3}
              className="mt-1 w-full rounded border border-gray-300 p-2 font-normal"
            />
            <button
              type="button"
              disabled={busy || note.trim() === (entry.note ?? '')}
              onClick={() => run(() => updateEntryNote(entry.id, note.trim() || null))}
              className={`${btn} mt-1`}
            >
              Сохранить заметку
            </button>
          </label>
        ) : (
          entry.note && <p className="mb-4 whitespace-pre-wrap text-sm">{entry.note}</p>
        )}

        {editable && (
          <label className="mb-4 block text-sm font-medium">
            Переместить в
            <select
              value={entry.tier_id ?? ''}
              disabled={busy}
              onChange={(e) => {
                const tierId = e.target.value || null
                void run(() => moveEntry(entry.id, tierId, tailIndex(tierId)), true)
              }}
              className="mt-1 w-full rounded border border-gray-300 p-2 font-normal"
            >
              <option value="">Банк (не расставлено)</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mb-4 rounded border border-gray-200 p-3 text-sm">
          <p className="mb-2 font-medium">Вложенный тир-лист</p>
          {entry.child_tierlist_id ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link to={`/tierlists/${entry.child_tierlist_id}`} className="rounded bg-violet-600 px-3 py-1.5 font-medium text-white">
                Открыть 📂
              </Link>
              {editable && (
                <button type="button" disabled={busy} className={btn} onClick={() => run(() => unlinkChild(entry.id))}>
                  Отвязать
                </button>
              )}
            </div>
          ) : editable ? (
            <button type="button" disabled={busy} className={btn} onClick={createChild}>
              Создать вложенный тир-лист
            </button>
          ) : (
            <p className="text-gray-500">Нет</p>
          )}
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {editable && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => removeEntry(entry.id), true)}
            className="text-sm text-red-600 underline disabled:opacity-50"
          >
            Убрать из тир-листа
          </button>
        )}
      </div>
    </div>
  )
}
