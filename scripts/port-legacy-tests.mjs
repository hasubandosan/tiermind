// Одноразовый скрипт: переносит вопросы из legacy/psycho_soc в apps/web/src/content/tests/*.json
// Запуск из корня репозитория:  node scripts/port-legacy-tests.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const root = process.cwd()
const legacyData = (name) => pathToFileURL(path.join(root, 'legacy/psycho_soc/src/data', name)).href
const outDir = path.join(root, 'apps/web/src/content/tests')

const load = async (name) => (await import(legacyData(name))).default
const convert = (questions) =>
  questions.map((q) => ({ id: q.id, text: q.text, scale: String(q.scale), reverse: Boolean(q.reversed) }))

const common = { version: 1, scaleMin: 1, scaleMax: 5 }

const FUNCTION_STACKS = {
  INTJ: ['Ni', 'Te', 'Fi', 'Se'], INTP: ['Ti', 'Ne', 'Si', 'Fe'],
  ENTJ: ['Te', 'Ni', 'Se', 'Fi'], ENTP: ['Ne', 'Ti', 'Fe', 'Si'],
  INFJ: ['Ni', 'Fe', 'Ti', 'Se'], INFP: ['Fi', 'Ne', 'Si', 'Te'],
  ENFJ: ['Fe', 'Ni', 'Se', 'Ti'], ENFP: ['Ne', 'Fi', 'Te', 'Si'],
  ISTJ: ['Si', 'Te', 'Fi', 'Ne'], ISFJ: ['Si', 'Fe', 'Ti', 'Ne'],
  ESTJ: ['Te', 'Si', 'Ne', 'Fi'], ESFJ: ['Fe', 'Si', 'Ne', 'Ti'],
  ISTP: ['Ti', 'Se', 'Ni', 'Fe'], ISFP: ['Fi', 'Se', 'Ni', 'Te'],
  ESTP: ['Se', 'Ti', 'Fe', 'Ni'], ESFP: ['Se', 'Fi', 'Te', 'Ni'],
}

const ENNEAGRAM_TYPES = {
  1: { name: 'Перфекционист (Реформатор)', passion: 'Гнев', fear: 'Быть плохим/несовершенным' },
  2: { name: 'Помощник', passion: 'Гордость', fear: 'Быть нелюбимым/ненужным' },
  3: { name: 'Достигатель', passion: 'Тщеславие', fear: 'Быть никем/неудачником' },
  4: { name: 'Индивидуалист (Романтик)', passion: 'Зависть', fear: 'Быть обычным/незначительным' },
  5: { name: 'Наблюдатель (Мыслитель)', passion: 'Жадность', fear: 'Быть поглощенным/опустошенным' },
  6: { name: 'Скептик (Лоялист)', passion: 'Страх', fear: 'Быть без поддержки/безопасности' },
  7: { name: 'Энтузиаст', passion: 'Обжорство', fear: 'Быть ограниченным/страдать' },
  8: { name: 'Вызывающий (Лидер)', passion: 'Похоть', fear: 'Быть уязвимым/контролируемым' },
  9: { name: 'Миротворец', passion: 'Лень', fear: 'Потерять покой/быть в конфликте' },
}

const tests = {
  'ocean-tipi': {
    ...common, slug: 'ocean-tipi', order: 1, kind: 'scientific', scoring: 'scales',
    title: 'Большая пятёрка (краткая версия)',
    description: 'Пять базовых черт личности: открытость, добросовестность, экстраверсия, доброжелательность, нейротизм.',
    source: 'На основе TIPI (Gosling, Rentfrow & Swann, 2003); формулировки адаптированы',
    note: 'Всего 2 вопроса на черту — это грубая оценка. Полные версии (IPIP) будут добавлены позже.',
    scales: [
      { key: 'O', label: 'Открытость опыту' },
      { key: 'C', label: 'Добросовестность' },
      { key: 'E', label: 'Экстраверсия' },
      { key: 'A', label: 'Доброжелательность' },
      { key: 'N', label: 'Нейротизм' },
    ],
    items: convert(await load('oceanQuestions.js')),
  },
  'dark-triad': {
    ...common, slug: 'dark-triad', order: 2, kind: 'entertainment', scoring: 'scales',
    title: 'Тёмная триада (вольная версия)',
    description: 'Макиавеллизм, нарциссизм и психопатия как черты в пределах нормы.',
    source: 'По мотивам Short Dark Triad (SD3); формулировки НЕ совпадают с оригиналом',
    note: 'Развлекательный тест. Пункты не сверены с оригинальным SD3, поэтому результат не является научной оценкой.',
    scales: [
      { key: 'M', label: 'Макиавеллизм' },
      { key: 'N', label: 'Нарциссизм' },
      { key: 'P', label: 'Психопатия' },
    ],
    items: convert(await load('darkTriadQuestions.js')),
  },
  'types-16': {
    ...common, slug: 'types-16', order: 3, kind: 'entertainment', scoring: 'dichotomies',
    title: '16 типов личности',
    description: 'Четыре пары предпочтений (в духе типологии Юнга) и стек когнитивных функций.',
    source: 'Самостоятельный тест по мотивам типологии Юнга; не является официальным MBTI®',
    note: 'Развлекательный тест: по 4–6 вопросов на шкалу.',
    dichotomies: [
      { key: 'EI', poles: ['E', 'I'], labels: ['Экстраверсия', 'Интроверсия'] },
      { key: 'SN', poles: ['S', 'N'], labels: ['Сенсорика', 'Интуиция'] },
      { key: 'TF', poles: ['T', 'F'], labels: ['Мышление', 'Чувство'] },
      { key: 'JP', poles: ['J', 'P'], labels: ['Суждение', 'Восприятие'] },
    ],
    types: Object.fromEntries(Object.entries(FUNCTION_STACKS).map(([k, v]) => [k, v])),
    items: convert(await load('mbtiQuestions.js')),
  },
  enneagram: {
    ...common, slug: 'enneagram', order: 4, kind: 'entertainment', scoring: 'enneagram',
    title: 'Эннеаграмма',
    description: 'Основной тип (1–9) и крыло на основе базовых мотиваций и страхов.',
    source: 'Самостоятельный тест; эннеаграмма не имеет научного подтверждения как модель личности',
    note: 'Развлекательный тест: всего 2 вопроса на тип, результат ориентировочный.',
    scales: Object.entries(ENNEAGRAM_TYPES).map(([k, v]) => ({ key: k, label: v.name })),
    types: ENNEAGRAM_TYPES,
    items: convert(await load('enneagramQuestions.js')),
  },
}

await mkdir(outDir, { recursive: true })
for (const [slug, test] of Object.entries(tests)) {
  await writeFile(path.join(outDir, `${slug}.json`), JSON.stringify(test, null, 2) + '\n', 'utf8')
  console.log(`✓ ${slug}.json — ${test.items.length} вопросов`)
}
