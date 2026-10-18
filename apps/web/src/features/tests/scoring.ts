import type { Answers, Test, TestResult } from './types'

/** Значение ответа с учётом обратного ключа */
function itemValue(test: Test, reverse: boolean, answer: number): number {
  return reverse ? test.scaleMin + test.scaleMax - answer : answer
}

function toPercent(test: Test, mean: number): number {
  return Math.round(((mean - test.scaleMin) / (test.scaleMax - test.scaleMin)) * 100)
}

/** Среднее по каждой шкале (по ключу item.scale) */
function meansByScale(test: Test, answers: Answers): Record<string, number> {
  const sums: Record<string, number> = {}
  const counts: Record<string, number> = {}
  for (const item of test.items) {
    const a = answers[item.id]
    sums[item.scale] = (sums[item.scale] ?? 0) + itemValue(test, item.reverse, a)
    counts[item.scale] = (counts[item.scale] ?? 0) + 1
  }
  const means: Record<string, number> = {}
  for (const key of Object.keys(sums)) means[key] = sums[key] / counts[key]
  return means
}

export function isComplete(test: Test, answers: Answers): boolean {
  return test.items.every((item) => {
    const a = answers[item.id]
    return Number.isInteger(a) && a >= test.scaleMin && a <= test.scaleMax
  })
}

export function scoreTest(test: Test, answers: Answers): TestResult {
  if (!isComplete(test, answers)) {
    throw new Error('Ответы заполнены не полностью')
  }
  const means = meansByScale(test, answers)

  if (test.scoring === 'scales') {
    const percents: Record<string, number> = {}
    for (const s of test.scales) percents[s.key] = toPercent(test, means[s.key])
    return { scoring: 'scales', percents }
  }

  if (test.scoring === 'dichotomies') {
    // Для пункта: высокий балл = ПЕРВЫЙ полюс; reverse=true — высокий балл = ВТОРОЙ полюс
    const percents: Record<string, number> = {}
    let code = ''
    for (const d of test.dichotomies) {
      const first = toPercent(test, means[d.key])
      percents[d.poles[0]] = first
      percents[d.poles[1]] = 100 - first
      code += first >= 50 ? d.poles[0] : d.poles[1]
    }
    return { scoring: 'dichotomies', code, percents }
  }

  // enneagram
  const percents: Record<string, number> = {}
  for (const s of test.scales) percents[s.key] = toPercent(test, means[s.key])
  let main = 1
  for (let i = 2; i <= 9; i++) {
    if (percents[String(i)] > percents[String(main)]) main = i
  }
  const prev = main === 1 ? 9 : main - 1
  const next = main === 9 ? 1 : main + 1
  const wing = percents[String(prev)] >= percents[String(next)] ? prev : next
  return { scoring: 'enneagram', main, wing, label: `${main}w${wing}`, percents }
}
