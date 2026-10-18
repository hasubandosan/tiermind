import type { ReactNode } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './features/auth/AuthProvider'
import AuthPage from './features/auth/AuthPage'
import ProfilePage from './features/profile/ProfilePage'
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
    </div>
  )
}

export default function App() {
  const { session } = useAuth()

  return (
    <>
      <header className="flex items-center gap-4 border-b border-gray-200 p-4">
        <Link to="/" className="font-bold text-violet-700">TierMind</Link>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}