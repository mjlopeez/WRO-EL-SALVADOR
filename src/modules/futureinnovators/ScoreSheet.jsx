import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, CheckCircle, Lock, Info, ChevronDown, ChevronUp, MessageSquare, AlertTriangle } from 'lucide-react'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { RUBRICS, computeTotal, MAX_SCORE } from './config'

// Equipos que obtienen 0 pts en Research & Report por no haberlo entregado
const RESEARCH_DISABLED_TEAMS = ['cuscabot', 'los inges', 'nova tech future innovators']

const CC = {
  elementary: { text: 'text-elementary', bg: 'bg-elementary/10', border: 'border-elementary/30', bar: 'bg-elementary' },
  junior:     { text: 'text-junior',     bg: 'bg-junior/10',     border: 'border-junior/30',     bar: 'bg-junior'     },
  senior:     { text: 'text-senior',     bg: 'bg-senior/10',     border: 'border-senior/30',     bar: 'bg-senior'     },
}

function ScoreInput({ value, onChange, disabled }) {
  return (
    <div className={`flex items-center gap-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 rounded-lg bg-dark-600 border border-dark-500 hover:border-dark-400 text-gray-300 font-bold text-lg flex items-center justify-center transition-all active:scale-95"
      >
        −
      </button>
      <span className="w-10 text-center font-mono font-bold text-xl text-white tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(10, value + 1))}
        className="w-8 h-8 rounded-lg bg-dark-600 border border-dark-500 hover:border-dark-400 text-gray-300 font-bold text-lg flex items-center justify-center transition-all active:scale-95"
      >
        +
      </button>
    </div>
  )
}

function CriterionRow({ criterion, score, onChange, disabled, colorText }) {
  const [showHint, setShowHint] = useState(false)
  const pts = Math.round(score / 10 * criterion.maxPts)
  const pct = score / 10

  return (
    <div className="py-3 border-b border-dark-700 last:border-0">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-white leading-tight">{criterion.label}</p>
            <button
              type="button"
              onClick={() => setShowHint(v => !v)}
              className="text-gray-600 hover:text-gray-400 transition-colors shrink-0"
            >
              <Info size={13} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">máx. {criterion.maxPts} pts</p>
        </div>
        <ScoreInput value={score} onChange={onChange} disabled={disabled} />
      </div>

      <AnimatePresence>
        {showHint && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-gray-500 italic mb-2 overflow-hidden"
          >
            {criterion.hint}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Mini bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-dark-600 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${colorText.replace('text-', 'bg-')}`}
            style={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
        <span className={`font-mono text-xs font-bold ${colorText} w-10 text-right tabular-nums`}>
          {pts} pts
        </span>
      </div>
    </div>
  )
}

export default function ScoreSheet({ team, category, pairId, pairName, onClose, onSaved }) {
  const { user, profile } = useAuth()
  const rubric = RUBRICS[category] || RUBRICS.elementary
  const cc = CC[category] || CC.elementary

  // scores: { criterionId: 0-10 }
  const [scores, setScores]       = useState({})
  const [comments, setComments]   = useState('')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [finalized, setFinalized] = useState(false)
  const [savedOnce, setSavedOnce] = useState(false)
  const [toast, setToast]         = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [showZeroWarn, setShowZeroWarn] = useState(false)

  const docId = `${team.id}_${user.uid}`
  const colRef = 'fi_scores'

  useEffect(() => {
    getDoc(doc(db, colRef, docId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data()
        setScores(data.scores || {})
        setComments(data.comments || '')
        setFinalized(data.finalized || false)
        setSavedOnce(true)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [docId])

  const researchDisabled = RESEARCH_DISABLED_TEAMS.some(n => team?.name?.toLowerCase().includes(n))
  const effectiveScores  = researchDisabled ? { ...scores, research_report: 0 } : scores
  const total = computeTotal(category, effectiveScores)
  const pct   = Math.round((total / MAX_SCORE) * 100)

  const setScore = (id, val) => {
    if (finalized) return
    setScores(s => ({ ...s, [id]: val }))
  }

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const buildPayload = (fin) => ({
    teamId:    team.id,
    teamName:  team.name,
    category,
    judgeUid:  user.uid,
    judgeName: profile?.name || user.email,
    pairId:    pairId  || null,
    pairName:  pairName || null,
    scores:    effectiveScores,
    comments,
    total,
    finalized: fin,
    savedAt:   serverTimestamp(),
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, colRef, docId), buildPayload(false), { merge: true })
      setSavedOnce(true)
      showToast('success', 'Puntaje guardado.')
      onSaved?.()
    } catch {
      showToast('error', 'Sin conexión o error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleFinalize = () => {
    if (total === 0) { setShowZeroWarn(true); return }
    doFinalize()
  }

  const doFinalize = async () => {
    setShowZeroWarn(false)
    if (!confirm('¿Finalizar evaluación? No podrás editar el puntaje después.')) return
    setSaving(true)
    try {
      await setDoc(doc(db, colRef, docId), buildPayload(true), { merge: true })
      setFinalized(true)
      setSavedOnce(true)
      showToast('success', '¡Evaluación finalizada!')
      onSaved?.()
    } catch {
      showToast('error', 'Sin conexión o error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className={`w-8 h-8 border-3 border-dark-500 border-t-violet-500 rounded-full animate-spin`} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Zero-score warning dialog */}
      {showZeroWarn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="card max-w-sm w-full border-yellow-500/40 bg-dark-800">
            <div className="text-center mb-4">
              <AlertTriangle size={36} className="text-yellow-400 mx-auto mb-2" />
              <p className="font-bold text-white text-lg">Puntaje en cero</p>
              <p className="text-sm text-gray-400 mt-1">
                El puntaje total es <span className="text-yellow-400 font-semibold">0</span>.
                ¿Deseas corregirlo o aceptar y enviar de todas formas?
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowZeroWarn(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm border border-dark-500 text-gray-300 hover:text-white hover:border-gray-400 transition-all">
                Corregir
              </button>
              <button onClick={doFinalize}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 transition-all">
                Aceptar y enviar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Finalized banner */}
      {finalized && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30"
        >
          <Lock size={16} className="text-green-400 shrink-0" />
          <div>
            <p className="font-bold text-green-400 text-sm">Evaluación finalizada</p>
            <p className="text-xs text-gray-500">No se puede editar. Solicita al administrador si necesitas hacer cambios.</p>
          </div>
        </motion.div>
      )}

      {/* Total progress card */}
      <div className={`card ${cc.bg} ${cc.border}`}>
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</p>
            <p className={`font-mono font-extrabold text-3xl ${cc.text}`}>
              {total}
              <span className="text-sm text-gray-500 font-normal ml-1">/ {MAX_SCORE} pts</span>
            </p>
          </div>
          <span className={`text-2xl font-bold ${cc.text} opacity-60`}>{pct}%</span>
        </div>
        <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${cc.bar.replace('bg-', 'bg-')} rounded-full`}
            style={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Rubric sections */}
      {rubric.map((section) => {
        const sectionPts = section.criteria.reduce(
          (acc, c) => acc + Math.round((scores[c.id] ?? 0) / 10 * c.maxPts), 0
        )
        const isCollapsed = collapsed[section.sectionKey]

        return (
          <div key={section.sectionKey} className="card">
            <button
              type="button"
              onClick={() => setCollapsed(c => ({ ...c, [section.sectionKey]: !c[section.sectionKey] }))}
              className="w-full flex items-center justify-between mb-1"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{section.section}</span>
                <span className={`text-xs font-mono ${cc.text}`}>{sectionPts}/{section.sectionMax}</span>
              </div>
              {isCollapsed ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronUp size={16} className="text-gray-500" />}
            </button>

            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2">
                    {section.criteria.map(criterion => {
                      const isResearchLocked = researchDisabled && criterion.id === 'research_report'
                      if (isResearchLocked) {
                        return (
                          <div key={criterion.id} className="py-3 border-b border-dark-700 last:border-0">
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                              <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-white leading-tight">{criterion.label}</p>
                                <p className="text-xs text-red-400 mt-1 font-medium">
                                  Obtienen 0/{criterion.maxPts} puntos en Research &amp; Report.
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return (
                        <CriterionRow
                          key={criterion.id}
                          criterion={criterion}
                          score={scores[criterion.id] ?? 0}
                          onChange={val => setScore(criterion.id, val)}
                          disabled={finalized}
                          colorText={cc.text}
                        />
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {/* Comments */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={15} className={cc.text} />
          <span className="font-bold text-white text-sm">Comentarios</span>
          <span className="text-xs text-gray-600 ml-1">opcional</span>
        </div>
        <textarea
          rows={4}
          disabled={finalized}
          placeholder="Escribe observaciones, fortalezas o áreas de mejora del equipo..."
          value={comments}
          onChange={e => setComments(e.target.value)}
          className={`w-full bg-dark-600 border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none transition-all focus:outline-none focus:ring-1 ${
            finalized
              ? 'border-dark-500 opacity-60 cursor-not-allowed'
              : `border-dark-500 focus:border-violet-500/50 focus:ring-violet-500/20`
          }`}
        />
        {comments && (
          <p className="text-xs text-gray-600 mt-1.5 text-right">{comments.length} caracteres</p>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-green-500/20 border border-green-500/40 text-green-300' :
              toast.type === 'error'   ? 'bg-red-500/20 border border-red-500/40 text-red-300' :
                                         'bg-dark-600 border border-dark-500 text-gray-300'
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      {!finalized && (
        <div className="space-y-2">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-ghost flex-1 flex items-center justify-center gap-2"
            >
              {saving
                ? <span className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                : <><Save size={16} /> Guardar borrador</>
              }
            </button>
            <button
              onClick={handleFinalize}
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><CheckCircle size={16} /> Enviar</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
