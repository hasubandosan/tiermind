import type { Test } from './types'

// Каждый файл в src/content/tests/*.json — один тест. Новый тест = новый JSON-файл.
const modules = import.meta.glob<Test>('../../content/tests/*.json', {
  eager: true,
  import: 'default',
})

export const tests: Test[] = Object.values(modules).sort((a, b) => a.order - b.order)

export function getTest(slug: string): Test | undefined {
  return tests.find((t) => t.slug === slug)
}
