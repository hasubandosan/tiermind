import { useDraggable, useDroppable } from '@dnd-kit/core'
import ItemImage from '../catalog/ItemImage'
import { ENTRY_PREFIX } from './layout'
import type { Entry } from './types'

export function EntryTileView({ entry, faded, overlay }: { entry: Entry; faded?: boolean; overlay?: boolean }) {
  return (
    <div
      title={[entry.item.title, entry.item.subtitle, entry.note].filter(Boolean).join(' — ')}
      className={`relative w-[76px] select-none ${faded ? 'opacity-30' : ''} ${overlay ? 'cursor-grabbing shadow-lg' : ''}`}
    >
      <ItemImage key={entry.item.image_url ?? 'none'} url={entry.item.image_url} emoji={entry.item.category_emoji} size={76} />
      <p className="mt-0.5 line-clamp-2 text-center text-[11px] leading-tight">{entry.item.title}</p>
      {(entry.child_tierlist_id || entry.note) && (
        <div className="absolute right-0.5 top-0.5 flex gap-0.5 text-xs">
          {entry.child_tierlist_id && <span className="rounded bg-white/90 px-0.5">📂</span>}
          {entry.note && <span className="rounded bg-white/90 px-0.5">📝</span>}
        </div>
      )}
    </div>
  )
}

export default function EntryTile({
  entry,
  editable,
  onOpen,
}: {
  entry: Entry
  editable: boolean
  onOpen: (entry: Entry) => void
}) {
  const id = ENTRY_PREFIX + entry.id
  const drag = useDraggable({ id, disabled: !editable })
  const drop = useDroppable({ id })

  return (
    <div
      ref={(el) => {
        drag.setNodeRef(el)
        drop.setNodeRef(el)
      }}
      {...drag.listeners}
      {...drag.attributes}
      onClick={() => onOpen(entry)}
      className={editable ? 'cursor-grab' : 'cursor-pointer'}
    >
      <EntryTileView entry={entry} faded={drag.isDragging} />
    </div>
  )
}
