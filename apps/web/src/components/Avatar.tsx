export default function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const letter = (name.trim()[0] ?? '?').toUpperCase()
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-violet-100 font-semibold text-violet-700"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden="true"
    >
      {letter}
    </div>
  )
}
