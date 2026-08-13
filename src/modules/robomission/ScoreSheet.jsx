import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Lock, CheckCircle, AlertCircle, X, Plus, Minus } from 'lucide-react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import {
  ELEMENTARY_MISSIONS, ELEMENTARY_MAX,
  JUNIOR_MISSIONS,     JUNIOR_MAX,
  SENIOR_MISSIONS,     SENIOR_MAX,
} from './scoringData'

const MISSIONS_MAP = {
  elementary: { missions: ELEMENTARY_MISSIONS, max: ELEMENTARY_MAX },
  junior:     { missions: JUNIOR_MISSIONS,     max: JUNIOR_MAX },
  senior:     { missions: SENIOR_MISSIONS,     max: SENIOR_MAX },
}

// Build initial values (all zeros)
function buildInitial(missions) {
  const vals = {}
  missions.forEach(m => m.items.forEach(item => {
    vals[item.id] = 0
  }))
  return vals
}

function calcTotal(missions, values) {
  let total = 0
  missions.forEach(mission => {
    mission.items.forEach(item => {
      // Skip mutual losers
      if (item.mutualWith) {
        const sibling = mission.items.find(x => x.id === item.mutualWith)
        if (sibling && values[sibling.id] > 0 && values[item.id] > 0) return
      }
      total += (values[item.id] || 0) * item.perItem
    })
  })
  return total
}

/* Counter input */
function CounterInput({ value, max, onChange, disabled }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 rounded-lg bg-dark-600 hover:bg-dark-500 disabled:opacity-30 flex items-center justify-center transition-colors"
      >
        <Minus size={12} />
      </button>
      <span className="w-8 text-center font-mono font-bold text-sm text-white tabular-nums">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-7 h-7 rounded-lg bg-dark-600 hover:bg-dark-500 disabled:opacity-30 flex items-center justify-center transition-colors"
      >
        <Plus size={12} />
      </button>
    </div>
  )
}

/* Toggle input (max 1) */
function ToggleInput({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(value ? 0 : 1)}
      className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
        value
          ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
          : 'border-dark-500 text-gray-600 hover:border-dark-400'
      } disabled:opacity-30`}
    >
      {value ? <CheckCircle size={16} /> : <div className="w-4 h-4 rounded-full border border-current" />}
    </button>
  )
}

export default function ScoreSheet({ team, round, category, onClose, onSaved }) {
  const { user } = useAuth()
  const { missions, max } = MISSIONS_MAP[category] || MISSIONS_MAP.elementary

  const [values, setValues]       = useState(() => buildInitial(missions))
  const [finalized, setFinalized] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState(null)  // {type, text}
  const [loading, setLoading]     = useState(true)

  const scoreId = `${team.id}_r${round}`

  // Load existing score
  useEffect(() => {
    setLoading(true)
    getDoc(doc(db, 'rm_scores', scoreId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        if (d.values) setValues(d.values)
        setFinalized(!!d.finalized)
      }
    }).finally(() => setLoading(false))
  }, [scoreId])

  const showToast = (type, text, dur = 3000) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), dur)
  }

  const handleChange = (itemId, newVal, item, mission) => {
    if (finalized) return
    setValues(prev => {
      const next = { ...prev, [itemId]: newVal }
      // Mutual exclusion: if setting this to >0, zero the sibling
      if (item.mutualWith && newVal > 0) {
        next[item.mutualWith] = 0
      }
      // Also handle reverse: if sibling is this item's mutualWith
      mission.items.forEach(si => {
        if (si.mutualWith === itemId && newVal > 0) {
          next[si.id] = 0
        }
      })
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, 'rm_scores', scoreId), {
        teamId: team.id,
        teamName: team.name,
        category,
        round,
        values,
        total: calcTotal(missions, values),
        finalized: false,
        judgeUid: user.uid,
        updatedAt: serverTimestamp(),
      })
      showToast('success', 'Puntuación guardada.')
      onSaved?.()
    } catch (e) {
      showToast('error', 'Sin conexión o error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleFinalize = async () => {
    if (!confirm(`¿Finalizar ronda ${round}? No podrás editar después.`)) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'rm_scores', scoreId), {
        teamId: team.id,
        teamName: team.name,
        category,
        round,
        values,
        total: calcTotal(missions, values),
        finalized: true,
        judgeUid: user.uid,
        updatedAt: serverTimestamp(),
      })
      setFinalized(true)
      showToast('success', '¡Ronda finalizada y bloqueada!')
      onSaved?.()
    } catch (e) {
      showToast('error', 'Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const total = calcTotal(missions, values)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-dark-500 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-500/15 border border-green-500/30 text-green-400'
                : 'bg-red-500/15 border border-red-500/30 text-red-400'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-dark-800 pt-2 pb-3 z-10">
        <div>
          <h3 className="font-bold text-white">{team.name} · Ronda {round}</h3>
          <p className="text-xs text-gray-500 capitalize">{category}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-2xl font-extrabold font-mono text-orange-400">{total}</p>
            <p className="text-xs text-gray-500">/ {max} pts</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 ml-2">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Finalized banner */}
      {finalized && (
        <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 mb-4 text-sm text-orange-400">
          <Lock size={16} />
          Esta ronda está finalizada y no puede modificarse.
        </div>
      )}

      {/* Missions */}
      <div className="space-y-4 pb-4">
        {missions.map(mission => (
          <div key={mission.id} className="card">
            <h4 className="font-bold text-white text-sm mb-1">{mission.title}</h4>
            <p className="text-xs text-gray-500 mb-3">{mission.description}</p>
            <div className="space-y-3">
              {mission.items.map(item => {
                const isMutuallyBlocked = item.mutualWith &&
                  mission.items.some(si => si.id === item.mutualWith && values[si.id] > 0)
                const isBlocked = finalized || isMutuallyBlocked

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                      isMutuallyBlocked ? 'opacity-30' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 leading-tight">{item.label}</p>
                      <p className="text-xs text-orange-400 mt-0.5">
                        {item.perItem} pts{item.count && item.max > 1 ? ` × ${item.max} máx` : ''}
                        {item.totalMax ? ` = ${item.totalMax} pts máx` : ''}
                      </p>
                      {item.note && <p className="text-xs text-gray-600 mt-0.5 italic">{item.note}</p>}
                    </div>
                    <div className="shrink-0">
                      {item.count && item.max > 1 ? (
                        <CounterInput
                          value={values[item.id] || 0}
                          max={item.max}
                          disabled={isBlocked}
                          onChange={v => handleChange(item.id, v, item, mission)}
                        />
                      ) : (
                        <ToggleInput
                          value={values[item.id] || 0}
                          disabled={isBlocked}
                          onChange={v => handleChange(item.id, v, item, mission)}
                        />
                      )}
                    </div>
                    {/* Item subtotal */}
                    <div className="w-10 text-right shrink-0">
                      <span className={`text-sm font-mono font-bold ${values[item.id] > 0 && !isMutuallyBlocked ? 'text-orange-400' : 'text-gray-600'}`}>
                        {isMutuallyBlocked ? 0 : (values[item.id] || 0) * item.perItem}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Score bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progreso</span>
          <span>{Math.round((total / max) * 100)}%</span>
        </div>
        <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
            animate={{ width: `${(total / max) * 100}%` }}
            transition={{ type: 'spring', stiffness: 120 }}
          />
        </div>
      </div>

      {/* Actions */}
      {!finalized && (
        <div className="flex gap-2 sticky bottom-0 bg-dark-800 pb-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-ghost flex items-center gap-2 text-sm py-2 px-4 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
          >
            {saving
              ? <span className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
              : <Save size={15} />
            }
            Guardar borrador
          </button>
          <button
            onClick={handleFinalize}
            disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2"
          >
            <Lock size={15} /> Enviar
          </button>
        </div>
      )}
    </div>
  )
}
