export type TestKind = 'scientific' | 'entertainment'
export type Visibility = 'public' | 'friends' | 'private'

export type TestItem = {
  id: string
  text: string
  /** Ключ шкалы (для 16 типов — ключ пары, напр. "EI"; для эннеаграммы — номер типа) */
  scale: string
  /** true — согласие с пунктом говорит о ПРОТИВОПОЛОЖНОМ полюсе / низком значении шкалы */
  reverse: boolean
}

type TestBase = {
  slug: string
  version: number
  order: number
  kind: TestKind
  title: string
  description: string
  source: string
  note?: string
  scaleMin: number
  scaleMax: number
  items: TestItem[]
}

export type ScaleDef = { key: string; label: string }

export type ScalesTest = TestBase & {
  scoring: 'scales'
  scales: ScaleDef[]
}

export type DichotomiesTest = TestBase & {
  scoring: 'dichotomies'
  dichotomies: { key: string; poles: [string, string]; labels: [string, string] }[]
  /** Код типа -> стек функций [доминантная, вспомогательная, третичная, слабая] */
  types: Record<string, [string, string, string, string]>
}

export type EnneagramTest = TestBase & {
  scoring: 'enneagram'
  scales: ScaleDef[]
  types: Record<string, { name: string; passion: string; fear: string }>
}

export type Test = ScalesTest | DichotomiesTest | EnneagramTest

export type Answers = Record<string, number>

export type ScalesResult = { scoring: 'scales'; percents: Record<string, number> }
export type DichotomiesResult = {
  scoring: 'dichotomies'
  code: string
  /** Проценты по каждому полюсу (E, I, S, N ...) */
  percents: Record<string, number>
}
export type EnneagramResult = {
  scoring: 'enneagram'
  main: number
  wing: number
  label: string
  percents: Record<string, number>
}

export type TestResult = ScalesResult | DichotomiesResult | EnneagramResult
