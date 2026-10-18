import { useState } from 'react'

export default function ItemImage({ url, emoji, size = 72 }: { url: string | null; emoji: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size }

  if (!url || failed) {
    return (
      <div style={style} className="flex shrink-0 items-center justify-center rounded bg-gray-100 text-2xl">
        {emoji}
      </div>
    )
  }
  return (
    <img
      src={url}
      alt=""
      style={style}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 rounded object-cover"
    />
  )
}
