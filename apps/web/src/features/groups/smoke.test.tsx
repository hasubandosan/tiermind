// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Rating } from '../catalog/types'
import type { GroupData, GroupSummary } from './types'

const state: { user: { id: string } | null } = { user: { id: 'u1' } }
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: state.user, session: null, loading: false }) }))

const member = (id: string, name: string, extra: object = {}) => ({
  user_id: id, username: name, display_name: null, status: 'joined' as const, share_tests: true, share_preferences: true, is_owner: false, ...extra,
})
const pref = (user_id: string, item_id: string, rating: Rating) => ({
  user_id, item_id, rating, title: 'Игра ' + item_id, subtitle: null, image_url: null,
  category_slug: 'games', category_name: 'Игры', category_emoji: '🎮', category_sort: 40,
})
const group = (over: Partial<GroupData> = {}): GroupData => ({
  id: 'g1', name: 'Друзья', owner_id: 'u1',
  members: [member('u1', 'alice', { is_owner: true }), member('u2', 'bob')],
  tests: [
    { user_id: 'u1', test_slug: 'ocean-tipi', test_version: 1, taken_at: '', scores: { scoring: 'scales', percents: { O: 80, C: 40, E: 50, A: 60, N: 30 } } },
    { user_id: 'u2', test_slug: 'ocean-tipi', test_version: 1, taken_at: '', scores: { scoring: 'scales', percents: { O: 70, C: 50, E: 50, A: 60, N: 20 } } },
  ],
  prefs: [
    pref('u1', '1', 2), pref('u1', '2', 1), pref('u1', '3', -2), pref('u2', '1', 2), pref('u2', '2', 2), pref('u2', '3', 2),
  ],
  tiers: [],
  attachments: [],
  ...over,
})

let current: GroupData = group()
vi.mock('./api', () => ({
  fetchGroupData: vi.fn(async () => current),
  updateSharing: vi.fn(), inviteToGroup: vi.fn(), leaveGroup: vi.fn(), removeMember: vi.fn(),
  renameGroup: vi.fn(), deleteGroup: vi.fn(), setGroupTierlist: vi.fn(),
  myGroups: vi.fn(async () => invitesAndGroups), createGroup: vi.fn(), respondInvite: (...args: unknown[]) => respond(...args),
}))
const respond = vi.fn(async (...args: unknown[]) => { void args })
let invitesAndGroups: GroupSummary[] = []
vi.mock('../friends/api', () => ({
  fetchMyFriendships: vi.fn(async () => [
    { friendship_id: 'f1', status: 'accepted', i_am_requester: true, user_id: 'u3', username: 'carol', display_name: 'Кэрол', avatar_url: null, created_at: '' },
    { friendship_id: 'f2', status: 'accepted', i_am_requester: true, user_id: 'u2', username: 'bob', display_name: null, avatar_url: null, created_at: '' },
  ]),
}))
vi.mock('../tierlists/api', () => ({
  listTierLists: vi.fn(async () => [{ id: 'T1', owner_id: 'u1', title: 'Мой тир', note: null, tags: [], visibility: 'private', updated_at: '', entries_count: 4, parent_list_id: null }]),
}))

import GroupPage from './GroupPage'
import GroupsPage from './GroupsPage'

function renderGroup() {
  return render(
    <MemoryRouter initialEntries={['/groups/g1']}>
      <Routes>
        <Route path="/groups/:id" element={<GroupPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  state.user = { id: 'u1' }
  current = group()
  invitesAndGroups = []
  respond.mockClear()
})
afterEach(cleanup)

describe('GroupPage (дымовая проверка)', () => {
  it('обзор: матрица совпадений и ближайшая пара', async () => {
    renderGroup()
    await waitFor(() => expect(screen.getByText('Совпадение интересов')).toBeTruthy())
    expect(screen.getByText(/совпадают на/)).toBeTruthy() // у пары одна общая цифра
    expect(screen.getAllByText('alice').length).toBeGreaterThan(0)
    expect(screen.getByText('Чем делятся участники')).toBeTruthy()
  })

  it('обзор для трёх человек: ближайшая и самая далёкая пары', async () => {
    current = group({
      members: [member('u1', 'alice', { is_owner: true }), member('u2', 'bob'), member('u3', 'carol')],
      prefs: [
        pref('u1', '1', 2), pref('u1', '2', 1), pref('u1', '3', -2),
        pref('u2', '1', 2), pref('u2', '2', 1), pref('u2', '3', -2),
        pref('u3', '1', -2), pref('u3', '2', -2), pref('u3', '3', 2),
      ],
      tests: [],
    })
    renderGroup()
    await waitFor(() => expect(screen.getByText(/Ближе всего/)).toBeTruthy())
    expect(screen.getByText(/Больше всего различий/)).toBeTruthy()
  })

  it('вкладка «Тесты»: результаты и пары', async () => {
    renderGroup()
    await waitFor(() => expect(screen.getByText('Тесты')).toBeTruthy())
    fireEvent.click(screen.getByText('Тесты'))
    await waitFor(() => expect(screen.getByText(/Большая пятёрка/)).toBeTruthy())
    expect(screen.getByText('80%')).toBeTruthy()
    expect(screen.getByText('70%')).toBeTruthy()
  })

  it('вкладка «Предпочтения»: спорные и любимые элементы', async () => {
    renderGroup()
    await waitFor(() => expect(screen.getByText('Предпочтения')).toBeTruthy())
    fireEvent.click(screen.getByText('Предпочтения'))
    await waitFor(() => expect(screen.getByText('Совпадение вкусов')).toBeTruthy())
    expect(screen.getByText(/Нравится всем/)).toBeTruthy()
    expect(screen.getByText(/Спорные/)).toBeTruthy()
  })

  it('владелец: может пригласить друга (только тех, кого нет в группе) и управлять группой', async () => {
    renderGroup()
    await waitFor(() => expect(screen.getByText('Участники')).toBeTruthy())
    fireEvent.click(screen.getByText('Участники'))
    await waitFor(() => expect(screen.getByText('Пригласить друга')).toBeTruthy())
    await waitFor(() => expect(screen.getByText(/Кэрол/)).toBeTruthy())
    expect(screen.queryByText(/^bob \(@bob\)$/)).toBeNull() // bob уже в группе
    expect(screen.getByText('Удалить группу')).toBeTruthy()
    expect(screen.queryByText('Выйти из группы')).toBeNull()
  })

  it('обычный участник: может выйти, но не приглашать и не удалять', async () => {
    state.user = { id: 'u2' }
    renderGroup()
    await waitFor(() => expect(screen.getByText('Участники')).toBeTruthy())
    fireEvent.click(screen.getByText('Участники'))
    await waitFor(() => expect(screen.getByText('Выйти из группы')).toBeTruthy())
    expect(screen.queryByText('Пригласить друга')).toBeNull()
    expect(screen.queryByText('Удалить группу')).toBeNull()
  })

  it('если участник ничем не делится — показывается подсказка', async () => {
    current = group({ members: [member('u1', 'alice', { is_owner: true, share_tests: false, share_preferences: false }), member('u2', 'bob')] })
    renderGroup()
    await waitFor(() => expect(screen.getByText(/Вы пока ничем не делитесь/)).toBeTruthy())
  })

  it('группа недоступна (null) — понятное сообщение', async () => {
    current = null as unknown as GroupData
    renderGroup()
    await waitFor(() => expect(screen.getByText(/Группа не найдена/)).toBeTruthy())
  })
})

describe('GroupsPage: приглашения', () => {
  it('галочки «делиться» по умолчанию выключены, принятие передаёт выбор', async () => {
    invitesAndGroups = [{ id: 'g9', name: 'Клуб', owner_id: 'u7', owner_username: 'zed', my_status: 'invited', member_count: 2, created_at: '' }]
    render(<MemoryRouter><GroupsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Клуб')).toBeTruthy())
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    // первые два — в карточке приглашения, их состояние по умолчанию — выключено
    expect(boxes[0].checked).toBe(false)
    expect(boxes[1].checked).toBe(false)
    fireEvent.click(boxes[0])
    fireEvent.click(screen.getByText('Принять'))
    await waitFor(() => expect(respond).toHaveBeenCalledWith('g9', true, true, false))
  })
})
