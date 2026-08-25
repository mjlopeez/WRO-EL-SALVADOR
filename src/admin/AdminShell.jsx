import { useState, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogOut, Users, Trophy, Building2, BarChart2, Medal,
  LayoutDashboard, ChevronDown, Flag, Menu, X, Monitor,
  Copy, Check, RefreshCw, Eye, History
} from 'lucide-react'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { MODULES, MODULE_LIST } from '../modules/index'
import JudgeManagement      from './shared/JudgeManagement'
import InstitutionManagement from './shared/InstitutionManagement'
import ChangesView           from './shared/ChangesView'

// Lazy-load module admin views
const RoboMissionAdmin       = lazy(() => import('../modules/robomission/AdminView'))
const RoboStarterAdmin       = lazy(() => import('../modules/robostarter/AdminView'))
const RoboSportsAdmin        = lazy(() => import('../modules/robosports/AdminView'))
const FutureInnovatorsAdmin  = lazy(() => import('../modules/futureinnovators/AdminView'))
const FutureEngineersAdmin   = lazy(() => import('../modules/futureengineers/AdminView'))

function moduleAdminView(moduleId, tab, setTab) {
  switch (moduleId) {
    case 'rm':  return <RoboMissionAdmin tab={tab} setTab={setTab} />
    case 'rs':  return <RoboStarterAdmin tab={tab} setTab={setTab} />
    case 'rsp': return <RoboSportsAdmin tab={tab} setTab={setTab} />
    case 'fi':  return <FutureInnovatorsAdmin tab={tab} setTab={setTab} />
    case 'fe':  return <FutureEngineersAdmin tab={tab} setTab={setTab} />
    default:    return <ComingSoon module={MODULES[moduleId]} />
  }
}

// ── SHARED SECTIONS (not module-specific) ─────────────────────────────────
const SHARED_NAV = [
  { id: 'jueces',        label: 'Jueces',        icon: Users },
  { id: 'instituciones', label: 'Instituciones', icon: Building2 },
  { id: 'pantalla',      label: 'Pantalla',      icon: Monitor },
  { id: 'cambios',       label: 'Historial',     icon: History },
]

export default function AdminShell() {
  const { profile, logout } = useAuth()
  const [activeModule, setActiveModule]   = useState('rm')
  const [tab, setTab]                     = useState('overview')
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen]     = useState(false)

  const mod = MODULES[activeModule]

  const switchModule = (id) => {
    setActiveModule(id)
    setTab('overview')
    setModuleMenuOpen(false)
    setSidebarOpen(false)
  }

  const switchTab = (id) => {
    setTab(id)
    setSidebarOpen(false)
  }

  // Module-level nav tabs (some modules have extra tabs)
  const MODULE_NAV = [
    { id: 'overview',  label: 'Resumen',    icon: LayoutDashboard },
    { id: 'equipos',   label: 'Equipos',    icon: Trophy },
    { id: 'resultados',label: 'Resultados', icon: BarChart2 },
    { id: 'ranking',   label: 'Ranking',    icon: Medal },
  ]

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 py-4 mb-4">
        <div className="w-9 h-9 rounded-xl bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center shrink-0">
          <Flag size={18} className="text-brand-orange" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white text-sm leading-tight">WRO El Salvador</p>
          <p className="text-xs text-gray-500">Admin Panel 2026</p>
        </div>
      </div>

      {/* Module selector */}
      <div className="mb-4 relative">
        <button
          onClick={() => setModuleMenuOpen(v => !v)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${mod.colorBg} ${mod.colorBorder} ${mod.colorText}`}
        >
          <span className="text-base">{mod.emoji}</span>
          <span className="flex-1 text-left">{mod.label}</span>
          <ChevronDown size={14} className={`transition-transform ${moduleMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {moduleMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1 bg-dark-700 border border-dark-500 rounded-xl overflow-hidden z-50 shadow-2xl"
            >
              {MODULE_LIST.map(m => (
                <button
                  key={m.id}
                  onClick={() => switchModule(m.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all hover:bg-dark-600 ${
                    m.id === activeModule ? `${m.colorText} bg-dark-600` : 'text-gray-300'
                  }`}
                >
                  <span>{m.emoji}</span>
                  {m.label}
                  {m.id === activeModule && <Check size={14} className="ml-auto" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Module nav */}
      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider px-2 mb-1">Módulo</p>
      <nav className="space-y-0.5 mb-4">
        {MODULE_NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
            className={`sidebar-link ${tab === id && !SHARED_NAV.find(s => s.id === tab) ? 'sidebar-link-active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {/* Shared nav */}
      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider px-2 mb-1">General</p>
      <nav className="space-y-0.5 mb-4">
        {SHARED_NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
            className={`sidebar-link ${tab === id ? 'sidebar-link-active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="mt-auto border-t border-dark-600 pt-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange font-bold text-sm shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.name || 'Admin'}</p>
            <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen flex">
      {/* ── Desktop Sidebar ─────────────────────────── */}
      <aside className="hidden lg:flex w-64 bg-dark-900 border-r border-dark-600 flex-col p-4 fixed h-full z-20">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Overlay ───────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-64 bg-dark-900 border-r border-dark-600 flex flex-col p-4 z-40 lg:hidden"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X size={20} />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ─────────────────────────────── */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-dark-900 border-b border-dark-600 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white p-1">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-base">{mod.emoji}</span>
            <span className={`text-sm font-semibold ${mod.colorText}`}>{mod.label}</span>
          </div>
          <button onClick={logout} className="text-gray-500 hover:text-red-400 p-1">
            <LogOut size={18} />
          </button>
        </div>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            {tab === 'jueces'        && <JudgeManagement key="jueces" activeModule={activeModule} />}
            {tab === 'instituciones' && <InstitutionManagement key="instituciones" />}
            {tab === 'pantalla'      && <PantallaTab key="pantalla" />}
            {tab === 'cambios'       && <ChangesView key="cambios" />}
            {!['jueces','instituciones','pantalla','cambios'].includes(tab) && (
              <Suspense fallback={<LoadingView />} key={`${activeModule}-${tab}`}>
                {moduleAdminView(activeModule, tab, setTab)}
              </Suspense>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

// ── PANTALLA TAB ─────────────────────────────────────────────────────────────
function PantallaTab() {
  const [token, setToken]         = useState(null)
  const [copied, setCopied]       = useState(false)
  const [loading, setLoading]     = useState(true)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)

  useEffect(() => {
    getDoc(doc(db, 'settings', 'display')).then(snap => {
      if (snap.exists()) setToken(snap.data().token || null)
      setLoading(false)
    })
  }, [])

  const generateToken = async () => {
    setGenerating(true)
    const newToken = crypto.randomUUID()
    await setDoc(doc(db, 'settings', 'display'), { token: newToken, updatedAt: new Date().toISOString() })
    setToken(newToken)
    setGenerating(false)
  }

  const copyLink = () => {
    const url = `${window.location.origin}/pantalla/${token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openDisplay = () => {
    window.open(`/pantalla/${token}`, '_blank')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">Pantalla de Resultados</h1>
        <p className="text-gray-400 mt-1">Controla qué ve el público. Solo se actualiza cuando publicas.</p>
      </div>

      {loading ? (
        <LoadingView />
      ) : (
        <div className="space-y-4 max-w-xl">
          {/* Token card */}
          <div className="card">
            <h2 className="font-bold text-white mb-1">Enlace secreto</h2>
            <p className="text-sm text-gray-400 mb-4">
              Solo quien tenga este link puede ver la pantalla de resultados. Compártelo solo con el equipo AV o proyecta desde tu dispositivo.
            </p>

            {token ? (
              <div className="space-y-3">
                <div className="bg-dark-600 rounded-xl px-4 py-3 font-mono text-xs text-gray-300 break-all">
                  {window.location.origin}/pantalla/<span className="text-brand-orange">{token}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyLink}
                    className="btn-ghost flex-1 flex items-center justify-center gap-2 py-2 text-sm"
                  >
                    {copied ? <><Check size={15} className="text-green-400" /> Copiado</> : <><Copy size={15} /> Copiar enlace</>}
                  </button>
                  <button
                    onClick={openDisplay}
                    className="btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm"
                  >
                    <Eye size={15} /> Abrir pantalla
                  </button>
                </div>
                <button
                  onClick={generateToken}
                  disabled={generating}
                  className="text-xs text-gray-500 hover:text-yellow-400 transition-colors flex items-center gap-1 mt-1"
                >
                  <RefreshCw size={11} /> Regenerar token (invalida el link anterior)
                </button>
              </div>
            ) : (
              <button
                onClick={generateToken}
                disabled={generating}
                className="btn-primary flex items-center gap-2"
              >
                {generating
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><RefreshCw size={16} /> Generar enlace</>
                }
              </button>
            )}
          </div>

          {/* Info card */}
          <div className="card bg-blue-500/5 border-blue-500/20">
            <h3 className="font-semibold text-blue-300 mb-2 text-sm">¿Cómo funciona?</h3>
            <ul className="text-xs text-gray-400 space-y-1.5">
              <li>• Tú ves los resultados en tiempo real en la pestaña <strong className="text-white">Resultados</strong> de cada módulo.</li>
              <li>• Cuando quieras mostrar los resultados al público, ve a Resultados → presiona <strong className="text-white">Publicar resultados</strong>.</li>
              <li>• La pantalla solo cambia cuando publicas — no se actualiza sola.</li>
              <li>• Puedes publicar varias veces durante el evento para revelar resultados parciales.</li>
            </ul>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ── COMING SOON ───────────────────────────────────────────────────────────────
function ComingSoon({ module: mod }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <span className="text-6xl mb-4">{mod?.emoji}</span>
      <h2 className="text-2xl font-extrabold text-white mb-2">{mod?.label}</h2>
      <p className="text-gray-400 mb-6">Este módulo está en construcción.</p>
      <div className="inline-flex items-center gap-2 bg-dark-700 border border-dark-500 px-4 py-2 rounded-full text-sm text-gray-400">
        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        Próximamente
      </div>
    </motion.div>
  )
}

// ── LOADING VIEW ──────────────────────────────────────────────────────────────
function LoadingView() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-10 h-10 border-4 border-dark-500 border-t-brand-orange rounded-full animate-spin" />
    </div>
  )
}
