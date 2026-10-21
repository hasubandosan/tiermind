// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TemplateCard, TemplatePass, TemplateScoreRow, TierListFull } from '../tierlists/types'

const state: { user: { id: string } | null } = { user: { id: 'me' } }
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: state.user, session: null, loading: false }) }))

const item = (n: string) => ({ id: 'i' + n, title: 'Элемент ' + n, subtitle: null, image_url: null, category_slug: 'games', category_name: 'Игры', category_emoji: '🎮' })
const tpl: TierListFull = {
  id: 'T1', owner_id: 'author', title: 'Лучшие игры', note: 'Расставьте игры', tags: ['rpg'], visibility: 'public',
  is_template: true, source_template_id: null,
  tiers: ['S', 'A', 'B'].map((label, i) => ({ id: 't' + label, label, color: '#ffbf7f', position: i })),
  entries: [1, 2, 3, 4].map((n) => ({ id: 'e' + n, tier_id: null, position: n, note: null, child_tierlist_id: n === 1 ? 'C1' : null, item: item(String(n)) })),
}
const card = (over: Partial<TemplateCard> = {}): TemplateCard => ({
  id: 'T1', owner_id: 'author', owner_username: 'zed', owner_display_name: null, title: 'Лучшие игры', note: 'Расставьте игры',
  tags: ['rpg'], visibility: 'public', entries_count: 4, passes_count: 3, updated_at: '', my_pass_id: null, ...over,
})
const pass = (id: string, name: string, placed: number): TemplatePass => ({
  tierlist_id: 'P' + id, owner_id: id, username: name, display_name: null, placed, total: 4, updated_at: '',
})
const sc = (user_id: string, item_id: string, tier_score: number): TemplateScoreRow => ({ user_id, tierlist_id: 'P' + user_id, item_id, tier_label: 'S', tier_score })

let currentCard: TemplateCard | null = card()
let currentPasses: TemplatePass[] = []
let currentScores: TemplateScoreRow[] = []
let gallery: TemplateCard[] = []
const start = vi.fn(async (..._args: unknown[]) => 'NEWPASS')

vi.mock('../tierlists/api', () => ({
  getTemplate: vi.fn(async () => currentCard),
  fetchTierList: vi.fn(async () => tpl),
  templatePasses: vi.fn(async () => currentPasses),
  templateScores: vi.fn(async () => currentScores),
  startFromTemplate: (...args: unknown[]) => start(...args),
  listTemplates: vi.fn(async () => gallery),
}))

import TemplatePage from './TemplatePage'
import TemplatesPage from './TemplatesPage'

function renderTemplate() {
  return render(
    <MemoryRouter initialEntries={['/templates/T1']}>
      <Routes>
        <Route path="/templates/:id" element={<TemplatePage />} />
        <Route path="/tierlists/:id" element={<p>страница тир-листа</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  state.user = { id: 'me' }
  currentCard = card()
  currentPasses = []
  currentScores = []
  gallery = []
  start.mockClear()
})
afterEach(cleanup)

describe('TemplatePage (дымовая проверка)', () => {
  it('показывает шаблон: название, автора, тиры, элементы', async () => {
    renderTemplate()
    await waitFor(() => expect(screen.getByText('Лучшие игры', { selector: 'h1' })).toBeTruthy())
    expect(screen.getByText('@zed')).toBeTruthy()
    expect(screen.getByText('Элементы (4)')).toBeTruthy()
    expect(screen.getByText('Элемент 3')).toBeTruthy()
    expect(screen.getByText(/вложенный тир-лист/)).toBeTruthy()
    expect(screen.getByText('Пройти этот шаблон')).toBeTruthy()
    expect(screen.queryByText('Редактировать шаблон')).toBeNull()
  })

  it('«Пройти» создаёт копию и ведёт на неё', async () => {
    renderTemplate()
    await waitFor(() => expect(screen.getByText('Пройти этот шаблон')).toBeTruthy())
    fireEvent.click(screen.getByText('Пройти этот шаблон'))
    await waitFor(() => expect(start).toHaveBeenCalledWith('T1'))
    await waitFor(() => expect(screen.getByText('страница тир-листа')).toBeTruthy())
  })

  it('автор видит «Редактировать шаблон»; если уже проходил — «Пройти ещё раз» и ссылка на своё', async () => {
    state.user = { id: 'author' }
    currentCard = card({ my_pass_id: 'MY1' })
    renderTemplate()
    await waitFor(() => expect(screen.getByText('Редактировать шаблон')).toBeTruthy())
    expect(screen.getByText('Пройти ещё раз')).toBeTruthy()
    expect(screen.getByText('Продолжить моё прохождение')).toBeTruthy()
  })

  it('сообщество: средняя расстановка и список открытых прохождений с совпадением', async () => {
    currentPasses = [pass('me', 'me_user', 4), pass('u2', 'bob', 4)]
    currentScores = [
      ...['i1', 'i2', 'i3', 'i4'].map((it, k) => sc('me', it, [1, 0.5, 0.5, 0][k])),
      ...['i1', 'i2', 'i3', 'i4'].map((it, k) => sc('u2', it, [1, 0.5, 0.5, 0][k])),
    ]
    renderTemplate()
    await waitFor(() => expect(screen.getByText('Сообщество')).toBeTruthy())
    expect(screen.getAllByText('2 чел.').length).toBeGreaterThan(0)
    expect(screen.getByText('bob')).toBeTruthy()
    expect(screen.getByText('(это вы)')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('100%')).toBeTruthy()) // расстановки идентичны
  })

  it('пока нет открытых прохождений — подсказка', async () => {
    renderTemplate()
    await waitFor(() => expect(screen.getAllByText(/Пока нет открытых прохождений/).length).toBe(2)) // в «Сообществе» и в списке прохождений
  })

  it('гость: видит шаблон, а «Пройти» просит войти', async () => {
    state.user = null
    renderTemplate()
    await waitFor(() => expect(screen.getByText('Для прохождения нужно войти.')).toBeTruthy())
  })

  it('шаблон не найден или скрыт', async () => {
    currentCard = null
    renderTemplate()
    await waitFor(() => expect(screen.getByText(/Шаблон не найден или скрыт/)).toBeTruthy())
  })
})

describe('TemplatesPage (галерея)', () => {
  it('показывает карточки с автором и числом прохождений', async () => {
    gallery = [card(), card({ id: 'T2', title: 'Аниме 2026', passes_count: 10, my_pass_id: 'X', tags: ['anime'] })]
    render(<MemoryRouter><TemplatesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Лучшие игры')).toBeTruthy())
    expect(screen.getByText('Аниме 2026')).toBeTruthy()
    expect(screen.getByText(/прошли: 10/)).toBeTruthy()
    expect(screen.getByText(/вы проходили этот шаблон/)).toBeTruthy()
    expect(screen.getAllByText('#anime').length).toBeGreaterThan(0) // чип-фильтр и тег в карточке
  })

  it('пустая галерея', async () => {
    render(<MemoryRouter><TemplatesPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Шаблонов не найдено.')).toBeTruthy())
  })
})
