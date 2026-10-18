import type { Test, TestResult } from './types'

function Bar({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{percent}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-violet-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export default function ResultView({ test, result }: { test: Test; result: TestResult }) {
  if (test.scoring === 'scales' && result.scoring === 'scales') {
    return (
      <div>
        {test.scales.map((s) => (
          <Bar key={s.key} label={s.label} percent={result.percents[s.key] ?? 0} />
        ))}
      </div>
    )
  }

  if (test.scoring === 'dichotomies' && result.scoring === 'dichotomies') {
    const stack = test.types[result.code]
    return (
      <div>
        <p className="mb-4 text-4xl font-bold tracking-widest text-violet-700">{result.code}</p>
        {test.dichotomies.map((d) => (
          <div key={d.key} className="mb-4">
            <div className="mb-1 flex justify-between text-sm">
              <span>
                {d.labels[0]} ({d.poles[0]}) {result.percents[d.poles[0]]}%
              </span>
              <span>
                {result.percents[d.poles[1]]}% {d.labels[1]} ({d.poles[1]})
              </span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-200">
              <div className="bg-violet-600" style={{ width: `${result.percents[d.poles[0]]}%` }} />
              <div className="bg-violet-300" style={{ width: `${result.percents[d.poles[1]]}%` }} />
            </div>
          </div>
        ))}
        {stack && (
          <p className="mt-4 text-sm text-gray-700">
            Стек функций: <span className="font-medium">{stack.join(' → ')}</span>
          </p>
        )}
      </div>
    )
  }

  if (test.scoring === 'enneagram' && result.scoring === 'enneagram') {
    const info = test.types[String(result.main)]
    return (
      <div>
        <p className="text-4xl font-bold text-violet-700">{result.label}</p>
        {info && (
          <div className="mb-4 mt-2 text-sm text-gray-700">
            <p className="font-medium">Тип {result.main}: {info.name}</p>
            <p>Страсть: {info.passion}</p>
            <p>Базовый страх: {info.fear}</p>
          </div>
        )}
        {test.scales.map((s) => (
          <Bar key={s.key} label={`Тип ${s.key}: ${s.label}`} percent={result.percents[s.key] ?? 0} />
        ))}
      </div>
    )
  }

  return <p className="text-sm text-red-600">Результат не подходит к этому тесту (возможно, тест был обновлён).</p>
}
