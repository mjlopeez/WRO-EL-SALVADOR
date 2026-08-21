import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, ChevronRight, LogOut, BookOpen, Users, ExternalLink,
  CheckCircle2, Play, Pause, RotateCcw, Flag, Save, Star,
} from 'lucide-react'
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import {
  RESOURCES, RUBRIC, SCORE_OPTIONS,
  MAX_ABIERTO, MAX_OBSTACULOS, MAX_DIARIO, MAX_SCORE,
  computeAbiertoTotal, computeObstaculosTotal, computeDiarioTotal, computeGrandTotal,
} from './config'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = s =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const DURATION = 180

const LABELS = { 6: 'Excelente', 4: 'Suficiente', 2: 'Básico', 0: 'Ausente' }
const LEVEL_COLORS  = { 6: 'text-green-400', 4: 'text-blue-400',  2: 'text-yellow-400',  0: 'text-red-400' }
const SCORE_STYLES  = {
  6: 'bg-green-500/10 border-green-500/40 text-green-400',
  4: 'bg-blue-500/10  border-blue-500/40  text-blue-400',
  2: 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400',
  0: 'bg-red-500/10   border-red-500/40   text-red-400',
}

// ─── Mini Chrono ──────────────────────────────────────────────────────────────
function MiniChrono({ savedTime, onElapsed, disabled }) {
  const [status,    setStatus]    = useState('idle')
  const [remaining, setRemaining] = useState(DURATION)
  const intervalRef = useRef(null)

  // Todos los hooks ANTES de cualquier return condicional (Rules of Hooks)
  useEffect(() => {
    if (savedTime != null) return        // tiempo ya fijo, no correr timer
    if (status === 'running') {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setStatus('finished')
            onElapsed?.(DURATION)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [status, savedTime])

  // Si ya hay tiempo guardado → display fijo
  if (savedTime != null) {
    return (
      <div className="bg-dark-700 rounded-xl px-3 py-2.5 mb-3 flex items-center gap-3">
        <span className="text-xs text-gray-600 font-semibold uppercase tracking-wider shrink-0">Tiempo</span>
        <span className="font-mono font-bold text-xl flex-1 text-center text-green-400 tracking-widest">
          ✓ {fmtTime(savedTime)}
        </span>
        {!disabled && (
          <button onClick={() => onElapsed?.(null)}
            title="Reiniciar tiempo"
            className="px-2 py-1 rounded-lg border border-dark-500 text-gray-600 hover:text-red-400 hover:border-red-500/30 transition-colors">
            <RotateCcw size={10} />
          </button>
        )}
      </div>
    )
  }

  const elapsed   = DURATION - remaining
  const isDanger  = remaining <= 10 && status === 'running'
  const isWarning = remaining <= 30 && remaining > 10 && status === 'running'
  const displayColor = isDanger ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-white'

  const stop = () => {
    clearInterval(intervalRef.current)
    setStatus('finished')
    onElapsed?.(elapsed || 1)
  }
  const reset = () => {
    setStatus('idle')
    setRemaining(DURATION)
    onElapsed?.(null)
  }

  return (
    <div className={`bg-dark-700 rounded-xl px-3 py-2.5 mb-3 flex items-center gap-3 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <span className="text-xs text-gray-600 font-semibold uppercase tracking-wider shrink-0">Tiempo</span>
      <span className={`font-mono font-bold text-xl flex-1 text-center tracking-widest ${displayColor}`}>
        {fmtTime(remaining)}
      </span>
      <div className="flex gap-1.5 shrink-0">
        {status === 'idle' && (
          <button onClick={() => setStatus('running')}
            className="px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 text-xs font-bold flex items-center gap-1">
            <Play size={10} /> Iniciar
          </button>
        )}
        {status === 'running' && (<>
          <button onClick={() => setStatus('paused')}
            className="px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold flex items-center gap-1">
            <Pause size={10} /> Pausar
          </button>
          <button onClick={stop}
            className="px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold flex items-center gap-1">
            <Flag size={10} /> Stop
          </button>
        </>)}
        {status === 'paused' && (<>
          <button onClick={() => setStatus('running')}
            className="px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-bold flex items-center gap-1">
            <Play size={10} /> Continuar
          </button>
          <button onClick={stop}
            className="px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold flex items-center gap-1">
            <Flag size={10} /> Stop
          </button>
        </>)}
        {status !== 'idle' && (
          <button onClick={reset}
            className="px-2 py-1 rounded-lg border border-dark-500 text-gray-600 hover:text-red-400 hover:border-red-500/30 transition-colors">
            <RotateCcw size={10} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ value, min, max, onChange, label, sublabel, disabled }) {
  return (
    <div className={`flex items-center gap-3 py-0.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="flex-1">
        <p className="text-sm text-gray-300">{label}</p>
        {sublabel && <p className="text-xs text-gray-600">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min || disabled}
          className="w-8 h-8 rounded-lg bg-dark-600 border border-dark-500 text-white font-bold text-lg disabled:opacity-30 flex items-center justify-center hover:border-gray-400 transition-colors">
          −
        </button>
        <span className="font-mono font-bold text-white text-lg w-10 text-center">{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max || disabled}
          className="w-8 h-8 rounded-lg bg-dark-600 border border-dark-500 text-white font-bold text-lg disabled:opacity-30 flex items-center justify-center hover:border-gray-400 transition-colors">
          +
        </button>
      </div>
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label, sublabel, disabled, warn }) {
  return (
    <div className={`flex items-center gap-3 py-0.5 ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex-1">
        <p className="text-sm text-gray-300">{label}</p>
        {sublabel && <p className="text-xs text-gray-600">{sublabel}</p>}
      </div>
      <button disabled={disabled} onClick={() => !disabled && onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
          value ? (warn ? 'bg-orange-500' : 'bg-teal-500') : 'bg-dark-500'
        }`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${value ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
      </button>
    </div>
  )
}

// ─── Reto Abierto — round card ────────────────────────────────────────────────
function AbiertoCard({ num, data = {}, onChange, disabled }) {
  const total   = computeAbiertoTotal(data)
  const rawPts  = computeAbiertoTotal({ ...data, repairAction: false })
  const laps    = data.laps ?? 0

  return (
    <div className={`card mb-3 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Ronda {num}</span>
        <div className="flex-1 h-px bg-dark-600" />
        <span className="font-mono font-extrabold text-xl text-teal-400">
          {total}<span className="text-xs text-gray-600 font-normal ml-0.5">/{MAX_ABIERTO}</span>
        </span>
      </div>

      <MiniChrono
        savedTime={data.time ?? null}
        disabled={disabled}
        onElapsed={t => !disabled && onChange({ ...data, time: t ?? undefined })}
      />

      <div className={`space-y-3 ${disabled ? 'pointer-events-none' : ''}`}>
        <Stepper
          label="Secciones completadas (sentido correcto)"
          sublabel="1 pto por sección · máx 24"
          value={data.sections ?? 0} min={0} max={24}
          disabled={disabled}
          onChange={v => onChange({ ...data, sections: v })}
        />
        <Stepper
          label="Vueltas completadas"
          sublabel="1 pto por vuelta · máx 3"
          value={laps} min={0} max={3}
          disabled={disabled}
          onChange={v => onChange({ ...data, laps: v, stopAtFinish: v < 3 ? false : data.stopAtFinish })}
        />
        <div className="h-px bg-dark-600" />
        <Toggle
          label="Paró en sección de llegada al completar 3 vueltas"
          sublabel="+3 pts · requiere 3 vueltas"
          value={data.stopAtFinish ?? false}
          disabled={laps < 3 || disabled}
          onChange={v => onChange({ ...data, stopAtFinish: v })}
        />
        <div className="h-px bg-dark-600" />
        <Toggle
          label="Acción de reparación"
          sublabel="Divide el puntaje de la ronda entre 2"
          value={data.repairAction ?? false}
          disabled={disabled}
          warn
          onChange={v => onChange({ ...data, repairAction: v })}
        />
      </div>

      {data.repairAction && rawPts > 0 && (
        <div className="mt-3 p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-400 text-center">
          ⚠ Reparación: {rawPts} → {total} pts
        </div>
      )}
    </div>
  )
}

// ─── Reto Obstáculos — round card ─────────────────────────────────────────────
function ObstaculosCard({ num, data = {}, onChange, disabled }) {
  const total  = computeObstaculosTotal(data)
  const rawPts = computeObstaculosTotal({ ...data, repairAction: false })
  const laps   = data.laps ?? 0

  const signsLabel = laps < 1 ? 'Requiere ≥1 vuelta'
    : data.trafficSignsMoved
    ? (laps >= 3 ? '+8 pts' : '+2 pts')
    : (laps >= 3 ? '+10 pts' : '+4 pts')

  return (
    <div className={`card mb-3 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Ronda {num}</span>
        <div className="flex-1 h-px bg-dark-600" />
        <span className="font-mono font-extrabold text-xl text-teal-400">
          {total}<span className="text-xs text-gray-600 font-normal ml-0.5">/{MAX_OBSTACULOS}</span>
        </span>
      </div>

      <MiniChrono
        savedTime={data.time ?? null}
        disabled={disabled}
        onElapsed={t => !disabled && onChange({ ...data, time: t ?? undefined })}
      />

      <div className={`space-y-3 ${disabled ? 'pointer-events-none' : ''}`}>
        <Stepper
          label="Secciones completadas"
          sublabel="1 pto por sección · máx 24"
          value={data.sections ?? 0} min={0} max={24}
          disabled={disabled}
          onChange={v => onChange({ ...data, sections: v })}
        />
        <Stepper
          label="Vueltas completadas"
          sublabel="1 pto por vuelta · máx 3"
          value={laps} min={0} max={3}
          disabled={disabled}
          onChange={v => onChange({
            ...data, laps: v,
            stopAtFinish:       v < 3 ? false : data.stopAtFinish,
            trafficSignsMoved:  v < 1 ? undefined : data.trafficSignsMoved,
            startedFromParking: v < 1 ? false : data.startedFromParking,
          })}
        />
        <Toggle
          label="Paró en sección de llegada al completar 3 vueltas"
          sublabel="+3 pts · requiere 3 vueltas"
          value={data.stopAtFinish ?? false}
          disabled={laps < 3 || disabled}
          onChange={v => onChange({ ...data, stopAtFinish: v })}
        />

        <div className="h-px bg-dark-600" />
        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 pt-1">Señales de tránsito</p>
        <Toggle
          label="Se movió alguna señal"
          sublabel={signsLabel}
          value={data.trafficSignsMoved ?? false}
          disabled={laps < 1 || disabled}
          onChange={v => onChange({ ...data, trafficSignsMoved: v })}
        />

        <div className="h-px bg-dark-600" />
        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 pt-1">Estacionamiento paralelo</p>
        <Toggle
          label="Inició desde cajón de estacionamiento"
          sublabel="+7 pts · requiere ≥1 vuelta"
          value={data.startedFromParking ?? false}
          disabled={laps < 1 || disabled}
          onChange={v => onChange({ ...data, startedFromParking: v })}
        />

        <div>
          <p className="text-sm text-gray-300 mb-2">Resultado del estacionamiento</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'none',    label: 'Sin estac.', pts: 0  },
              { val: 'partial', label: 'Parcial',     pts: 7  },
              { val: 'full',    label: 'Exitoso',     pts: 15 },
            ].map(opt => (
              <button key={opt.val}
                onClick={() => !disabled && onChange({ ...data, parkingResult: opt.val })}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  (data.parkingResult ?? 'none') === opt.val
                    ? 'bg-teal-500/20 border-teal-500/50 text-teal-400'
                    : 'border-dark-500 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                }`}>
                {opt.label}
                <span className="block font-mono text-[10px] opacity-60 mt-0.5">+{opt.pts}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-dark-600" />
        <Toggle
          label="Acción de reparación"
          sublabel="Divide el puntaje de la ronda entre 2"
          value={data.repairAction ?? false}
          disabled={disabled}
          warn
          onChange={v => onChange({ ...data, repairAction: v })}
        />
      </div>

      {data.repairAction && rawPts > 0 && (
        <div className="mt-3 p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-400 text-center">
          ⚠ Reparación: {rawPts} → {total} pts
        </div>
      )}
    </div>
  )
}

// ─── Diario de Ingeniería tab ─────────────────────────────────────────────────
function DiarioTab({ scores, onChange, disabled }) {
  const total = computeDiarioTotal(scores)
  return (
    <div className={`space-y-3 ${disabled ? 'pointer-events-none' : ''}`}>
      <div className="card bg-purple-500/10 border-purple-500/30 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-300">Diario de Ingeniería</span>
        <span className="font-mono font-extrabold text-2xl text-purple-400">
          {total}<span className="text-xs text-gray-500 font-normal ml-1">/{MAX_DIARIO}</span>
        </span>
      </div>

      {RUBRIC.map(c => {
        const val = scores[c.id]
        return (
          <div key={c.id} className={`card ${disabled ? 'opacity-60' : ''}`}>
            <div className="mb-2.5">
              <p className="font-semibold text-white text-sm">{c.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {SCORE_OPTIONS.map(opt => {
                const selected = val === opt
                return (
                  <button key={opt} onClick={() => !disabled && onChange({ ...scores, [c.id]: opt })}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      selected ? SCORE_STYLES[opt] : 'border-dark-500 text-gray-600 hover:text-gray-400 hover:border-gray-500'
                    }`}>
                    {opt}
                    <span className="block font-normal opacity-70 mt-0.5">{LABELS[opt]}</span>
                  </button>
                )
              })}
            </div>
            {val !== undefined && (
              <p className={`text-xs mt-2 leading-snug ${LEVEL_COLORS[val]}`}>{c.levels?.[val]}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Score summary ────────────────────────────────────────────────────────────
function ScoreSummary({ data }) {
  const a1 = computeAbiertoTotal(data.abierto?.r1)
  const a2 = computeAbiertoTotal(data.abierto?.r2)
  const o1 = computeObstaculosTotal(data.obstaculos?.r1)
  const o2 = computeObstaculosTotal(data.obstaculos?.r2)
  const d  = computeDiarioTotal(data.diario?.scores ?? {})
  const bestA = Math.max(a1, a2)
  const bestO = Math.max(o1, o2)
  const grand = bestA + bestO + d
  const pct   = Math.round((grand / MAX_SCORE) * 100)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="card bg-teal-500/10 border-teal-500/30">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total</p>
            <p className="font-mono font-extrabold text-4xl text-teal-400">
              {grand}<span className="text-sm text-gray-500 font-normal ml-1">/ {MAX_SCORE}</span>
            </p>
          </div>
          <p className="font-bold text-2xl text-teal-400 opacity-70">{pct}%</p>
        </div>
        <div className="h-2.5 bg-dark-600 rounded-full overflow-hidden">
          <motion.div className="h-full bg-teal-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
        </div>
      </div>

      {/* Reto Abierto */}
      <div className="card">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Reto Abierto (máx {MAX_ABIERTO})</p>
        <div className="space-y-2">
          {[['Ronda 1', a1], ['Ronda 2', a2]].map(([label, score]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm text-gray-400 flex-1">{label}</span>
              <span className="font-mono font-bold text-white">{score}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-dark-600 flex justify-between items-center">
          <span className="text-xs text-gray-500">⭐ Mejor ronda</span>
          <span className="font-mono font-bold text-teal-400 text-lg">{bestA}</span>
        </div>
      </div>

      {/* Reto Obstáculos */}
      <div className="card">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Reto Obstáculos (máx {MAX_OBSTACULOS})</p>
        <div className="space-y-2">
          {[['Ronda 1', o1], ['Ronda 2', o2]].map(([label, score]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm text-gray-400 flex-1">{label}</span>
              <span className="font-mono font-bold text-white">{score}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-dark-600 flex justify-between items-center">
          <span className="text-xs text-gray-500">⭐ Mejor ronda</span>
          <span className="font-mono font-bold text-teal-400 text-lg">{bestO}</span>
        </div>
      </div>

      {/* Diario */}
      <div className="card">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-300">Diario de Ingeniería</p>
          <span className="font-mono font-bold text-purple-400 text-lg">{d}<span className="text-xs text-gray-600 font-normal">/{MAX_DIARIO}</span></span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Resources tab ────────────────────────────────────────────────────────────
function ResourcesTab() {
  return (
    <div className="space-y-3">
      <div className="card bg-teal-500/10 border-teal-500/30">
        <p className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-3">Puntuación máxima: 122 pts</p>
        {[
          ['Reto Abierto (mejor ronda)', `0–${MAX_ABIERTO}`],
          ['Reto Obstáculos (mejor ronda)', `0–${MAX_OBSTACULOS}`],
          ['Diario de Ingeniería', `0–${MAX_DIARIO}`],
        ].map(([label, range]) => (
          <div key={label} className="flex justify-between items-center py-1.5 border-b border-dark-600 last:border-0">
            <span className="text-sm text-gray-300">{label}</span>
            <span className="font-mono font-bold text-sm text-teal-400">{range}</span>
          </div>
        ))}
      </div>
      <div className="card bg-amber-500/5 border-amber-500/20">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">Escala Diario</p>
        <div className="space-y-1.5">
          {SCORE_OPTIONS.map(pts => (
            <div key={pts} className="flex items-center gap-2 text-xs">
              <span className={`font-mono font-bold w-4 ${LEVEL_COLORS[pts]}`}>{pts}</span>
              <span className={LEVEL_COLORS[pts]}>{LABELS[pts]}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider px-1">Documentos oficiales</p>
      {RESOURCES.map(r => (
        <motion.a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
          whileTap={{ scale: 0.98 }} className="card-hover flex items-start gap-3 no-underline">
          <span className="text-2xl shrink-0 mt-0.5">{r.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm">{r.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
          </div>
          <ExternalLink size={14} className="text-gray-600 shrink-0 mt-1" />
        </motion.a>
      ))}
    </div>
  )
}

// ─── Team info card ───────────────────────────────────────────────────────────
function TeamInfoCard({ team }) {
  return (
    <div className="card bg-dark-700 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center font-bold text-teal-400 shrink-0 text-sm">
          {team.number || team.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white truncate">{team.name}</p>
          {team.number && <p className="text-xs text-gray-500">Equipo #{team.number}</p>}
          {team.school && <p className="text-xs text-gray-500 truncate">{team.school}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {[team.member1, team.member2, team.member3].filter(Boolean).map((m, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-dark-600 border border-dark-500 text-gray-300">{m}</span>
            ))}
            {team.coach && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400">{team.coach}</span>
            )}
          </div>
        </div>
        {team.githubUrl && (
          <a href={team.githubUrl} target="_blank" rel="noopener noreferrer"
            className="text-gray-500 hover:text-teal-400 transition-colors shrink-0">
            <ExternalLink size={15} />
          </a>
        )}
      </div>
    </div>
  )
}

// ─── TeamScoring ──────────────────────────────────────────────────────────────
const SECTION_TABS = [
  { id: 'abierto',    label: '🟢 Abierto'    },
  { id: 'obstaculos', label: '🔴 Obstáculos'  },
  { id: 'diario',     label: '📋 Diario'      },
  { id: 'resources',  label: 'Recursos'       },
]

function TeamScoring({ team, onClose }) {
  const { user } = useAuth()
  const scoreDocId = `${team.id}_${user.uid}`

  // Data state — mirrors fe_scores document structure
  const [abierto,    setAbierto]    = useState({ r1: {}, r2: {} })
  const [obstaculos, setObstaculos] = useState({ r1: {}, r2: {} })
  const [diario,     setDiario]     = useState({ scores: {} })

  const [tab,        setTab]        = useState('abierto')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [hasData,    setHasData]    = useState(false)
  const [finalized,  setFinalized]  = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Load saved data
  useEffect(() => {
    getDoc(doc(db, 'fe_scores', scoreDocId)).then(snap => {
      if (!snap.exists()) return
      const d = snap.data()
      if (d.abierto)    setAbierto(d.abierto)
      if (d.obstaculos) setObstaculos(d.obstaculos)
      if (d.diario)     setDiario(d.diario)
      if (d.finalized)  setFinalized(true)
      setHasData(true)
    })
  }, [scoreDocId])

  const buildPayload = (fin = false) => {
    const data = { teamId: team.id, abierto, obstaculos, diario, judgeUid: user.uid, finalized: fin, updatedAt: serverTimestamp() }
    data.grandTotal = computeGrandTotal(data)
    return data
  }

  const handleSave = async () => {
    setSaving(true)
    await setDoc(doc(db, 'fe_scores', scoreDocId), buildPayload(false), { merge: true })
    setSaving(false)
    setSaved(true)
    setHasData(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleSubmit = async () => {
    setShowConfirm(false)
    setSaving(true)
    await setDoc(doc(db, 'fe_scores', scoreDocId), buildPayload(true), { merge: true })
    setSaving(false)
    setFinalized(true)
    setHasData(true)
  }

  const grandTotal = computeGrandTotal({ abierto, obstaculos, diario })

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {showConfirm && (
        <ConfirmDialog onConfirm={handleSubmit} onCancel={() => setShowConfirm(false)} />
      )}

      <div className="flex items-center gap-3 mb-4 mt-4">
        <button onClick={onClose} className="btn-ghost p-2 py-1.5 text-sm">← Equipos</button>
        <div className="flex-1" />
        {finalized ? (
          <span className="text-xs font-bold text-green-400 flex items-center gap-1">
            <CheckCircle2 size={13} /> Evaluación enviada
          </span>
        ) : (
          <div className="text-right">
            <p className="text-xs text-gray-500">Total parcial</p>
            <p className="font-mono font-bold text-teal-400">{grandTotal}/{MAX_SCORE}</p>
          </div>
        )}
      </div>

      {finalized && (
        <div className="card bg-green-500/10 border-green-500/30 mb-4 flex items-center gap-3 py-3">
          <CheckCircle2 size={20} className="text-green-400 shrink-0" />
          <div>
            <p className="font-bold text-green-400 text-sm">Evaluación enviada</p>
            <p className="text-xs text-gray-500">No se pueden hacer más cambios.</p>
          </div>
        </div>
      )}

      <TeamInfoCard team={team} />

      {/* Section tabs */}
      <div className="grid grid-cols-4 gap-1 mb-5 bg-dark-700 p-1 rounded-xl">
        {SECTION_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-2 rounded-lg text-[11px] font-bold transition-all ${
              tab === t.id ? 'bg-dark-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Reto Abierto ── */}
        {tab === 'abierto' && (
          <motion.div key="abierto" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
            <div className="card bg-green-500/5 border-green-500/20 mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-green-400 mb-1">Reto Abierto · máx {MAX_ABIERTO} pts/ronda</p>
              <p className="text-xs text-gray-500">Cuenta la mejor de las 2 rondas (§10.7).</p>
              <div className="flex gap-4 mt-2">
                {[['R1', computeAbiertoTotal(abierto.r1)], ['R2', computeAbiertoTotal(abierto.r2)]].map(([lbl, score]) => (
                  <div key={lbl} className="text-center">
                    <p className="text-xs text-gray-600">{lbl}</p>
                    <p className="font-mono font-bold text-green-400">{score}</p>
                  </div>
                ))}
                <div className="text-center">
                  <p className="text-xs text-gray-600">⭐ Mejor</p>
                  <p className="font-mono font-bold text-teal-400">{Math.max(computeAbiertoTotal(abierto.r1), computeAbiertoTotal(abierto.r2))}</p>
                </div>
              </div>
            </div>

            <AbiertoCard num={1} data={abierto.r1} disabled={finalized} onChange={r1 => setAbierto(prev => ({ ...prev, r1 }))} />
            <AbiertoCard num={2} data={abierto.r2} disabled={finalized} onChange={r2 => setAbierto(prev => ({ ...prev, r2 }))} />

            <SaveSubmitButtons saving={saving} saved={saved} finalized={finalized} onSave={handleSave} onSubmit={() => setShowConfirm(true)} />
          </motion.div>
        )}

        {/* ── Reto Obstáculos ── */}
        {tab === 'obstaculos' && (
          <motion.div key="obstaculos" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
            <div className="card bg-red-500/5 border-red-500/20 mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">Reto Obstáculos · máx {MAX_OBSTACULOS} pts/ronda</p>
              <p className="text-xs text-gray-500">Cuenta la mejor ronda; empate se rompe por tiempo (§10.7).</p>
              <div className="flex gap-4 mt-2">
                {[['R1', computeObstaculosTotal(obstaculos.r1)], ['R2', computeObstaculosTotal(obstaculos.r2)]].map(([lbl, score]) => (
                  <div key={lbl} className="text-center">
                    <p className="text-xs text-gray-600">{lbl}</p>
                    <p className="font-mono font-bold text-red-400">{score}</p>
                  </div>
                ))}
                <div className="text-center">
                  <p className="text-xs text-gray-600">⭐ Mejor</p>
                  <p className="font-mono font-bold text-teal-400">{Math.max(computeObstaculosTotal(obstaculos.r1), computeObstaculosTotal(obstaculos.r2))}</p>
                </div>
              </div>
            </div>

            <ObstaculosCard num={1} data={obstaculos.r1} disabled={finalized} onChange={r1 => setObstaculos(prev => ({ ...prev, r1 }))} />
            <ObstaculosCard num={2} data={obstaculos.r2} disabled={finalized} onChange={r2 => setObstaculos(prev => ({ ...prev, r2 }))} />

            <SaveSubmitButtons saving={saving} saved={saved} finalized={finalized} onSave={handleSave} onSubmit={() => setShowConfirm(true)} />
          </motion.div>
        )}

        {/* ── Diario ── */}
        {tab === 'diario' && (
          <motion.div key="diario" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
            <DiarioTab
              scores={diario.scores ?? {}}
              disabled={finalized}
              onChange={scores => setDiario({ scores })}
            />
            <div className="mt-4">
              <SaveSubmitButtons saving={saving} saved={saved} finalized={finalized} onSave={handleSave} onSubmit={() => setShowConfirm(true)} />
            </div>
          </motion.div>
        )}

        {/* ── Recursos ── */}
        {tab === 'resources' && (
          <motion.div key="resources" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            {hasData && <ScoreSummary data={{ abierto, obstaculos, diario }} />}
            <div className={hasData ? 'mt-4' : ''}>
              <ResourcesTab />
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="card max-w-sm w-full border-yellow-500/40 bg-dark-800">
        <div className="text-center mb-4">
          <span className="text-4xl">⚠️</span>
          <p className="font-bold text-white text-lg mt-2">¿Enviar evaluación?</p>
          <p className="text-sm text-gray-400 mt-1">
            Esta acción es <span className="text-yellow-400 font-semibold">permanente</span>.
            Una vez enviada no podrás hacer cambios.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm border border-dark-500 text-gray-400 hover:text-white hover:border-gray-500 transition-all">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 transition-all">
            Sí, enviar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function SaveSubmitButtons({ saving, saved, finalized, onSave, onSubmit }) {
  if (finalized) return null
  return (
    <div className="flex gap-2 mt-2">
      <button onClick={onSave} disabled={saving}
        className="flex-1 py-3 rounded-xl font-bold border border-dark-500 text-gray-300 text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:border-gray-400 hover:text-white transition-all">
        {saving
          ? <span className="w-4 h-4 border-2 border-gray-500/30 border-t-gray-400 rounded-full animate-spin" />
          : saved
          ? <><CheckCircle2 size={14} className="text-green-400" /> Guardado</>
          : <><Save size={14} /> Guardar</>
        }
      </button>
      <button onClick={onSubmit} disabled={saving}
        className="flex-1 py-3 rounded-xl font-bold border border-green-500/40 bg-green-500/10 text-green-400 text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-green-500/20 transition-all">
        <CheckCircle2 size={14} /> Enviar
      </button>
    </div>
  )
}

// ─── Main list view ───────────────────────────────────────────────────────────
export default function FEJudgeView() {
  const { profile, logout } = useAuth()
  const [teams,    setTeams]    = useState([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('teams')

  useEffect(() => {
    const q = query(collection(db, 'fe_teams'), orderBy('name'))
    return onSnapshot(q, snap => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
  }, [])

  const myTeams  = teams.filter(t => t.assignedJudgeUid === profile?.uid)
  const filtered = myTeams.filter(t =>
    !search ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.number?.toLowerCase().includes(search.toLowerCase()) ||
    t.school?.toLowerCase().includes(search.toLowerCase())
  )

  if (selected) return <TeamScoring team={selected} onClose={() => setSelected(null)} />

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
            <span className="text-xl">⚙️</span>
          </div>
          <div>
            <p className="font-extrabold text-white text-lg leading-tight">Future Engineers</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-teal-500/10 border-teal-500/30 text-teal-400">
              14–22 años · Self-Driving Cars
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500 hidden sm:block">{profile?.name}</p>
          <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors p-2">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 bg-dark-700 p-1 rounded-xl">
        <button onClick={() => setActiveTab('teams')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'teams' ? 'bg-dark-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'
          }`}>
          <Users size={15} /> Equipos
        </button>
        <button onClick={() => setActiveTab('resources')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'resources' ? 'bg-dark-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'
          }`}>
          <BookOpen size={15} /> Recursos
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'teams' && (
          <motion.div key="teams" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input className="input-field pl-9 py-2.5 text-sm" placeholder="Buscar equipo..."
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-3 border-dark-500 border-t-teal-500 rounded-full animate-spin" />
              </div>
            ) : myTeams.length === 0 ? (
              <div className="card text-center py-16">
                <Users size={40} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No tienes equipos asignados aún.</p>
                <p className="text-gray-500 text-xs mt-1">El administrador te asignará equipos.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="card text-center py-10">
                <p className="text-gray-400 text-sm">Sin resultados.</p>
                <button onClick={() => setSearch('')} className="btn-ghost mt-3 text-sm py-1.5 px-4">Limpiar</button>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((team, i) => (
                  <motion.button key={team.id}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setSelected(team)}
                    className="w-full card-hover text-left flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center font-bold shrink-0 text-teal-400 text-sm">
                      {team.number || team.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{team.name}</p>
                      {team.school && <p className="text-xs text-gray-500 truncate">{team.school}</p>}
                    </div>
                    <ChevronRight size={16} className="text-gray-600 shrink-0" />
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'resources' && (
          <motion.div key="resources" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <ResourcesTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
