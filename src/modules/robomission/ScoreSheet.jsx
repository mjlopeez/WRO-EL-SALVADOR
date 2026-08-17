import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, CheckCircle, ChevronUp, ChevronDown, RotateCcw, Clock, Lock, WifiOff, RefreshCw, SendHorizonal, ShieldCheck } from 'lucide-react'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import {
  ELEMENTARY_MISSIONS, ELEMENTARY_MAX,
  JUNIOR_MISSIONS,     JUNIOR_MAX,
  SENIOR_MISSIONS,     SENIOR_MAX,
} from './scoringData'

const MISSIONS_MAP = {
  elementary: { missions: ELEMENTARY_MISSIONS, max: ELEMENTARY_MAX },
  junior:     { missions: JUNIOR_MISSIONS,     max: JUNIOR_MAX     },
  senior:     { missions: SENIOR_MISSIONS,     max: SENIOR_MAX     },
}

const CAT_COLORS = {
  elementary: { class: 'elementary', ring: 'ring-elementary', border: 'border-elementary/30', bg: 'bg-elementary' },
  junior:     { class: 'junior',     ring: 'ring-junior',     border: 'border-junior/30',     bg: 'bg-junior'     },
  senior:     { class: 'senior',     ring: 'ring-senior',     border: 'border-senior/30',     bg: 'bg-senior'     },
}

function CounterInput({ value, onChange, min = 0, max, color, disabled }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="w-7 h-7 rounded-lg bg-dark-600 hover:bg-dark-500 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronDown size={14} />
      </button>
      <span className={`w-10 text-center font-mono font-bold text-sm ${value > 0 ? `text-${color}` : 'text-gray-500'}`}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="w-7 h-7 rounded-lg bg-dark-600 hover:bg-dark-500 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronUp size={14} />
      </button>
    </div>
  )
}

function ToggleInput({ value, onChange, color, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(value ? 0 : 1)}
      disabled={disabled}
      className={`w-10 h-6 rounded-full transition-all duration-300 relative disabled:opacity-40 disabled:cursor-not-allowed ${
        value ? `bg-${color}` : 'bg-dark-600'
      }`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${
        value ? 'left-5' : 'left-1'
      }`} />
    </button>
  )
}

export default function ScoreSheet({ team, category, round, judgeUid, judgeName = null, onSaved }) {
  const { missions, max } = MISSIONS_MAP[category] || MISSIONS_MAP.elementary
  const colorKey  = CAT_COLORS[category] || CAT_COLORS.elementary
  const docId     = `${team.id}_r${round}`

  const [scores, setScores]       = useState({})
  const [seconds, setSeconds]     = useState('')
  const [saved, setSaved]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [showToast, setShowToast] = useState(false)
  const [finalized, setFinalized] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  const isDisabled = finalized

  // Build bidirectional mutual map and item max map
  const { mutualMap, itemMaxMap } = useCallback(() => {
    const mutualMap  = {}
    const itemMaxMap = {}
    missions.forEach(m => m.items.forEach(item => {
      itemMaxMap[item.id] = item.max
      if (item.mutualWith) {
        mutualMap[item.id]         = item.mutualWith
        mutualMap[item.mutualWith] = item.id
      }
    }))
    return { mutualMap, itemMaxMap }
  }, [missions])()

  const handleChange = useCallback((itemId, newValue) => {
    if (isDisabled) return
    setScores(s => {
      const next      = { ...s, [itemId]: newValue }
      const partnerId = mutualMap[itemId]
      if (partnerId !== undefined && newValue > 0) {
        const sharedMax  = itemMaxMap[itemId]
        next[partnerId]  = Math.max(0, Math.min(s[partnerId] || 0, sharedMax - newValue))
      }
      return next
    })
    setSaved(false)
    setSaveError(null)
  }, [mutualMap, itemMaxMap, isDisabled])

  // Load existing score on mount / round change
  useEffect(() => {
    const init = {}
    missions.forEach(m => m.items.forEach(item => { init[item.id] = 0 }))
    setScores(init)
    setSeconds('')
    setSaved(false)
    setSaveError(null)
    setFinalized(false)

    getDoc(doc(db, 'rm_scores', docId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data()
        // Compat: read 'scores' or old 'values' field
        setScores(data.scores || data.values || init)
        setSeconds(data.seconds || '')
        setSaved(true)
        setFinalized(data.finalized === true)
      }
    }).catch(() => {/* silent */})
  }, [docId, team.id, round])

  const computeTotal = useCallback(() => {
    let total = 0
    missions.forEach(mission => {
      mission.items.forEach(item => {
        total += (scores[item.id] || 0) * item.perItem
      })
    })
    return Math.min(total, max)
  }, [scores, missions, max])

  const handleSave = async () => {
    if (isDisabled) return
    setSaving(true)
    setSaveError(null)
    try {
      await setDoc(doc(db, 'rm_scores', docId), {
        teamId:    team.id,
        teamName:  team.name,
        category,
        round,
        judgeUid,
        ...(judgeName ? { judgeName } : {}),
        scores,
        total:     computeTotal(),
        seconds:   seconds || null,
        savedAt:   new Date().toISOString(),
        finalized: false,
      })
      setSaved(true)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
      onSaved?.()
    } catch {
      setSaveError('No se pudo guardar. Verifica tu conexión e intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleFinalize = async () => {
    if (!saved) { alert('Guarda los puntajes antes de finalizar.'); return }
    if (!confirm(`¿Finalizar Ronda ${round}? Ya no podrás modificar los puntajes a menos que el administrador lo permita.`)) return
    setFinalizing(true)
    try {
      await updateDoc(doc(db, 'rm_scores', docId), { finalized: true, finalizedAt: new Date().toISOString() })
      setFinalized(true)
      onSaved?.()
    } catch {
      alert('No se pudo finalizar. Intenta de nuevo.')
    } finally {
      setFinalizing(false) }
  }

  const handleReset = () => {
    if (isDisabled) return
    if (!confirm('¿Reiniciar todos los puntajes de esta ronda?')) return
    const init = {}
    missions.forEach(m => m.items.forEach(item => { init[item.id] = 0 }))
    setScores(init)
    setSeconds('')
    setSaved(false)
    setSaveError(null)
  }

  const total = computeTotal()
  const pct   = Math.round((total / max) * 100)

  return (
    <div className="space-y-4">

      {/* Finalized banner */}
      {finalized && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30">
          <ShieldCheck size={16} className="text-green-400 shrink-0" />
          <p className="text-green-300 text-sm font-medium">
            Ronda {round} finalizada. Contacta al administrador si necesitas hacer cambios.
          </p>
        </motion.div>
      )}

      {/* Error banner */}
      <AnimatePresence>
        {saveError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <WifiOff size={16} className="text-red-400 shrink-0" />
            <p className="text-red-300 text-sm flex-1">{saveError}</p>
            <button onClick={handleSave}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-300 hover:text-white bg-red-500/20 hover:bg-red-500/40 px-3 py-1.5 rounded-lg transition-all">
              <RefreshCw size={12} /> Reintentar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: -12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/15 border border-green-500/30">
            <CheckCircle size={16} className="text-green-400 shrink-0" />
            <p className="text-green-300 text-sm font-medium">Puntaje guardado correctamente — Ronda {round}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score summary bar */}
      <div className={`card border-${colorKey.class}/30 bg-gradient-to-r from-${colorKey.class}/10 to-transparent`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-gray-400 font-medium">Puntaje total – Ronda {round}</p>
            <p className={`text-4xl font-extrabold font-mono text-${colorKey.class}`}>
              {total}
              <span className="text-lg text-gray-500 font-normal ml-1">/ {max}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{pct}%</p>
            <p className="text-sm text-gray-500">rendimiento</p>
          </div>
        </div>
        <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${colorKey.bg} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Missions */}
      <div className="space-y-3">
        {missions.map((mission, mIdx) => (
          <motion.div key={mission.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: mIdx * 0.06 }}
            className={`card ${isDisabled ? 'opacity-75' : ''}`}>
            <h3 className={`font-bold text-${colorKey.class} mb-1`}>{mission.title}</h3>
            <p className="text-xs text-gray-500 mb-4">{mission.description}</p>

            <div className="space-y-3">
              {mission.items.map(item => {
                const val      = scores[item.id] || 0
                const pts      = val * item.perItem
                const isToggle = !item.count && item.max === 1

                return (
                  <div key={item.id} className="flex items-center gap-3">
                    {isDisabled ? (
                      <span className={`font-mono text-sm font-bold w-7 text-right ${val > 0 ? `text-${colorKey.class}` : 'text-gray-600'}`}>{val}</span>
                    ) : isToggle ? (
                      <ToggleInput value={val} onChange={v => handleChange(item.id, v)} color={colorKey.class} disabled={isDisabled} />
                    ) : (
                      <CounterInput value={val} onChange={v => handleChange(item.id, v)} max={item.max} color={colorKey.class} disabled={isDisabled} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 leading-tight">{item.label}</p>
                      {item.note && <p className="text-xs text-yellow-500/70 mt-0.5">{item.note}</p>}
                    </div>
                    <div className="text-right shrink-0 min-w-[80px]">
                      <span className={`font-mono text-sm font-bold ${pts > 0 ? `text-${colorKey.class}` : 'text-gray-600'}`}>
                        {pts > 0 ? `+${pts}` : '0'} pts
                      </span>
                      {item.totalMax && <p className="text-xs text-gray-600">máx {item.totalMax}</p>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-dark-600 flex justify-between items-center">
              <span className="text-xs text-gray-500">Subtotal misión</span>
              <span className={`font-mono font-bold text-sm text-${colorKey.class}`}>
                {mission.items.reduce((s, item) => s + (scores[item.id] || 0) * item.perItem, 0)} pts
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Time + Save/Finalize */}
      <div className={`card space-y-4 ${finalized ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-gray-500 shrink-0" />
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Tiempo (segundos)</label>
            <input
              type="number"
              className="input-field py-2 text-sm"
              placeholder="Ej: 120"
              value={seconds}
              onChange={e => { setSeconds(e.target.value); setSaved(false) }}
              min={0} max={180}
              disabled={isDisabled}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} disabled={isDisabled}
            className="btn-ghost px-3 py-2 flex items-center gap-1 text-sm disabled:opacity-40">
            <RotateCcw size={15} />
          </button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} disabled={saving || isDisabled}
            className="btn-ghost flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-60 flex-1">
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saved && !saveError ? (
              <><CheckCircle size={16} className="text-green-400" /> Guardado</>
            ) : (
              <><Save size={16} /> Guardar</>
            )}
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleFinalize} disabled={finalizing || !saved || isDisabled}
            className="btn-primary flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-50">
            {finalizing ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><SendHorizonal size={16} /> Finalizar</>
            )}
          </motion.button>
        </div>
        {saved && !finalized && (
          <p className="text-xs text-gray-500 text-center">
            Puedes seguir editando hasta que presiones <span className="text-white font-medium">Finalizar</span>.
          </p>
        )}
      </div>
    </div>
  )
}
