import { useMemo } from 'react'
import { compareTest, comparePrefs, compareTiers, overallPairs } from './compare'
import type { GroupData } from './types'
import { PairList, ScoreBadge, nameMap } from './ui'

export default function OverviewTab({ data }: { data: GroupData }) {
  const joined = data.members.filter((m) => m.status === 'joined')
  const names = useMemo(() => nameMap(data.members), [data.members])

  const pairs = useMemo(() => {
    const slugs = [...new Set(data.tests.map((t) => t.test_slug))]
    return overallPairs(
      joined.map((m) => m.user_id),
      slugs.map((s) => compareTest(data.tests, s)),
      comparePrefs(data.prefs),
      compareTiers(data.tiers),
    )
  }, [data, joined])

  const scored = pairs.filter((p) => p.score !== null)
  const best = [...scored].sort((x, y) => y.score! - x.score!)[0]
  const worst = [...scored].sort((x, y) => x.score! - y.score!)[0]
  const get = (a: string, b: string) => pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a))

  const attachCount = (uid: string) => data.attachments.filter((a) => a.user_id === uid).length

  return (
    <div>
      <h2 className="mb-2 font-semibold">Совпадение интересов</h2>
      {joined.length < 2 ? (
        <p className="mb-4 text-sm text-gray-600">В группе пока один участник. Пригласите друзей на вкладке «Участники».</p>
      ) : (
        <>
          <div className="mb-4 overflow-x-auto">
            <table className="border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-1" />
                  {joined.map((m) => (
                    <th key={m.user_id} className="max-w-[6rem] truncate p-1 text-xs font-medium">
                      {names.get(m.user_id)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {joined.map((r) => (
                  <tr key={r.user_id}>
                    <th className="max-w-[7rem] truncate p-1 pr-2 text-left text-xs font-medium">{names.get(r.user_id)}</th>
                    {joined.map((c) => (
                      <td key={c.user_id} className="p-0.5 text-center">
                        {r.user_id === c.user_id ? (
                          <span className="text-gray-300">·</span>
                        ) : (
                          <span title={(() => {
                            const p = get(r.user_id, c.user_id)
                            return p ? `тесты: ${p.parts.tests ?? '—'}, предпочтения: ${p.parts.prefs ?? '—'}, тир-листы: ${p.parts.tiers ?? '—'}` : ''
                          })()}>
                            <ScoreBadge score={get(r.user_id, c.user_id)?.score ?? null} />
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {best && worst && best !== worst && (
            <div className="mb-4 text-sm">
              <p>
                🤝 Ближе всего: <b>{names.get(best.a)}</b> и <b>{names.get(best.b)}</b> — {best.score}%
              </p>
              <p>
                🧭 Больше всего различий: <b>{names.get(worst.a)}</b> и <b>{names.get(worst.b)}</b> — {worst.score}%
              </p>
            </div>
          )}
          {best && best === worst && (
            <p className="mb-4 text-sm">
              🤝 <b>{names.get(best.a)}</b> и <b>{names.get(best.b)}</b> совпадают на {best.score}%
            </p>
          )}
          {scored.length === 0 && (
            <p className="mb-4 text-sm text-gray-600">
              Пока не хватает общих данных: нужно, чтобы участники поделились результатами тестов или предпочтениями (не меньше 3 общих элементов) либо прикрепили тир-листы.
            </p>
          )}
        </>
      )}

      <h2 className="mb-2 mt-6 font-semibold">Чем делятся участники</h2>
      <ul className="flex flex-col gap-1.5 text-sm">
        {joined.map((m) => (
          <li key={m.user_id}>
            <b>{names.get(m.user_id)}</b>: {m.share_tests ? '✓ тесты' : '✗ тесты'} · {m.share_preferences ? '✓ предпочтения' : '✗ предпочтения'} · тир-листов: {attachCount(m.user_id)}
          </li>
        ))}
      </ul>

      {scored.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 font-semibold">Все пары</h2>
          <PairList pairs={pairs} names={names} emptyText="Нет пар" />
        </>
      )}
      <p className="mt-6 text-xs text-gray-400">
        Общий процент — среднее по доступным составляющим (тесты, предпочтения, тир-листы). Наведите на ячейку, чтобы увидеть составляющие.
      </p>
    </div>
  )
}
