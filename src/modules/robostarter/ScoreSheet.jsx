import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, CheckCircle, Lock, Info } from 'lucide-react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import {
  MISSION_MAX,
  JUNIOR_MISSION_MAX, JUNIOR_MISSION_DEFAULTS, calcJuniorMissionScore,
} from './config'

const CC = {
  elementary: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', bar: 'bg-green-500' },
  junior:     { text: 'text-lime-400',  bg: 'bg-lime-500/10',  border: 'border-lime-500/30',  bar: 'bg-lime-500'  },
}

// ── Selector de opciones para una misión ──────────────────────────────────────
function ChoiceField({ label, hint, options, value, onChange, disabled, cc }) {
  return (
    <div className="card">
      <p className="text-sm font-semibold text-white mb-0.5">{label}</p>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt.value} type="button" disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 ${
              value === opt.value
                ? `${cc.bg} ${cc.border} ${cc.text}`
                : 'border-dark-500 text-gray-500 hover:text-gray-300'
            }`}>
            {opt.label}
            <span className={`ml-1.5 font-mono font-bold ${value === opt.value ? cc.text : 'text-gray-600'}`}>
              {opt.value} pts
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Misiones Junior (WRO 2026 — Robots Meet Culture) ─────────────────────────
function JuniorMissions({ missions, onChange, disabled, cc }) {
  const total = calcJuniorMissionScore(missions)
  const set = (key, val) => !disabled && onChange({ ...missions, [key]: val })

  const MIC_OPTS = [
    { value: 20, label: 'Completamente dentro y vertical' },
    { value: 10, label: 'Parcialmente o no vertical' },
    { value: 0,  label: 'Fuera del área' },
  ]
  const CABLE_OPTS = [
    { value: 15, label: 'Completo y vertical' },
    { value: 5,  label: 'Parcial o no vertical' },
    { value: 0,  label: 'Fuera' },
  ]
  const BOCINA_OPTS = [
    { value: 20, label: 'Completo y vertical' },
    { value: 5,  label: 'Parcial o no vertical' },
    { value: 0,  label: 'Fuera' },
  ]
  const NOTA_OPTS = [
    { value: 10, label: 'Completamente dentro' },
    { value: 5,  label: 'Parcialmente dentro' },
    { value: 0,  label: 'Fuera' },
  ]
  const CLAVE_OPTS = [
    { value: 15, label: 'Completamente dentro' },
    { value: 5,  label: 'Parcialmente dentro' },
    { value: 0,  label: 'Fuera' },
  ]

  return (
    <div className="space-y-3">
      {/* Barra total */}
      <div className={`card ${cc.bg} ${cc.border}`}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Puntaje misión</p>
          <span className={`font-mono font-bold text-xl ${cc.text}`}>
            {total} <span className="text-sm text-gray-500 font-normal">/ {JUNIOR_MISSION_MAX}</span>
          </span>
        </div>
        <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
          <motion.div className={`h-full ${cc.bar} rounded-full`}
            style={{ width: `${(total / JUNIOR_MISSION_MAX) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      {/* 4.1 Micrófono */}
      <div className={`card ${cc.bg} ${cc.border} space-y-2`}>
        <p className={`text-xs font-bold uppercase tracking-wide ${cc.text}`}>4.1 Prepara el espectáculo</p>
        <ChoiceField
          label="Micrófono"
          hint="Zona verde claro del escenario — máx 20 pts"
          options={MIC_OPTS} value={missions.microfono}
          onChange={v => set('microfono', v)} disabled={disabled} cc={cc} />
      </div>

      {/* 4.1 Instrumentos */}
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Instrumentos (×3)</p>
          <span className={`font-mono text-sm font-bold ${cc.text}`}>
            {(missions.instrumento1||0)+(missions.instrumento2||0)+(missions.instrumento3||0)} / 45 pts
          </span>
        </div>
        <p className="text-xs text-gray-500">Zona detrás del escenario (área rosa) — 15 pts c/u si completamente dentro</p>
        {[['instrumento1','Guitarra'],['instrumento2','Teclado'],['instrumento3','Conga']].map(([key, label]) => (
          <div key={key} className="flex items-center gap-3">
            <p className="text-xs text-gray-400 flex-1">{label}</p>
            <div className="flex gap-2">
              {[15, 0].map(v => (
                <button key={v} type="button" disabled={disabled}
                  onClick={() => set(key, v)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 ${
                    missions[key] === v
                      ? `${cc.bg} ${cc.border} ${cc.text}`
                      : 'border-dark-500 text-gray-500 hover:text-gray-300'
                  }`}>
                  {v === 15 ? '✓ 15 pts' : '✗ 0 pts'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 4.2 Cables */}
      <div className={`card ${cc.bg} ${cc.border} space-y-2`}>
        <p className={`text-xs font-bold uppercase tracking-wide ${cc.text}`}>4.2 Conecta el amplificador</p>
        {[['cable1','Cable 1 (zona superior)'],['cable2','Cable 2 (zona inferior)']].map(([key, label]) => (
          <ChoiceField key={key} label={label} hint="Zona gris — máx 15 pts"
            options={CABLE_OPTS} value={missions[key]}
            onChange={v => set(key, v)} disabled={disabled} cc={cc} />
        ))}
      </div>

      {/* 4.3 Bocinas */}
      <div className={`card ${cc.bg} ${cc.border} space-y-2`}>
        <p className={`text-xs font-bold uppercase tracking-wide ${cc.text}`}>4.3 Bocinas al escenario</p>
        {[['bocina1','Bocina 1'],['bocina2','Bocina 2']].map(([key, label]) => (
          <ChoiceField key={key} label={label} hint="Zona café del escenario — máx 20 pts"
            options={BOCINA_OPTS} value={missions[key]}
            onChange={v => set(key, v)} disabled={disabled} cc={cc} />
        ))}
      </div>

      {/* 4.4 Notas musicales */}
      <div className={`card ${cc.bg} ${cc.border} space-y-2`}>
        <p className={`text-xs font-bold uppercase tracking-wide ${cc.text}`}>4.4 Notas musicales</p>
        <ChoiceField label="Nota verde" hint="Zona de patrocinadores — posición libre"
          options={NOTA_OPTS} value={missions.nota_verde}
          onChange={v => set('nota_verde', v)} disabled={disabled} cc={cc} />
        <ChoiceField label="Nota roja" hint='Zona de logo "The Robots Meet Culture" — posición libre'
          options={NOTA_OPTS} value={missions.nota_roja}
          onChange={v => set('nota_roja', v)} disabled={disabled} cc={cc} />
      </div>

      {/* 4.5 Clave */}
      <div className={`card ${cc.bg} ${cc.border}`}>
        <p className={`text-xs font-bold uppercase tracking-wide ${cc.text} mb-2`}>4.5 Clave → Zona de descanso</p>
        <ChoiceField label="Clave (azul)" hint="Zona café de descanso — máx 15 pts"
          options={CLAVE_OPTS} value={missions.clave}
          onChange={v => set('clave', v)} disabled={disabled} cc={cc} />
      </div>
    </div>
  )
}

// ── Elementary: entrada numérica libre ───────────────────────────────────────
function ElementaryMission({ round, missionScore, onChange, disabled, cc }) {
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
      <p className="text-xs text-gray-600 mt-3">Ingresa los puntos que el equipo obtuvo en el tapete durante la ronda.</p>
    </div>
  )
}

// ── ScoreSheet principal ──────────────────────────────────────────────────────
export default function RSScoreSheet({ team, category, round, onClose, onSaved }) {
  const { user, profile } = useAuth()
  const cc = CC[category] || CC.elementary
  const isJunior = category === 'junior'

  const [missionScore, setMissionScore]     = useState(0)
  const [juniorMissions, setJuniorMissions] = useState({ ...JUNIOR_MISSION_DEFAULTS })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [finalized, setFinalized] = useState(false)
  const [savedOnce, setSavedOnce] = useState(false)
  const [toast, setToast]       = useState(null)

  const scoreId = `${team.id}_r${round}`

  useEffect(() => {
    getDoc(doc(db, 'rs_scores', scoreId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        if (isJunior && d.missionBreakdown) {
          setJuniorMissions({ ...JUNIOR_MISSION_DEFAULTS, ...d.missionBreakdown })
        } else {
          setMissionScore(d.missionScore ?? 0)
        }
        setFinalized(d.finalized || false)
        setSavedOnce(true)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [scoreId])

  const total = isJunior ? calcJuniorMissionScore(juniorMissions) : missionScore
  const mMax  = isJunior ? JUNIOR_MISSION_MAX : MISSION_MAX

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const buildPayload = (fin) => ({
    teamId: team.id, teamName: team.name, category, round,
    judgeUid: user.uid, judgeName: profile?.name || user.email,
    missionScore: total,
    ...(isJunior ? { missionBreakdown: juniorMissions } : {}),
    total,
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
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Total ronda {round}</p>
        <p className={`font-mono font-extrabold text-3xl ${cc.text}`}>
          {total} <span className="text-sm text-gray-500 font-normal">/ {mMax} pts</span>
        </p>
      </div>

      {/* Misiones */}
      {isJunior
        ? <JuniorMissions missions={juniorMissions} onChange={setJuniorMissions} disabled={finalized} cc={cc} />
        : <ElementaryMission round={round} missionScore={missionScore}
            onChange={setMissionScore} disabled={finalized} cc={cc} />
      }

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
