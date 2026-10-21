import type { ReactNode } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './features/auth/AuthProvider'
import AuthPage from './features/auth/AuthPage'
import ProfilePage from './features/profile/ProfilePage'
import TestsPage from './features/tests/TestsPage'
import TestRunnerPage from './features/tests/TestRunnerPage'
import SavedResultPage from './features/tests/SavedResultPage'
import PeoplePage from './features/friends/PeoplePage'
import FriendsPage from './features/friends/FriendsPage'
import PublicProfilePage from './features/profile/PublicProfilePage'
import CatalogPage from './features/catalog/CatalogPage'
import PreferencesPage from './features/catalog/PreferencesPage'
import TierListsPage from './features/tierlists/TierListsPage'
import TierListPage from './features/tierlists/TierListPage'
import GroupsPage from './features/groups/GroupsPage'
import TemplatesPage from './features/templates/TemplatesPage'
import TemplatePage from './features/templates/TemplatePage'
import GroupPage from './features/groups/GroupPage'
import { supabase } from './lib/supabase'

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <p className="p-6">Загрузка…</p>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Home() {
  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-3xl font-bold">TierMind</h1>
      <p className="mt-2 text-gray-600">Тесты, предпочтения и тир-листы с друзьями.</p>
      <Link to="/tests" className="mt-4 inline-block rounded bg-violet-600 px-4 py-2 font-medium text-white">
        Пройти тест
      </Link>
    </div>
  )
}

export default function App() {
  const { session } = useAuth()

  return (
    <>
      <header className="flex items-center gap-4 border-b border-gray-200 p-4">
        <Link to="/" className="font-bold text-violet-700">TierMind</Link>
        <Link to="/tests" className="text-sm">Тесты</Link>
        <Link to="/catalog" className="text-sm">Каталог</Link>
        <Link to="/templates" className="text-sm">Шаблоны</Link>
        <Link to="/people" className="text-sm">Люди</Link>
        {session && <Link to="/friends" className="text-sm">Друзья</Link>}
        {session && <Link to="/preferences" className="text-sm">Предпочтения</Link>}
        {session && <Link to="/tierlists" className="text-sm">Тир-листы</Link>}
        {session && <Link to="/groups" className="text-sm">Группы</Link>}
        <div className="ml-auto flex items-center gap-4 text-sm">
          {session ? (
            <>
              <Link to="/profile">Профиль</Link>
              <button type="button" onClick={() => supabase.auth.signOut()} className="text-gray-500 underline">
                Выйти
              </button>
            </>
          ) : (
            <Link to="/login">Войти</Link>
          )}
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/tests" element={<TestsPage />} />
        <Route path="/tests/:slug" element={<TestRunnerPage />} />
        <Route path="/tests/:slug/result" element={<RequireAuth><SavedResultPage /></RequireAuth>} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/preferences" element={<RequireAuth><PreferencesPage /></RequireAuth>} />
        <Route path="/tierlists" element={<RequireAuth><TierListsPage /></RequireAuth>} />
        <Route path="/tierlists/:id" element={<TierListPage />} />
        <Route path="/groups" element={<RequireAuth><GroupsPage /></RequireAuth>} />
        <Route path="/groups/:id" element={<RequireAuth><GroupPage /></RequireAuth>} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/templates/:id" element={<TemplatePage />} />
        <Route path="/people" element={<RequireAuth><PeoplePage /></RequireAuth>} />
        <Route path="/friends" element={<RequireAuth><FriendsPage /></RequireAuth>} />
        <Route path="/u/:username" element={<PublicProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
