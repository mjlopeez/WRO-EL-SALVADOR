import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { Flag, Trophy, Clock } from 'lucide-react'
import { MODULES } from '../modules/index'

export default function DisplayScreen() {
  const { token } = useParams()
  const [valid, setValid]         = useState(null)   // null=loading, true, false
  const [results, setResults]     = useState(null)
  const [publishedAt, setPublishedAt] = useState(null)
  const [currentModule, setCurrentModule] = useState('rm')
  const [tick, setTick]           = useState(0)

  // Validate token
  useEffect(() => {
    getDoc(doc(db, 'settings', 'display')).then(snap => {
      if (snap.exists() && snap.data().token === token) {
        setValid(true)
      } else {
        setValid(false)
      }
    }).catch(() => setValid(false))
  }, [token])

  // Subscribe to published results once token is valid
  useEffect(() => {
    if (!valid) return
    const unsub = onSnapshot(doc(db, 'published_results', currentModule), snap => {
      if (snap.exists()) {
        const data = snap.data()
        setResults(data.ranking || [])
        setPublishedAt(data.publishedAt || null)
      } else {
        setResults([])
        setPublishedAt(null)
      }
    })
    return unsub
  }, [valid, currentModule])

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (valid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="w-12 h-12 border-4 border-dark-600 border-t-brand-orange rounded-full animate-spin" />
      </div>
    )
  }

  if (!valid) {
    // Show nothing — black screen, no error message
    return <div className="min-h-screen bg-black" />
  }

  const mod = MODULES[currentModule] || MODULES.rm
  const now = new Date()
  const timeStr = now.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen bg-dark-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-dark-600">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center">
            <Flag size={20} className="text-brand-orange" />
          </div>
          <div>
            <p className="font-extrabold text-white text-lg leading-tight">WRO El Salvador 2026</p>
            <p className="text-xs text-gray-500">Resultados Oficiales</p>
          </div>
        </div>

        {/* Module tabs */}
        <div className="flex gap-2">
          {Object.values(MODULES).map(m => (
            <button
              key={m.id}
              onClick={() => setCurrentModule(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                currentModule === m.id
                  ? `${m.colorBg} ${m.colorBorder} ${m.colorText}`
                  : 'border-dark-500 text-gray-500 hover:text-gray-300'
              }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Clock size={14} />
          {timeStr}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{mod.emoji}</span>
          <h1 className="text-3xl font-extrabold text-white">{mod.label}</h1>
          {publishedAt && (
            <span className="ml-auto text-xs text-gray-500">
              Actualizado: {new Date(publishedAt).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!results || results.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[50vh] text-center"
            >
              <Trophy size={64} className="text-gray-700 mb-4" />
              <p className="text-gray-500 text-xl">Resultados aún no publicados</p>
              <p className="text-gray-600 text-sm mt-2">El administrador publicará los resultados pronto.</p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3 max-w-3xl mx-auto"
            >
              {results.map((entry, idx) => (
                <motion.div
                  key={entry.teamId || idx}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.4 }}
                  className={`flex items-center gap-5 rounded-2xl px-6 py-4 border ${
                    idx === 0 ? `${mod.colorBg} ${mod.colorBorder} shadow-lg` :
                    idx < 3 ? 'bg-dark-700 border-dark-500' :
                    'bg-dark-800 border-dark-600 opacity-80'
                  }`}
                >
                  {/* Position */}
                  <div className="w-10 text-center shrink-0">
                    {idx < 3
                      ? <span className="text-2xl">{medals[idx]}</span>
                      : <span className="text-lg font-mono font-bold text-gray-500">{idx + 1}</span>
                    }
                  </div>

                  {/* Team avatar */}
                  <div className={`w-12 h-12 rounded-xl ${mod.colorBg} border ${mod.colorBorder} flex items-center justify-center font-bold text-lg shrink-0 ${mod.colorText}`}>
                    {entry.teamNumber || entry.teamName?.[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-extrabold text-lg truncate ${idx === 0 ? 'text-white' : 'text-gray-200'}`}>
                      {entry.teamName}
                    </p>
                    {entry.school && (
                      <p className="text-sm text-gray-500 truncate">{entry.school}</p>
                    )}
                  </div>

                  {/* Score bar */}
                  <div className="hidden md:block w-40 shrink-0">
                    <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${mod.colorFrom} to-current`}
                        style={{ backgroundColor: mod.hex }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (entry.total / (entry.maxTotal || 1)) * 100)}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.05 + 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <p className={`font-mono font-extrabold text-2xl ${idx === 0 ? mod.colorText : 'text-white'}`}>
                      {entry.total}
                    </p>
                    <p className="text-xs text-gray-500">pts</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-8 py-3 border-t border-dark-700 flex items-center justify-between">
        <p className="text-xs text-gray-600">WRO El Salvador 2026 · Sistema de Evaluación Oficial</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-600">En vivo</span>
        </div>
      </div>
    </div>
  )
}
