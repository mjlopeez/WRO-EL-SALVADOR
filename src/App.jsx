import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login       from './components/Login'
import AdminShell  from './admin/AdminShell'
import JudgeShell  from './judge/JudgeShell'
import DisplayScreen from './display/DisplayScreen'

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-dark-500 border-t-brand-orange rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">Cargando...</p>
    </div>
  </div>
)

function AppRoutes() {
  const { user, profile, loading } = useAuth()

  if (loading) return <Spinner />

  return (
    <Routes>
      {/* Public display screen — token-protected */}
      <Route path="/pantalla/:token" element={<DisplayScreen />} />

      {/* Auth guard */}
      <Route path="/*" element={
        !user ? <Login /> :
        !profile ? <Spinner /> :
        profile.role === 'admin' ? <AdminShell /> :
        profile.role === 'judge' ? <JudgeShell /> :
        <div className="min-h-screen flex items-center justify-center text-gray-400">
          Cuenta sin rol asignado. Contacta al administrador.
        </div>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
