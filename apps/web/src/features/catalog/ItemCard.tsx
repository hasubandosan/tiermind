import { Link } from 'react-router-dom'
import ItemImage from './ItemImage'
import RatingButtons from './RatingButtons'
import type { CatalogItem, Rating } from './types'

export default function ItemCard({
  item,
  canRate,
  showCategory,
  onRate,
}: {
  item: CatalogItem
  canRate: boolean
  showCategory?: boolean
  onRate: (item: CatalogItem, value: Rating | null) => void
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-gray-200 p-3">
      <ItemImage key={item.image_url ?? 'none'} url={item.image_url} emoji={item.category_emoji} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.title}</p>
        {item.subtitle && <p className="truncate text-sm text-gray-500">{item.subtitle}</p>}
        {showCategory && (
          <p className="text-xs text-gray-400">
            {item.category_emoji} {item.category_name}
          </p>
        )}
        <div className="mt-2">
          {canRate ? (
            <RatingButtons value={item.my_rating} onChange={(v) => onRate(item, v)} />
          ) : (
            <p className="text-xs text-gray-500">
              <Link to="/login" className="text-violet-700 underline">Войдите</Link>, чтобы оценить
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
