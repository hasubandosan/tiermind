// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TierListFull } from './types'

const state: { user: { id: string } | null } = { user: { id: 'owner' } }

vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: state.user, session: null, loading: false }) }))

const item = (n: string) => ({ id: 'i' + n, title: 'Элемент ' + n, subtitle: null, image_url: null, category_slug: 'games', category_name: 'Игры', category_emoji: '🎮' })
const full: TierListFull = {
  id: 'L1', owner_id: 'owner', title: 'Мой список', note: 'описание', tags: ['rpg'], visibility: 'public',
  tiers: [
    { id: 'tS', label: 'S', color: '#ff7f7f', position: 0 },
    { id: 'tA', label: 'A', color: '#ffbf7f', position: 1 },
  ],
  entries: [
    { id: 'e1', tier_id: 'tS', position: 0, note: 'заметка', child_tierlist_id: 'C1', item: item('1') },
    { id: 'e2', tier_id: null, position: 0, note: null, child_tierlist_id: null, item: item('2') },
  ],
}

vi.mock('./api', () => ({
  fetchTierList: vi.fn(async () => full),
  fetchAncestors: vi.fn(async () => [{ id: 'P', title: 'Родитель' }]),
  fetchOwnerName: vi.fn(async () => 'alice'),
  moveEntry: vi.fn(async () => undefined),
}))
vi.mock('../catalog/api', () => ({
  browseItems: vi.fn(async () => []),
  fetchCategories: vi.fn(async () => []),
  createItem: vi.fn(),
  uploadItemImage: vi.fn(),
}))

import TierListPage from './TierListPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tierlists/L1']}>
      <Routes>
        <Route path="/tierlists/:id" element={<TierListPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => { state.user = { id: 'owner' } })
afterEach(cleanup)

describe('TierListPage (дымовая проверка)', () => {
  it('владелец: видит тиры, записи, банк, хлебные крошки и кнопки управления', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Элемент 1')).toBeTruthy())
    expect(screen.getByText('Мой список', { selector: 'h1' })).toBeTruthy()
    expect(screen.getByText('S')).toBeTruthy()
    expect(screen.getByText('A')).toBeTruthy()
    expect(screen.getByText('Элемент 2')).toBeTruthy()
    expect(screen.getByText('Родитель')).toBeTruthy()
    expect(screen.getByText('＋ Элементы')).toBeTruthy()
    expect(screen.getByText('Настройки')).toBeTruthy()
  })

  it('клик по записи открывает окно с подробностями и вложенным тир-листом', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Элемент 1')).toBeTruthy())
    fireEvent.click(screen.getByText('Элемент 1'))
    await waitFor(() => expect(screen.getByText('Вложенный тир-лист')).toBeTruthy())
    expect(screen.getByText(/Открыть/)).toBeTruthy()
    expect(screen.getByText('Убрать из тир-листа')).toBeTruthy()
    expect(screen.getByText('Переместить в')).toBeTruthy()
  })

  it('кнопки «＋ Элементы» / «Тиры» / «Настройки» открывают свои панели', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('＋ Элементы')).toBeTruthy())
    fireEvent.click(screen.getByText('Настройки'))
    expect(screen.getByText('Настройки тир-листа')).toBeTruthy()
    fireEvent.click(screen.getByText('Тиры'))
    expect(screen.getByText('＋ Добавить')).toBeTruthy()
    fireEvent.click(screen.getByText('＋ Элементы'))
    await waitFor(() => expect(screen.getByText('Добавить элементы из каталога')).toBeTruthy())
  })

  it('гость: только просмотр — нет кнопок управления, виден автор', async () => {
    state.user = null
    renderPage()
    await waitFor(() => expect(screen.getByText('Элемент 1')).toBeTruthy())
    expect(screen.queryByText('＋ Элементы')).toBeNull()
    expect(screen.queryByText('Настройки')).toBeNull()
    await waitFor(() => expect(screen.getByText('@alice')).toBeTruthy())
    fireEvent.click(screen.getByText('Элемент 1'))
    await waitFor(() => expect(screen.getByText('Вложенный тир-лист')).toBeTruthy())
    expect(screen.queryByText('Убрать из тир-листа')).toBeNull()
    expect(screen.queryByText('Переместить в')).toBeNull()
  })
})
