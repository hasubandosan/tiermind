import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { createItem, uploadItemImage } from './api'
import { resizeImage } from './image'
import type { Category } from './types'

export default function AddItemForm({
  categories,
  defaultCategorySlug,
  defaultTitle,
  onCreated,
  onCancel,
}: {
  categories: Category[]
  defaultCategorySlug: string | null
  defaultTitle: string
  onCreated: (categorySlug: string, title: string) => void
  onCancel: () => void
}) {
  const { user } = useAuth()
  const [slug, setSlug] = useState(defaultCategorySlug ?? categories[0]?.slug ?? '')
  const [title, setTitle] = useState(defaultTitle)
  const [subtitle, setSubtitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const category = categories.find((c) => c.slug === slug)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !category) return
    setError(null)

    const t = title.trim()
    const st = subtitle.trim()
    const url = imageUrl.trim()
    if (!t) return setError('Введите название')
    if (t.length > 120 || st.length > 120) return setError('Не больше 120 символов')
    if (url && !/^https:\/\//i.test(url)) return setError('Ссылка на картинку должна начинаться с https://')

    setBusy(true)
    try {
      let finalUrl: string | null = url || null
      if (file) {
        const blob = await resizeImage(file)
        finalUrl = await uploadItemImage(user.id, blob)
      }
      await createItem({
        userId: user.id,
        categoryId: category.id,
        title: t,
        subtitle: st || null,
        imageUrl: finalUrl,
      })
      onCreated(category.slug, t)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    setBusy(false)
  }

  const field = 'mt-1 w-full rounded border border-gray-300 p-2 font-normal'

  return (
    <form onSubmit={onSubmit} className="mb-4 flex flex-col gap-3 rounded-lg border border-violet-200 bg-violet-50 p-4">
      <h2 className="font-semibold">Новый элемент каталога</h2>
      <label className="text-sm font-medium">
        Категория
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className={field}>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Название
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={field} />
      </label>
      <label className="text-sm font-medium">
        {category?.subtitle_label ?? 'Уточнение'} <span className="font-normal text-gray-500">(необязательно)</span>
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={120} className={field} />
      </label>
      <div className="text-sm font-medium">
        Изображение <span className="font-normal text-gray-500">(необязательно)</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm font-normal"
        />
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="…или ссылка https://…"
          disabled={file !== null}
          className={`${field} disabled:opacity-50`}
        />
        <p className="mt-1 text-xs font-normal text-gray-500">
          Загруженная картинка автоматически уменьшается. Пока элемент никто кроме вас не оценил, его можно будет править.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="rounded bg-violet-600 px-4 py-2 font-medium text-white disabled:opacity-50">
          {busy ? 'Сохраняю…' : 'Добавить'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-600 underline">
          Отмена
        </button>
      </div>
    </form>
  )
}
