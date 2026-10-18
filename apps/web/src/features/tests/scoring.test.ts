import { describe, expect, it } from 'vitest'
import { getTest, tests } from './registry'
import { isComplete, scoreTest } from './scoring'
import type { Answers, Test } from './types'

function must(slug: string): Test {
  const t = getTest(slug)
  if (!t) throw new Error(`Тест ${slug} не найден`)
  return t
}

/** Ответы, дающие максимум по каждой шкале (с учётом обратных ключей) */
function maxAnswers(test: Test): Answers {
  const a: Answers = {}
  for (const i of test.items) a[i.id] = i.reverse ? test.scaleMin : test.scaleMax
  return a
}

function fill(test: Test, value: number): Answers {
  const a: Answers = {}
  for (const i of test.items) a[i.id] = value
  return a
}

describe('целостность контента', () => {
  it('тесты загружены', () => {
    expect(tests.length).toBeGreaterThanOrEqual(4)
  })

  for (const test of tests) {
    it(`${test.slug}: id вопросов уникальны, шкалы существуют`, () => {
      const ids = test.items.map((i) => i.id)
      expect(new Set(ids).size).toBe(ids.length)
      const keys =
        test.scoring === 'dichotomies'
          ? test.dichotomies.map((d) => d.key)
          : test.scales.map((s) => s.key)
      for (const item of test.items) expect(keys).toContain(item.scale)
      for (const k of keys) expect(test.items.some((i) => i.scale === k)).toBe(true)
    })
  }
})

describe('подсчёт баллов', () => {
  it('неполные ответы отклоняются', () => {
    const t = must('ocean-tipi')
    expect(isComplete(t, {})).toBe(false)
    expect(() => scoreTest(t, {})).toThrow()
  })

  it('OCEAN: максимум = 100, середина = 50', () => {
    const t = must('ocean-tipi')
    const max = scoreTest(t, maxAnswers(t))
    const mid = scoreTest(t, fill(t, 3))
    if (max.scoring !== 'scales' || mid.scoring !== 'scales') throw new Error('тип результата')
    for (const v of Object.values(max.percents)) expect(v).toBe(100)
    for (const v of Object.values(mid.percents)) expect(v).toBe(50)
  })

  it('16 типов: согласие с «обратным» пунктом даёт ВТОРОЙ полюс (регрессия бага старого проекта)', () => {
    const t = must('types-16')
    const a = fill(t, 3)
    // mbti_2 «Я предпочитаю одиночество» и mbti_4 — reverse; mbti_1, mbti_3 — прямые
    a['mbti_1'] = 1
    a['mbti_2'] = 5
    a['mbti_3'] = 1
    a['mbti_4'] = 5
    const r = scoreTest(t, a)
    if (r.scoring !== 'dichotomies') throw new Error('тип результата')
    expect(r.percents.I).toBe(100)
    expect(r.percents.E).toBe(0)
    expect(r.code[0]).toBe('I')
  })

  it('16 типов: ничья в пользу первого полюса, есть стек функций', () => {
    const t = must('types-16')
    const r = scoreTest(t, fill(t, 3))
    if (r.scoring !== 'dichotomies' || t.scoring !== 'dichotomies') throw new Error('тип')
    expect(r.code).toBe('ESTJ')
    expect(t.types[r.code]).toHaveLength(4)
  })

  it('16 типов: все 16 кодов имеют стек', () => {
    const t = must('types-16')
    if (t.scoring !== 'dichotomies') throw new Error('тип')
    expect(Object.keys(t.types)).toHaveLength(16)
  })

  it('Эннеаграмма: главный тип и крыло', () => {
    const t = must('enneagram')
    const a = fill(t, 1)
    for (const i of t.items) {
      if (i.scale === '5') a[i.id] = 5
      if (i.scale === '6') a[i.id] = 3
    }
    const r = scoreTest(t, a)
    if (r.scoring !== 'enneagram') throw new Error('тип результата')
    expect(r.main).toBe(5)
    expect(r.wing).toBe(6)
    expect(r.label).toBe('5w6')
  })

  it('Эннеаграмма: крыло для типа 1 и 9 замыкается по кругу', () => {
    const t = must('enneagram')
    const a = fill(t, 1)
    for (const i of t.items) {
      if (i.scale === '9') a[i.id] = 5
      if (i.scale === '1') a[i.id] = 4
    }
    const r = scoreTest(t, a)
    if (r.scoring !== 'enneagram') throw new Error('тип результата')
    expect(r.label).toBe('9w1')
  })
})
