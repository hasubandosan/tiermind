import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteTierList, updateTierList } from './api'
import { parseTags } from './layout'
import type { TierListFull, Visibility } from './types'

export default function ListSettings({ list, onChanged }: { list: TierListFull; onChanged: () => Promise<void> }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(list.title)
  const [note, setNote] = useState(list.note ?? '')
  const [tags, setTags] = useState(list.tags.join(', '))
  const [visibility, setVisibility] = useState<Visibility>(list.visibility)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function save() {
    const t = title.trim()
    if (!t) return setError('Введите название')
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await updateTierList(list.id, { title: t, note: note.trim() || null, tags: parseTags(tags), visibility })
      await onChanged()
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  async function remove() {
    if (!window.confirm(`Удалить тир-лист «${list.title}»? Вложенные тир-листы останутся, но отвяжутся от него.`)) return
    setBusy(true)
    try {
      await deleteTierList(list.id)
      navigate('/tierlists')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  const field = 'mt-1 w-full rounded border border-gray-300 p-2 font-normal'
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <h2 className="font-semibold">Настройки тир-листа</h2>
      <label className="text-sm font-medium">
        Название
        <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className={field} />
      </label>
      <label className="text-sm font-medium">
        Описание <span className="font-normal text-gray-500">(до 300 символов)</span>
        <textarea value={note} maxLength={300} rows={2} onChange={(e) => setNote(e.target.value)} className={field} />
      </label>
      <label className="text-sm font-medium">
        Теги <span className="font-normal text-gray-500">(через запятую, до 10)</span>
        <input value={tags} onChange={(e) => setTags(e.target.value)} className={field} />
      </label>
      <label className="text-sm font-medium">
        Кто видит
        <select value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)} className={field}>
          <option value="private">Только я</option>
          <option value="friends">Друзья</option>
          <option value="public">Все (по ссылке и в профиле)</option>
        </select>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700">Сохранено</p>}
      <div className="flex items-center gap-4">
        <button type="button" disabled={busy} onClick={save} className="rounded bg-violet-600 px-4 py-2 font-medium text-white disabled:opacity-50">
          Сохранить
        </button>
        <button type="button" disabled={busy} onClick={remove} className="text-sm text-red-600 underline disabled:opacity-50">
          Удалить тир-лист
        </button>
      </div>
    </div>
  )
}
