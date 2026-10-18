import type { Visibility } from './types'

export default function VisibilitySelect({
  value,
  onChange,
  disabled,
}: {
  value: Visibility
  onChange: (v: Visibility) => void
  disabled?: boolean
}) {
  return (
    <label className="text-sm">
      Кто видит этот результат:{' '}
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as Visibility)}
        className="ml-1 rounded border border-gray-300 p-1"
      >
        <option value="private">Только я</option>
        <option value="friends">Друзья</option>
        <option value="public">Все</option>
      </select>
    </label>
  )
}
