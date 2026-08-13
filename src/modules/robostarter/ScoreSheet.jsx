import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, CheckCircle, Lock, Info, ChevronDown, ChevronUp, BookOpen, Star } from 'lucide-react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { DOC_RUBRIC, DOC_MAX, MISSION_MAX } from './config'

const CC = {
  elementary: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', bar: 'bg-green-500' },
  junior:     { text: 'text-lime-400',  bg: 'bg-lime-500/10',  border: 'border-lime-500/30',  bar: 'bg-lime-500'  },
}

// Puntuación numérica de misión por ronda
function MissionRoundTab({ round, missionScore, onChange, disabled, cc }) {
  return (
    <div className={`card ${cc.bg} ${cc.border}`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ronda {round} — Puntaje en tapete</p>
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => onChange(Math.max(0, missionScore - 5))} disabled={disabled}
          className="w-10 h-10 rounded-xl bg-dark-600 border border-dark-500 text-gray-300 font-bold text-xl flex items-center justify-center disabled:opacity-40">−</button>
        <input type="number" min={0} max={MISSION_MAX} value={missionScore} disabled={disabled}
          onChange={e => onChange(Math.min(MISSION_MAX, Math.max(0, Number(e.target.value))))}
          className={`w-24 text-center font-mono font-extrabold text-3xl bg-transparent border-b-2 ${cc.border} ${cc.text} focus:outline-none`} />
        <button type="button" onClick={() => onChange(Math.min(MISSION_MAX, missionScore + 5))} disabled={disabled}
          className="w-10 h-10 rounded-xl bg-dark-600 border border-dark-500 text-gray-300 font-bold text-xl flex items-center justify-center disabled:opacity-40">+</button>
        <span className="text-gray-500 text-sm">/ {MISSION_MAX}</span>
      </div>
    </div>
  )
}

// Rúbrica de documentación
function DocRubric({ scores, onChange, disabled, cc }) {
  const total = DOC_RUBRIC.reduce((acc, c) => acc + (scores[c.id] ?? 0), 0)
  const [hints, setHints] = useState({})

  return (
    <div className="space-y-3">
      <div className={`card ${cc.bg} ${cc.border}`}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rúbrica de Documentación</p>
          <span className={`font-mono font-bold ${cc.text}`}>{total}/{DOC_MAX}</span>
        </div>
        <div className="h-2 bg-dark-600 rounded-full overflow-hidden mt-2">
          <motion.div className={`h-full ${cc.bar} rounded-full`} style={{ width: `${(total / DOC_MAX) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      {DOC_RUBRIC.map(criterion => {
        const val = scores[criterion.id] ?? 0
        return (
          <div key={criterion.id} className="card">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-white">{criterion.label}</p>
                  <button type="button" onClick={() => setHints(h => ({ ...h, [criterion.id]: !h[criterion.id] }))}
                    className="text-gray-600 hover:text-gray-400"><Info size={13} /></button>
                </div>
                <p className="text-xs text-gray-500">máx. {criterion.maxPts} pts</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" disabled={disabled} onClick={() => onChange(criterion.id, Math.max(0, val - 1))}
                  className="w-8 h-8 rounded-lg bg-dark-600 border border-dark-500 text-gray-300 font-bold flex items-center justify-center disabled:opacity-40">−</button>
                <span className={`w-10 text-center font-mono font-bold text-xl ${cc.text}`}>{val}</span>
                <button type="button" disabled={disabled} onClick={() => onChange(criterion.id, Math.min(criterion.maxPts, val + 1))}
                  className="w-8 h-8 rounded-lg bg-dark-600 border border-dark-500 text-gray-300 font-bold flex items-center justify-center disabled:opacity-40">+</button>
              </div>
            </div>
            <AnimatePresence>
              {hints[criterion.id] && (
                <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="text-xs text-gray-500 italic overflow-hidden">
                  {criterion.hint}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                <motion.div className={`h-full ${cc.bar} rounded-full`}
                  style={{ width: `${(val / criterion.maxPts) * 100}%` }} transition={{ duration: 0.2 }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function RSScoreSheet({ team, category, round, onClose, onSaved }) {
  const { user, profile } = useAuth()
  const cc = CC[category] || CC.elementary

  // tab: 'mission' | 'doc'
  const [tab, setTab]             = useState('mission')
  const [missionScore, setMissionScore] = useState(0)
  const [docScores, setDocScores] = useState({})
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [finalized, setFinalized] = useState(false)
  const [savedOnce, setSavedOnce] = useState(false)
  const [toast, setToast]         = useState(null)

  const scoreId = `${team.id}_r${round}`

  useEffect(() => {
    getDoc(doc(db, 'rs_scores', scoreId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setMissionScore(d.missionScore ?? 0)
        setDocScores(d.docScores || {})
        setFinalized(d.finalized || false)
        setSavedOnce(true)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [scoreId])

  const docTotal     = DOC_RUBRIC.reduce((acc, c) => acc + (docScores[c.id] ?? 0), 0)
  const grandTotal   = missionScore + docTotal

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const buildPayload = (fin) => ({
    teamId: team.id, teamName: team.name, category, round,
    judgeUid: user.uid, judgeName: profile?.name || user.email,
    missionScore, docScores, docTotal, total: grandTotal,
    finalized: fin, savedAt: serverTimestamp(),
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, 'rs_scores', scoreId), buildPayload(false), { merge: true })
      setSavedOnce(true); showToast('success', 'Guardado.')
      onSaved?.()
    } catch { showToast('error', 'Error al guardar.')
    } finally { setSaving(false) }
  }

  const handleFinalize = async () => {
    if (!confirm('¿Finalizar esta ronda? No podrás editar después.')) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'rs_scores', scoreId), buildPayload(true), { merge: true })
      setFinalized(true); setSavedOnce(true); showToast('success', '¡Ronda finalizada!')
      onSaved?.()
    } catch { showToast('error', 'Error al guardar.')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-3 border-dark-500 border-t-green-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      {finalized && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30">
          <Lock size={16} className="text-green-400 shrink-0" />
          <div>
            <p className="font-bold text-green-400 text-sm">Ronda finalizada</p>
            <p className="text-xs text-gray-500">Solicita al administrador si necesitas hacer cambios.</p>
          </div>
        </motion.div>
      )}

      {/* Total */}
      <div className={`card ${cc.bg} ${cc.border}`}>
        <div className="flex items-end justify-between mb-1">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total ronda {round}</p>
            <p className={`font-mono font-extrabold text-3xl ${cc.text}`}>
              {grandTotal} <span className="text-sm text-gray-500 font-normal">pts</span>
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Misión: <span className={cc.text}>{missionScore}</span></p>
            <p>Doc: <span className={cc.text}>{docTotal}</span></p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-dark-700 p-1 rounded-xl">
        {[['mission', '🎯 Misión'], ['doc', '📄 Documentación']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === id ? 'bg-dark-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'mission' ? (
          <motion.div key="mission" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
            <MissionRoundTab round={round} missionScore={missionScore}
              onChange={setMissionScore} disabled={finalized} cc={cc} />
            <p className="text-xs text-gray-600 mt-2 text-center">
              Ingresa los puntos que el equipo obtuvo en el tapete durante la ronda.
            </p>
          </motion.div>
        ) : (
          <motion.div key="doc" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <DocRubric scores={docScores}
              onChange={(id, val) => !finalized && setDocScores(s => ({ ...s, [id]: val }))}
              disabled={finalized} cc={cc} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                : 'bg-red-500/20 border border-red-500/40 text-red-300'
            }`}>
            {toast.type === 'success' && <CheckCircle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {!finalized && (
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-ghost flex-1 flex items-center justify-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
              : <><Save size={16} /> Guardar borrador</>}
          </button>
          <button onClick={handleFinalize} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><CheckCircle size={16} /> Enviar</>}
          </button>
        </div>
      )}
    </div>
  )
}
