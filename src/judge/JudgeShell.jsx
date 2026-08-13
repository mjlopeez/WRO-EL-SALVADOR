import { useState, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, ChevronRight, Flag } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { MODULES } from '../modules/index'

const RoboMissionJudge      = lazy(() => import('../modules/robomission/JudgeView'))
const RoboStarterJudge      = lazy(() => import('../modules/robostarter/JudgeView'))
const RoboSportsJudge       = lazy(() => import('../modules/robosports/JudgeView'))
const FutureInnovatorsJudge = lazy(() => import('../modules/futureinnovators/JudgeView'))
const FutureEngineersJudge  = lazy(() => import('../modules/futureengineers/JudgeView'))

function moduleJudgeView(moduleId) {
  switch (moduleId) {
    case 'rm':  return <RoboMissionJudge />
    case 'rs':  return <RoboStarterJudge />
    case 'rsp': return <RoboSportsJudge />
    case 'fi':  return <FutureInnovatorsJudge />
    case 'fe':  return <FutureEngineersJudge />
    default:    return <ComingSoon moduleId={moduleId} />
  }
}

export default function JudgeShell() {
  const { profile, logout } = useAuth()
  const assignedModules = (profile?.modules || []).filter(id => MODULES[id])
  const [selected, setSelected] = useState(
    assignedModules.length === 1 ? assignedModules[0] : null
  )

  // If only one module, go straight in
  if (selected) {
    return (
      <div>
        {assignedModules.length > 1 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-dark-900 border-b border-dark-600">
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
            >
              ← Módulos
            </button>
            <span className="text-gray-600">/</span>
            <span className={`text-xs font-medium ${MODULES[selected]?.colorText}`}>
              {MODULES[selected]?.emoji} {MODULES[selected]?.label}
            </span>
          </div>
        )}
        <Suspense fallback={<LoadingView />}>
          {moduleJudgeView(selected)}
        </Suspense>
      </div>
    )
  }

  // Module selector for judges assigned to multiple modules
  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 mt-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center">
            <Flag size={20} className="text-brand-orange" />
          </div>
          <div>
            <p className="font-bold text-white">Hola, {profile?.name?.split(' ')[0]}</p>
            <p className="text-xs text-gray-500">Selecciona tu módulo</p>
          </div>
        </div>
        <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors p-2">
          <LogOut size={18} />
        </button>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Módulos asignados</h2>

      {assignedModules.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">No tienes módulos asignados aún.</p>
          <p className="text-gray-500 text-sm mt-1">El administrador te asignará pronto.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignedModules.map((modId, i) => {
            const mod = MODULES[modId]
            return (
              <motion.button
                key={modId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(modId)}
                className={`w-full card-hover text-left flex items-center gap-4 border ${mod.colorBorder}`}
              >
                <div className={`w-12 h-12 rounded-xl ${mod.colorBg} flex items-center justify-center text-2xl shrink-0`}>
                  {mod.emoji}
                </div>
                <div className="flex-1">
                  <p className={`font-bold ${mod.colorText}`}>{mod.label}</p>
                  <p className="text-sm text-gray-400">{mod.description}</p>
                </div>
                <ChevronRight size={18} className={mod.colorText} />
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ComingSoon({ moduleId }) {
  const mod = MODULES[moduleId]
  const { logout } = useAuth()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <span className="text-6xl mb-4">{mod?.emoji}</span>
      <h2 className="text-2xl font-extrabold text-white mb-2">{mod?.label}</h2>
      <p className="text-gray-400 mb-6">Este módulo está en construcción.</p>
      <button onClick={logout} className="btn-ghost flex items-center gap-2 text-sm">
        <LogOut size={16} /> Cerrar sesión
      </button>
    </div>
  )
}

function LoadingView() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-dark-500 border-t-brand-orange rounded-full animate-spin" />
    </div>
  )
}
