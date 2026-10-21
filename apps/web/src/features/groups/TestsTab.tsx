import { useMemo } from 'react'
import { getTest } from '../tests/registry'
import type { Test } from '../tests/types'
import { compareTest } from './compare'
import type { GroupData, GroupTestRow } from './types'
import { PairList, nameMap } from './ui'

function columns(test: Test): { head: string; cell: (r: GroupTestRow) => string }[] {
  const p = (r: GroupTestRow, k: string) => r.scores.percents[k]
  if (test.scoring === 'scales') {
    return test.scales.map((s) => ({ head: s.label, cell: (r) => (p(r, s.key) === undefined ? '—' : `${p(r, s.key)}%`) }))
  }
  if (test.scoring === 'dichotomies') {
    return [
      { head: 'Тип', cell: (r) => (r.scores.scoring === 'dichotomies' ? r.scores.code : '—') },
      ...test.dichotomies.map((d) => ({
        head: `${d.poles[0]} / ${d.poles[1]}`,
        cell: (r: GroupTestRow) => (p(r, d.poles[0]) === undefined ? '—' : `${p(r, d.poles[0])}% / ${p(r, d.poles[1])}%`),
      })),
    ]
  }
  return [{ head: 'Тип', cell: (r) => (r.scores.scoring === 'enneagram' ? r.scores.label : '—') }]
}

export default function TestsTab({ data }: { data: GroupData }) {
  const names = useMemo(() => nameMap(data.members), [data.members])
  const slugs = useMemo(() => [...new Set(data.tests.map((t) => t.test_slug))], [data.tests])
  const notSharing = data.members.filter((m) => m.status === 'joined' && !m.share_tests)

  const blocks = slugs
    .map((slug) => ({ slug, test: getTest(slug) }))
    .filter((b): b is { slug: string; test: Test } => !!b.test)
    .sort((a, b) => a.test.order - b.test.order)

  return (
    <div>
      {blocks.length === 0 && (
        <p className="text-sm text-gray-600">Пока никто не поделился результатами тестов (или их ещё не проходили).</p>
      )}
      {blocks.map(({ slug, test }) => {
        const rows = data.tests.filter((t) => t.test_slug === slug)
        const cols = columns(test)
        return (
          <section key={slug} className="mb-8">
            <h2 className="mb-1 font-semibold">
              {test.title}{' '}
              <span className="text-xs font-normal text-gray-500">{test.kind === 'scientific' ? 'научный' : 'развлекательный'}</span>
            </h2>
            <div className="mb-3 overflow-x-auto">
              <table className="border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="p-1.5">Участник</th>
                    {cols.map((c) => (
                      <th key={c.head} className="p-1.5 font-medium">{c.head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.user_id} className="border-t border-gray-100">
                      <td className="p-1.5 font-medium">{names.get(r.user_id)}</td>
                      {cols.map((c) => (
                        <td key={c.head} className="whitespace-nowrap p-1.5">{c.cell(r)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length >= 2 ? (
              <PairList pairs={compareTest(data.tests, slug)} names={names} emptyText="" />
            ) : (
              <p className="text-sm text-gray-500">Нужны результаты хотя бы двух участников, чтобы сравнивать.</p>
            )}
            {test.kind === 'entertainment' && <p className="mt-1 text-xs text-gray-400">Развлекательный тест: сравнение ради интереса.</p>}
          </section>
        )
      })}
      {notSharing.length > 0 && (
        <p className="text-xs text-gray-500">Не делятся результатами: {notSharing.map((m) => m.display_name || m.username).join(', ')}.</p>
      )}
    </div>
  )
}
