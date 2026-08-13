import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Save, CheckCircle, Lock, ChevronDown, ChevronUp,
  Info, Gauge, BookOpen, AlertTriangle,
} from 'lucide-react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { RUBRIC, computeTotal, MAX_SCORE, SCORE_OPTIONS } from './config'

// ─── Colors & labels ────────────────────────────────────────────────────────

const LEVEL_COLORS = {
  6: { bg: 'bg-green-500/15', border: 'border-green-500/40', text: 'text-green-400', ring: 'ring-green-500/50' },
  4: { bg: 'bg-blue-500/15',  border: 'border-blue-500/40',  text: 'text-blue-400',  ring: 'ring-blue-500/50'  },
  2: { bg: 'bg-yellow-500/15',border: 'border-yellow-500/40',text: 'text-yellow-400',ring: 'ring-yellow-500/50'},
  0: { bg: 'bg-red-500/10',   border: 'border-red-500/30',   text: 'text-red-400',   ring: 'ring-red-500/40'   },
}
const LEVEL_LABELS = { 6: 'Excelente', 4: 'Suficiente', 2: 'Básico', 0: 'Ausente' }

// ─── Performance helpers ─────────────────────────────────────────────────────

const PERF_MAX_OPEN     = 30  // 24 + 3 + 3
const PERF_MAX_OBSTACLE = 62  // 30 + 10 + 7 + 15

const EMPTY_PERF_OPEN = {
  sections:        0,
  laps:            0,
  stoppedAtFinish: false,
  repairAction:    false,
}

const EMPTY_PERF_OBSTACLE = {
  sections:         0,
  laps:             0,
  stoppedAtFinish:  false,
  trafficSignScore: null,
  parking181:       false,
  parkingResult:    null,
  repairAction:     false,
}

function computePerfTotal(roundType, perfOpen, perfObstacle) {
  const p = roundType === 'open' ? perfOpen : perfObstacle
  let t = p.sections + p.laps + (p.stoppedAtFinish ? 3 : 0)
  if (roundType === 'obstacle') {
    t += p.trafficSignScore ?? 0
    t += p.parking181 ? 7 : 0
    t += p.parkingResult ?? 0
  }
  if (p.repairAction) t = Math.floor(t / 2)
  return t
}

// ─── Documentation criterion card ───────────────────────────────────────────

function CriterionCard({ criterion, score, onChange, disabled }) {
  const [expanded, setExpanded] = useState(score === undefined)
  const [showAll, setShowAll]   = useState(false)
  const selected = score !== undefined && score !== null
  const lc = selected ? LEVEL_COLORS[score] : null

  return (
    <div className={`rounded-2xl border transition-all ${
      selected ? `${lc.bg} ${lc.border}` : 'bg-dark-800 border-dark-600'
    }`}>
      <button type="button" onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0 border transition-all ${
          selected ? `${lc.bg} ${lc.border} ${lc.text}` : 'bg-dark-700 border-dark-500 text-gray-500'
        }`}>
          {selected ? score : '—'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-tight">{criterion.label}</p>
          {selected && <p className={`text-xs font-medium mt-0.5 ${lc.text}`}>{LEVEL_LABELS[score]}</p>}
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-500 shrink-0" />
                  : <ChevronDown size={16} className="text-gray-500 shrink-0" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <p className="text-xs text-gray-500">{criterion.description}</p>
              <div className="grid grid-cols-2 gap-2">
                {SCORE_OPTIONS.map(val => {
                  const lv = LEVEL_COLORS[val]
                  const isSelected = score === val
                  return (
                    <button key={val} type="button" disabled={disabled}
                      onClick={() => onChange(val)}
                      className={`flex items-start gap-2 p-3 rounded-xl border text-left transition-all disabled:opacity-50 disabled:pointer-events-none ${
                        isSelected
                          ? `${lv.bg} ${lv.border} ring-1 ${lv.ring}`
                          : 'bg-dark-700 border-dark-500 hover:border-dark-400'
                      }`}>
                      <span className={`font-mono font-bold text-base shrink-0 ${isSelected ? lv.text : 'text-gray-500'}`}>
                        {val}
                      </span>
                      <div>
                        <p className={`text-xs font-bold ${isSelected ? lv.text : 'text-gray-400'}`}>
                          {LEVEL_LABELS[val]}
                        </p>
                        <p className={`text-xs leading-snug mt-0.5 ${isSelected ? 'text-gray-300' : 'text-gray-600'}`}>
                          {criterion.levels[val].slice(0, 80) + (criterion.levels[val].length > 80 ? '…' : '')}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              {selected && (
                <button onClick={() => setShowAll(v => !v)}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors">
                  <Info size={11} />
                  {showAll ? 'Ocultar descripción completa' : 'Ver descripción completa del nivel seleccionado'}
                </button>
              )}
              {selected && showAll && (
                <p className="text-xs text-gray-400 bg-dark-700 rounded-xl px-3 py-2 leading-relaxed">
                  {criterion.levels[score]}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({ value, onChange, min = 0, max, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-8 h-8 rounded-lg bg-dark-700 border border-dark-500 text-gray-300 hover:border-dark-400 disabled:opacity-30 font-bold text-lg leading-none flex items-center justify-center transition-all">
        −
      </button>
      <span className="font-mono font-extrabold text-xl text-white w-10 text-center">{value}</span>
      <button type="button" disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 rounded-lg bg-dark-700 border border-dark-500 text-gray-300 hover:border-dark-400 disabled:opacity-30 font-bold text-lg leading-none flex items-center justify-center transition-all">
        +
      </button>
      <span className="text-xs text-gray-600">/ {max}</span>
    </div>
  )
}

// ─── Performance scoring tab ─────────────────────────────────────────────────

function PerformanceSection({ roundType, setRoundType, perf, setPerf, disabled }) {
  const up = (key, val) => setPerf(p => ({ ...p, [key]: val }))
  const maxPts = roundType === 'open' ? PERF_MAX_OPEN : PERF_MAX_OBSTACLE
  const total  = (() => {
    let t = perf.sections + perf.laps + (perf.stoppedAtFinish ? 3 : 0)
    if (roundType === 'obstacle') {
      t += perf.trafficSignScore ?? 0
      t += perf.parking181 ? 7 : 0
      t += perf.parkingResult ?? 0
    }
    if (perf.repairAction) t = Math.floor(t / 2)
    return t
  })()

  // Traffic sign option definitions
  const trafficOpts = roundType === 'obstacle' ? [
    { value: 2,  label: '1.4 – Señales movidas, < 3 vueltas', color: 'text-yellow-400', border: 'border-yellow-500/40', bg: 'bg-yellow-500/10' },
    { value: 4,  label: '1.5 – Sin señales movidas, < 3 vueltas', color: 'text-blue-400', border: 'border-blue-500/40', bg: 'bg-blue-500/10' },
    { value: 8,  label: '1.6 – Señales movidas, 3 vueltas', color: 'text-orange-400', border: 'border-orange-500/40', bg: 'bg-orange-500/10' },
    { value: 10, label: '1.7 – Sin señales movidas, 3 vueltas', color: 'text-green-400', border: 'border-green-500/40', bg: 'bg-green-500/10' },
  ] : []

  return (
    <div className="space-y-4">
      {/* Total bar */}
      <div className="card bg-teal-500/10 border-teal-500/30">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total desempeño</p>
            <p className="font-mono font-extrabold text-3xl text-teal-400">
              {total}
              <span className="text-sm text-gray-500 font-normal ml-1">/ {maxPts} pts</span>
            </p>
          </div>
          <p className="font-bold text-2xl text-teal-400 opacity-70">
            {Math.round((total / maxPts) * 100)}%
          </p>
        </div>
        <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
          <motion.div className="h-full bg-teal-500 rounded-full"
            style={{ width: `${Math.min(100, Math.round((total / maxPts) * 100))}%` }}
            transition={{ duration: 0.4 }} />
        </div>
        {perf.repairAction && (
          <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
            <AlertTriangle size={11} /> Puntaje dividido por 2 (acción de reparación)
          </p>
        )}
      </div>

      {/* Round type selector */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tipo de ronda</p>
        <div className="grid grid-cols-2 gap-2">
          {[['open', 'Reto Abierto', '30 pts'], ['obstacle', 'Reto con Obstáculos', '62 pts']].map(([val, label, sub]) => (
            <button key={val} type="button"
              onClick={() => setRoundType(val)}
              className={`py-3 px-3 rounded-xl border text-left transition-all disabled:opacity-50 ${
                roundType === val
                  ? 'bg-teal-500/15 border-teal-500/40 text-teal-400'
                  : 'bg-dark-700 border-dark-500 text-gray-400 hover:border-dark-400'
              }`}>
              <p className="font-bold text-sm">{label}</p>
              <p className={`text-xs mt-0.5 ${roundType === val ? 'text-teal-400/70' : 'text-gray-600'}`}>{sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 1.1 Sections */}
      <div className="card">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-semibold text-white text-sm">1.1 · Avance por sección</p>
            <p className="text-xs text-gray-500 mt-0.5">1 pt por sección superada en la dirección del reto (máx. 24 — 8 secciones × 3 vueltas)</p>
          </div>
          <span className="font-mono font-bold text-teal-400 text-sm shrink-0">{perf.sections} pt</span>
        </div>
        <Stepper value={perf.sections} onChange={v => up('sections', v)} min={0} max={24} disabled={disabled} />
      </div>

      {/* 1.2 Laps */}
      <div className="card">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-semibold text-white text-sm">1.2 · Vueltas completas</p>
            <p className="text-xs text-gray-500 mt-0.5">1 pt por vuelta completa (las 8 secciones superadas en orden)</p>
          </div>
          <span className="font-mono font-bold text-teal-400 text-sm shrink-0">{perf.laps} pt</span>
        </div>
        <Stepper value={perf.laps} onChange={v => up('laps', v)} min={0} max={3} disabled={disabled} />
      </div>

      {/* 1.3 Stop at finish */}
      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-white text-sm">1.3 · Detención en sección de meta</p>
            <p className="text-xs text-gray-500 mt-0.5">Tras 3 vueltas, el vehículo se detiene en meta — 3 pts</p>
          </div>
          <button type="button" disabled={disabled}
            onClick={() => up('stoppedAtFinish', !perf.stoppedAtFinish)}
            className={`px-4 py-2 rounded-xl border font-bold text-sm transition-all disabled:opacity-50 ${
              perf.stoppedAtFinish
                ? 'bg-green-500/15 border-green-500/40 text-green-400'
                : 'bg-dark-700 border-dark-500 text-gray-500 hover:border-dark-400'
            }`}>
            {perf.stoppedAtFinish ? '✓ 3 pts' : '—'}
          </button>
        </div>
      </div>

      {/* Obstacle-only criteria */}
      {roundType === 'obstacle' && (
        <>
          {/* 1.4-1.7 Traffic signs */}
          <div className="card">
            <p className="font-semibold text-white text-sm mb-1">Señales de tránsito</p>
            <p className="text-xs text-gray-500 mb-3">Selecciona el que aplique (solo uno)</p>
            <div className="space-y-2">
              {trafficOpts.map(opt => (
                <button key={opt.value} type="button" disabled={disabled}
                  onClick={() => up('trafficSignScore', perf.trafficSignScore === opt.value ? null : opt.value)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition-all disabled:opacity-50 ${
                    perf.trafficSignScore === opt.value
                      ? `${opt.bg} ${opt.border} ${opt.color}`
                      : 'bg-dark-700 border-dark-500 text-gray-400 hover:border-dark-400'
                  }`}>
                  <span className="text-xs font-medium leading-snug">{opt.label}</span>
                  <span className={`font-mono font-bold text-sm shrink-0 ${perf.trafficSignScore === opt.value ? opt.color : 'text-gray-600'}`}>
                    {opt.value} pt
                  </span>
                </button>
              ))}
              <button type="button" disabled={disabled}
                onClick={() => up('trafficSignScore', null)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition-all disabled:opacity-50 ${
                  perf.trafficSignScore === null
                    ? 'bg-dark-600 border-dark-400 text-gray-400'
                    : 'bg-dark-700 border-dark-500 text-gray-600 hover:border-dark-400'
                }`}>
                <span className="text-xs">No aplica / no califica</span>
                <span className="font-mono font-bold text-sm text-gray-600">0 pt</span>
              </button>
            </div>
          </div>

          {/* 1.8 Parking */}
          <div className="card">
            <p className="font-semibold text-white text-sm mb-1">Estacionamiento (1.8)</p>
            <p className="text-xs text-gray-500 mb-3">Solo aplica si el vehículo hizo al menos una vuelta completa</p>

            {/* 1.8.1 */}
            <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-dark-600">
              <div>
                <p className="text-xs font-semibold text-white">1.8.1 · Inició desde cajón + ≥1 vuelta</p>
                <p className="text-xs text-gray-500 mt-0.5">7 pts</p>
              </div>
              <button type="button" disabled={disabled}
                onClick={() => up('parking181', !perf.parking181)}
                className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all disabled:opacity-50 ${
                  perf.parking181
                    ? 'bg-teal-500/15 border-teal-500/40 text-teal-400'
                    : 'bg-dark-700 border-dark-500 text-gray-500 hover:border-dark-400'
                }`}>
                {perf.parking181 ? '✓ 7 pts' : '—'}
              </button>
            </div>

            {/* 1.8.2 / 1.8.3 — mutually exclusive */}
            <p className="text-xs text-gray-500 mb-2">Resultado del estacionamiento (selecciona uno):</p>
            <div className="space-y-2">
              {[
                { val: 15, label: '1.8.2 – Estacionamiento exitoso', sub: 'Completamente dentro del área, en posición paralela', color: 'text-green-400', border: 'border-green-500/40', bg: 'bg-green-500/10' },
                { val: 7,  label: '1.8.3 – Estacionamiento parcial o no paralelo', sub: 'Dentro del área pero no paralelo o parcialmente fuera', color: 'text-yellow-400', border: 'border-yellow-500/40', bg: 'bg-yellow-500/10' },
              ].map(opt => (
                <button key={opt.val} type="button" disabled={disabled}
                  onClick={() => up('parkingResult', perf.parkingResult === opt.val ? null : opt.val)}
                  className={`w-full flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition-all disabled:opacity-50 ${
                    perf.parkingResult === opt.val
                      ? `${opt.bg} ${opt.border}`
                      : 'bg-dark-700 border-dark-500 hover:border-dark-400'
                  }`}>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${perf.parkingResult === opt.val ? opt.color : 'text-gray-300'}`}>{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                  </div>
                  <span className={`font-mono font-bold text-sm shrink-0 ${perf.parkingResult === opt.val ? opt.color : 'text-gray-600'}`}>
                    {opt.val} pt
                  </span>
                </button>
              ))}
              <button type="button" disabled={disabled}
                onClick={() => up('parkingResult', null)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-xs transition-all disabled:opacity-50 ${
                  perf.parkingResult === null
                    ? 'bg-dark-600 border-dark-400 text-gray-400'
                    : 'bg-dark-700 border-dark-500 text-gray-600 hover:border-dark-400'
                }`}>
                <span>Sin estacionamiento</span>
                <span className="font-mono font-bold text-gray-600">0 pt</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Repair action */}
      <div className={`card border-2 transition-all ${perf.repairAction ? 'border-amber-500/50 bg-amber-500/5' : 'border-dark-600'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-white text-sm">Acción de reparación</p>
            <p className="text-xs text-gray-500 mt-0.5">El equipo retiró el vehículo del campo para repararlo — el puntaje de la ronda se divide entre 2</p>
          </div>
          <button type="button" disabled={disabled}
            onClick={() => up('repairAction', !perf.repairAction)}
            className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all shrink-0 disabled:opacity-50 ${
              perf.repairAction
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-dark-700 border-dark-500 text-gray-500 hover:border-dark-400'
            }`}>
            {perf.repairAction ? '÷2' : '—'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ScoreSheet ─────────────────────────────────────────────────────────

export default function FEScoreSheet({ team, elapsedSeconds = 0, onResetTimer, onClose, onSaved }) {
  const { user, profile } = useAuth()

  // Documentation rubric
  const [scores, setScores]     = useState({})

  // Vehicle performance — separate state per round type
  const [roundType, setRoundType]       = useState('open')
  const [perfOpen, setPerfOpen]         = useState(EMPTY_PERF_OPEN)
  const [perfObstacle, setPerfObstacle] = useState(EMPTY_PERF_OBSTACLE)

  // UI state
  const [scoreTab, setScoreTab]   = useState('performance')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [finalized, setFinalized] = useState(false)
  const [savedOnce, setSavedOnce] = useState(false)
  const [toast, setToast]         = useState(null)

  const docId  = `${team.id}_${user.uid}`
  const colRef = 'fe_scores'

  useEffect(() => {
    getDoc(doc(db, colRef, docId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setScores(d.scores || {})
        setFinalized(d.finalized || false)
        setSavedOnce(true)
        if (d.roundType)          setRoundType(d.roundType)
        if (d.performanceOpen)    setPerfOpen({ ...EMPTY_PERF_OPEN, ...d.performanceOpen })
        if (d.performanceObstacle) setPerfObstacle({ ...EMPTY_PERF_OBSTACLE, ...d.performanceObstacle })
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [docId])

  const changeRoundType = (rt) => { setRoundType(rt); if (!finalized) onResetTimer?.() }

  const docTotal   = computeTotal(scores)
  const perfTotal  = computePerfTotal(roundType, perfOpen, perfObstacle)
  const allDocDone = RUBRIC.every(c => scores[c.id] !== undefined && scores[c.id] !== null)

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const buildPayload = (isFinal) => ({
    teamId:           team.id,
    teamName:         team.name,
    judgeUid:         user.uid,
    judgeName:        profile?.name || user.email,
    // Documentation
    scores,
    total:            docTotal,
    // Performance
    roundType,
    performanceOpen:     perfOpen,
    performanceObstacle: perfObstacle,
    performanceTotal:    perfTotal,
    elapsedSeconds,
    finalized:        isFinal,
    savedAt:          serverTimestamp(),
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, colRef, docId), buildPayload(false), { merge: true })
      setSavedOnce(true)
      showToast('success', 'Borrador guardado.')
      onSaved?.()
    } catch {
      showToast('error', 'Error al guardar. Intenta de nuevo.')
    } finally { setSaving(false) }
  }

  const handleFinalize = async () => {
    if (!allDocDone) {
      showToast('error', 'Completa todos los criterios de documentación antes de finalizar.')
      setScoreTab('documentation')
      return
    }
    if (!confirm('¿Finalizar evaluación? No podrás editar después.')) return
    setSaving(true)
    try {
      await setDoc(doc(db, colRef, docId), buildPayload(true), { merge: true })
      setFinalized(true)
      setSavedOnce(true)
      showToast('success', '¡Evaluación finalizada!')
      onSaved?.()
    } catch {
      showToast('error', 'Error al guardar.')
    } finally { setSaving(false) }
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-dark-500 border-t-teal-500 rounded-full animate-spin" />
      </div>
    )
  }

  const maxPts = roundType === 'open' ? PERF_MAX_OPEN : PERF_MAX_OBSTACLE

  return (
    <div className="space-y-4">
      {/* Finalized banner */}
      {finalized && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30">
          <Lock size={16} className="text-green-400 shrink-0" />
          <div>
            <p className="font-bold text-green-400 text-sm">Evaluación finalizada</p>
            <p className="text-xs text-gray-500">Solicita al administrador si necesitas hacer cambios.</p>
          </div>
        </motion.div>
      )}

      {/* Combined summary strip */}
      <div className="grid grid-cols-2 gap-2">
        <div className="card bg-teal-500/10 border-teal-500/30 text-center py-2">
          <p className="text-xs text-gray-500 font-medium">Desempeño</p>
          <p className="font-mono font-extrabold text-xl text-teal-400">{perfTotal}<span className="text-xs text-gray-500 font-normal">/{maxPts}</span></p>
        </div>
        <div className="card bg-indigo-500/10 border-indigo-500/30 text-center py-2">
          <p className="text-xs text-gray-500 font-medium">Documentación</p>
          <p className="font-mono font-extrabold text-xl text-indigo-400">{docTotal}<span className="text-xs text-gray-500 font-normal">/{MAX_SCORE}</span></p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 bg-dark-700 p-1 rounded-xl">
        <button onClick={() => setScoreTab('performance')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
            scoreTab === 'performance' ? 'bg-dark-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'
          }`}>
          <Gauge size={14} /> Desempeño
        </button>
        <button onClick={() => setScoreTab('documentation')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
            scoreTab === 'documentation' ? 'bg-dark-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'
          }`}>
          <BookOpen size={14} /> Documentación
          {!allDocDone && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
        </button>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {scoreTab === 'performance' ? (
          <motion.div key="performance"
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
            <PerformanceSection
              roundType={roundType} setRoundType={changeRoundType}
              perf={roundType === 'open' ? perfOpen : perfObstacle}
              setPerf={roundType === 'open' ? setPerfOpen : setPerfObstacle}
              disabled={finalized}
            />
          </motion.div>
        ) : (
          <motion.div key="documentation"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            className="space-y-3">
            {/* Documentation total bar */}
            <div className="card bg-indigo-500/10 border-indigo-500/30">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total documentación</p>
                  <p className="font-mono font-extrabold text-3xl text-indigo-400">
                    {docTotal}
                    <span className="text-sm text-gray-500 font-normal ml-1">/ {MAX_SCORE} pts</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-2xl text-indigo-400 opacity-70">{Math.round((docTotal / MAX_SCORE) * 100)}%</p>
                  <p className="text-xs text-gray-600">{RUBRIC.filter(c => scores[c.id] !== undefined).length}/{RUBRIC.length} criterios</p>
                </div>
              </div>
              <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                <motion.div className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${Math.round((docTotal / MAX_SCORE) * 100)}%` }}
                  transition={{ duration: 0.4 }} />
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {RUBRIC.map(c => {
                  const s = scores[c.id]
                  const lc = s !== undefined ? LEVEL_COLORS[s] : null
                  return (
                    <span key={c.id} className={`text-xs px-2 py-0.5 rounded-full border font-mono ${
                      s !== undefined ? `${lc.bg} ${lc.border} ${lc.text}` : 'bg-dark-700 border-dark-600 text-gray-600'
                    }`}>
                      {c.shortLabel}: {s !== undefined ? s : '—'}
                    </span>
                  )
                })}
              </div>
            </div>

            {RUBRIC.map(criterion => (
              <CriterionCard
                key={criterion.id}
                criterion={criterion}
                score={scores[criterion.id]}
                onChange={val => !finalized && setScores(s => ({ ...s, [criterion.id]: val }))}
                disabled={finalized}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
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
        <div className="space-y-2 pb-8">
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="btn-ghost flex-1 flex items-center justify-center gap-2">
              {saving
                ? <span className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                : <><Save size={16} /> Guardar borrador</>}
            </button>
            <button onClick={handleFinalize} disabled={saving || !allDocDone}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
              {saving
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><CheckCircle size={16} /> Enviar</>}
            </button>
          </div>
          {!allDocDone && (
            <p className="text-xs text-center text-gray-600">
              Completa los {RUBRIC.length - RUBRIC.filter(c => scores[c.id] !== undefined).length} criterios de documentación para finalizar.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
