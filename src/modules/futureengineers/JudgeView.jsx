import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, ChevronRight, LogOut, BookOpen, Users, ExternalLink,
  CheckCircle2, Play, Pause, RotateCcw, Flag, Save, Star, AlertTriangle,
} from 'lucide-react'
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { writeAuditLog } from '../../utils/auditLog'
import {
  RESOURCES, RUBRIC, SCORE_OPTIONS,
  MAX_ABIERTO, MAX_OBSTACULOS, MAX_DIARIO, MAX_SCORE,
  computeAbiertoTotal, computeObstaculosTotal, computeDiarioTotal, computeGrandTotal,
} from './config'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = s =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const DURATION = 180

// Equipos que no entregaron el Diario de Ingeniería a tiempo → puntaje bloqueado en 0
const DIARIO_DISABLED_TEAMS = ['compañe', 'autonova']

// Elimina recursivamente cualquier campo con valor undefined (Firestore lo rechaza)
function stripUndefined(obj) {
  // Date instances have no enumerable properties — must pass through as-is
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj) || obj instanceof Date) return obj
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefined(v)])
  )
}

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
          onChange={v => {
            const autoLaps = Math.min(3, Math.floor(v / 8))
            onChange({
              ...data,
              sections: v,
              laps: autoLaps,
              stopAtFinish: autoLaps < 3 ? false : data.stopAtFinish,
            })
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">Vueltas completadas</p>
            <p className="text-xs text-gray-500">1 pto por vuelta · calculado automático (cada 8 secciones)</p>
          </div>
          <span className="font-mono font-bold text-2xl text-teal-400 shrink-0">{laps}</span>
        </div>
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
          onChange={v => {
            const autoLaps = Math.min(3, Math.floor(v / 8))
            onChange({
              ...data,
              sections: v,
              laps: autoLaps,
              stopAtFinish:       autoLaps < 3 ? false : data.stopAtFinish,
              trafficSignsMoved:  autoLaps < 1 ? undefined : data.trafficSignsMoved,
              startedFromParking: autoLaps < 1 ? false : data.startedFromParking,
            })
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">Vueltas completadas</p>
            <p className="text-xs text-gray-500">1 pto por vuelta · calculado automático (cada 8 secciones)</p>
          </div>
          <span className="font-mono font-bold text-2xl text-teal-400 shrink-0">{laps}</span>
        </div>
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
  const d  = computeDiarioTotal(data.diario?.scores ?? {})
  const sumA  = a1 + a2   // ranking: suma de ambas rondas
  const grand = sumA + o1 + d
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
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Reto Abierto — suma R1+R2 (máx {MAX_ABIERTO * 2})</p>
        <div className="space-y-2">
          {[['Ronda 1', a1], ['Ronda 2', a2]].map(([label, score]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm text-gray-400 flex-1">{label}</span>
              <span className="font-mono font-bold text-white">{score}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-dark-600 flex justify-between items-center">
          <span className="text-xs text-gray-500">Σ Suma total</span>
          <span className="font-mono font-bold text-teal-400 text-lg">{sumA}</span>
        </div>
      </div>

      {/* Reto Obstáculos */}
      <div className="card">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-300">Reto Obstáculos (1 ronda, máx {MAX_OBSTACULOS})</p>
          <span className="font-mono font-bold text-teal-400 text-lg">{o1}</span>
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
        <p className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-3">Puntuación máxima: {MAX_SCORE} pts</p>
        {[
          [`Reto Abierto (R1+R2, máx ${MAX_ABIERTO * 2})`, `0–${MAX_ABIERTO * 2}`],
          [`Reto Obstáculos (1 ronda)`, `0–${MAX_OBSTACULOS}`],
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
  const { profile } = useAuth()
  const members = [team.member1, team.member2, team.member3].filter(Boolean)
  const tableComp = team.tableComp || profile?.tableComp || '—'
  return (
    <div className="card bg-dark-700 border border-teal-500/30 mb-4">
      {/* Top: correlativo + category badge */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">Correlativo</p>
          <p className="font-extrabold font-mono text-3xl leading-none text-teal-400">
            {team.correlativo || '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full border bg-teal-500/10 border-teal-500/30 text-teal-400">
            Future Engineers
          </span>
          {team.githubUrl && (
            <a href={team.githubUrl} target="_blank" rel="noopener noreferrer"
              className="text-gray-500 hover:text-teal-400 transition-colors">
              <ExternalLink size={15} />
            </a>
          )}
        </div>
      </div>

      {/* Team name */}
      <p className="font-extrabold text-white text-xl break-words mb-3 leading-tight">{team.name}</p>

      {/* Grid details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">Mesa construcción</p>
          <p className="text-white font-bold font-mono text-base">{team.number || '—'}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">Mesa competencia</p>
          <p className="font-bold font-mono text-base text-teal-400">{tableComp}</p>
        </div>
        {team.coach && (
          <div className="col-span-2">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">Coach</p>
            <p className="text-white font-medium break-words">{team.coach}</p>
          </div>
        )}
        {team.school && (
          <div className="col-span-2">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">Institución</p>
            <p className="text-gray-300 break-words">{team.school}</p>
          </div>
        )}
      </div>

      {/* Members */}
      {members.length > 0 && (
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1.5">Integrantes</p>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full border bg-teal-500/10 border-teal-500/30 text-teal-400 font-medium break-words">{m}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ label = 'evaluación', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="card max-w-sm w-full border-yellow-500/40 bg-dark-800">
        <div className="text-center mb-4">
          <span className="text-4xl">⚠️</span>
          <p className="font-bold text-white text-lg mt-2">¿Enviar {label}?</p>
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

// ─── Botones Guardar / Enviar por ronda ───────────────────────────────────────
function RoundButtons({ roundKey, isFinalized, saving, saved, onSave, onSubmit }) {
  if (isFinalized) {
    return (
      <div className="flex items-center justify-center gap-2 mb-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold">
        <CheckCircle2 size={14} /> Ronda enviada · no se pueden editar
      </div>
    )
  }
  const isSaving = saving === roundKey
  const isSaved  = saved  === roundKey
  return (
    <div className="flex gap-2 mb-4">
      <button onClick={onSave} disabled={isSaving}
        className="flex-1 py-2.5 rounded-xl font-bold border border-dark-500 text-gray-300 text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:border-gray-400 hover:text-white transition-all">
        {isSaving
          ? <span className="w-4 h-4 border-2 border-gray-500/30 border-t-gray-400 rounded-full animate-spin" />
          : isSaved
          ? <><CheckCircle2 size={14} className="text-green-400" /> Guardado</>
          : <><Save size={14} /> Guardar</>
        }
      </button>
      <button onClick={onSubmit} disabled={isSaving}
        className="flex-1 py-2.5 rounded-xl font-bold border border-green-500/40 bg-green-500/10 text-green-400 text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-green-500/20 transition-all">
        <CheckCircle2 size={14} /> Enviar ronda
      </button>
    </div>
  )
}

// ─── Zero-score warning dialog ────────────────────────────────────────────────
function ZeroScoreDialog({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="card max-w-sm w-full border-yellow-500/40 bg-dark-800">
        <div className="text-center mb-4">
          <AlertTriangle size={36} className="text-yellow-400 mx-auto mb-2" />
          <p className="font-bold text-white text-lg">Hay puntajes en cero</p>
          <p className="text-sm text-gray-400 mt-1">
            Uno o más puntajes están en <span className="text-yellow-400 font-semibold">0</span>.
            ¿Deseas corregirlos o aceptar y enviar de todas formas?
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm border border-dark-500 text-gray-300 hover:text-white hover:border-gray-400 transition-all">
            Corregir
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 transition-all">
            Aceptar y enviar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Dirty-state exit warning dialog ─────────────────────────────────────────
function DirtyExitDialog({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="card max-w-sm w-full border-orange-500/40 bg-dark-800">
        <div className="text-center mb-4">
          <AlertTriangle size={36} className="text-orange-400 mx-auto mb-2" />
          <p className="font-bold text-white text-lg">Calificación no enviada</p>
          <p className="text-sm text-gray-400 mt-1">
            Guardaste un borrador pero <span className="text-orange-400 font-semibold">no lo has enviado</span>.
            Si sales ahora, los datos quedarán como borrador sin finalizar.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm border border-dark-500 text-gray-300 hover:text-white hover:border-gray-400 transition-all">
            Seguir editando
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-orange-500/20 border border-orange-500/50 text-orange-400 hover:bg-orange-500/30 transition-all">
            Salir sin enviar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Zero-score helpers ───────────────────────────────────────────────────────
function hasZeroInAbierto(data = {}) { return computeAbiertoTotal(data) === 0 }
function hasZeroInObstaculos(data = {}) { return computeObstaculosTotal(data) === 0 }
function hasZeroInDiario(scores = {}) { return RUBRIC.some(c => (scores[c.id] ?? 0) === 0) }

// ─── TeamScoring ──────────────────────────────────────────────────────────────
const SECTION_TABS = [
  { id: 'abierto',    label: '🟢 Abierto'    },
  { id: 'obstaculos', label: '🔴 Obstáculos'  },
  { id: 'diario',     label: '📋 Diario'      },
  { id: 'resources',  label: 'Recursos'       },
]

function TeamScoring({ team, onClose }) {
  const { user, profile } = useAuth()
  const scoreDocId = `${team.id}_${user.uid}`
  const diarioDisabled = DIARIO_DISABLED_TEAMS.some(n => team?.name?.toLowerCase().includes(n))

  const [abierto,    setAbierto]    = useState({ r1: {}, r2: {} })
  const [obstaculos, setObstaculos] = useState({ r1: {} })
  const [diario,     setDiario]     = useState({ scores: {} })

  const [tab,        setTab]        = useState('abierto')
  // saving / saved = string key like 'abierto_r1' | 'obstaculos_r1' | 'diario' | null
  const [saving,     setSaving]     = useState(null)
  const [saved,      setSaved]      = useState(null)
  const [hasData,    setHasData]    = useState(false)
  const [isDirty,    setIsDirty]    = useState(false) // draft saved but not all submitted
  // showConfirm = { label, onConfirm } | null
  const [showConfirm,   setShowConfirm]   = useState(null)
  const [showZeroAlert, setShowZeroAlert] = useState(null) // { onConfirm } | null
  const [showDirtyExit, setShowDirtyExit] = useState(false)

  // Load saved data (including per-round finalized flags inside round objects)
  useEffect(() => {
    getDoc(doc(db, 'fe_scores', scoreDocId)).then(snap => {
      if (!snap.exists()) return
      const d = snap.data()
      if (d.abierto)    setAbierto(d.abierto)
      if (d.obstaculos) setObstaculos(d.obstaculos)
      if (d.diario)     setDiario(d.diario)
      setHasData(true)
    })
  }, [scoreDocId])

  // Build full Firestore payload using given round/diario data
  const buildPayload = (ab, ob, di) => {
    // Una ronda bloquea la finalización solo si fue INICIADA (sections existe) y no fue enviada
    const roundOk = (r) => r?.sections === undefined || !!r?.finalized
    // Diario bloquea solo si fue INICIADO (hay algún score) y no fue enviado
    const diarioStarted = Object.keys((di?.scores ?? {})).length > 0
    const diarioOk = diarioDisabled || !diarioStarted || !!di.finalized
    const allFinalized = roundOk(ab.r1) && roundOk(ab.r2) && roundOk(ob.r1) && diarioOk
    const data = stripUndefined({
      teamId: team.id, abierto: ab, obstaculos: ob, diario: di,
      judgeUid:   user.uid,
      judgeName:  profile?.name || user.email || '',
      finalized:  !!allFinalized,
      savedAt:    serverTimestamp(),
      updatedAt:  serverTimestamp(),
    })
    data.grandTotal = computeGrandTotal(data)
    return data
  }

  // Generic save (no finalization change) — persists current state
  const doSave = async (key, ab, ob, di) => {
    setSaving(key)
    try {
      const payload = buildPayload(ab, ob, di)
      await setDoc(doc(db, 'fe_scores', scoreDocId), payload, { merge: true })
      setSaved(key)
      setHasData(true)
      // isDirty = false once everything is finalized, true otherwise
      setIsDirty(!payload.finalized)
      setTimeout(() => setSaved(null), 3000)
    } catch (err) {
      console.error('FE save error:', err)
    } finally {
      setSaving(null)
    }
  }

  // ── Per-round handlers ──────────────────────────────────────────────────────
  const handleSaveRound = (section, round) => {
    const data = section === 'abierto' ? abierto[round] : obstaculos[round]
    const hasZero = section === 'abierto' ? hasZeroInAbierto(data) : hasZeroInObstaculos(data)
    const doIt = () => {
      const key = `${section}_${round}`
      const now = new Date()
      let newAb = abierto, newOb = obstaculos
      if (section === 'abierto') {
        newAb = { ...abierto, [round]: { ...abierto[round], savedAt: now } }
        setAbierto(newAb)
      } else {
        newOb = { ...obstaculos, [round]: { ...obstaculos[round], savedAt: now } }
        setObstaculos(newOb)
      }
      doSave(key, newAb, newOb, diario)
      writeAuditLog({
        action: 'save_draft', module: 'fe',
        actor:  { uid: user.uid, name: profile?.name || user.email, role: 'judge' },
        team:   { id: team.id, name: team.name, number: team.number || '' },
        extra:  { section, round },
      })
    }
    if (hasZero) { setShowZeroAlert({ onConfirm: () => { setShowZeroAlert(null); doIt() } }) }
    else { doIt() }
  }

  const handleSubmitRound = async (section, round) => {
    setShowConfirm(null)
    const key = `${section}_${round}`
    const now = new Date()
    let newAb = abierto, newOb = obstaculos
    if (section === 'abierto') {
      newAb = { ...abierto, [round]: { ...abierto[round], finalized: true, savedAt: now } }
      setAbierto(newAb)
    } else {
      newOb = { ...obstaculos, [round]: { ...obstaculos[round], finalized: true, savedAt: now } }
      setObstaculos(newOb)
    }
    await doSave(key, newAb, newOb, diario)
    writeAuditLog({
      action: 'finalize', module: 'fe',
      actor:  { uid: user.uid, name: profile?.name || user.email, role: 'judge' },
      team:   { id: team.id, name: team.name, number: team.number || '' },
      extra:  { section, round },
    })
  }

  // ── Diario handlers ─────────────────────────────────────────────────────────
  const handleSaveDiario = () => {
    const hasZero = hasZeroInDiario(diario.scores ?? {})
    const doIt = () => {
      const newDiario = { ...diario, savedAt: new Date() }
      setDiario(newDiario)
      doSave('diario', abierto, obstaculos, newDiario)
      writeAuditLog({
        action: 'save_draft', module: 'fe',
        actor:  { uid: user.uid, name: profile?.name || user.email, role: 'judge' },
        team:   { id: team.id, name: team.name, number: team.number || '' },
        extra:  { section: 'diario' },
      })
    }
    if (hasZero) { setShowZeroAlert({ onConfirm: () => { setShowZeroAlert(null); doIt() } }) }
    else { doIt() }
  }

  const handleSubmitDiario = async () => {
    setShowConfirm(null)
    const newDiario = { ...diario, finalized: true, savedAt: new Date() }
    setDiario(newDiario)
    await doSave('diario', abierto, obstaculos, newDiario)
    writeAuditLog({
      action: 'finalize', module: 'fe',
      actor:  { uid: user.uid, name: profile?.name || user.email, role: 'judge' },
      team:   { id: team.id, name: team.name, number: team.number || '' },
      extra:  { section: 'diario' },
    })
  }

  // ── Zero-aware submit requests ──────────────────────────────────────────────
  const requestSubmitRound = (section, round) => {
    const data = section === 'abierto' ? abierto[round] : obstaculos[round]
    const hasZero = section === 'abierto' ? hasZeroInAbierto(data) : hasZeroInObstaculos(data)
    const roundLabel = section === 'abierto'
      ? `Ronda ${round === 'r1' ? 1 : 2} Abierto`
      : `Ronda 1 Obstáculos`
    const proceed = () => {
      setShowZeroAlert(null)
      setShowConfirm({ label: roundLabel, onConfirm: () => handleSubmitRound(section, round) })
    }
    if (hasZero) { setShowZeroAlert({ onConfirm: proceed }) } else { proceed() }
  }

  const requestSubmitDiario = () => {
    const hasZero = hasZeroInDiario(diario.scores ?? {})
    const proceed = () => {
      setShowZeroAlert(null)
      setShowConfirm({ label: 'Diario de Ingeniería', onConfirm: handleSubmitDiario })
    }
    if (hasZero) { setShowZeroAlert({ onConfirm: proceed }) } else { proceed() }
  }

  // ── Close intercept (dirty state guard) ─────────────────────────────────────
  const handleClose = () => {
    // Bloquea solo si alguna sección INICIADA no fue enviada
    const roundOk = (r) => r?.sections === undefined || !!r?.finalized
    const diarioStarted = Object.keys(diario?.scores ?? {}).length > 0
    const diarioOk = diarioDisabled || !diarioStarted || !!diario.finalized
    const allFinalized = roundOk(abierto.r1) && roundOk(abierto.r2) && roundOk(obstaculos.r1) && diarioOk
    if (hasData && isDirty && !allFinalized) { setShowDirtyExit(true) } else { onClose() }
  }

  const grandTotal = computeGrandTotal({ abierto, obstaculos, diario })

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {showConfirm && (
        <ConfirmDialog
          label={showConfirm.label}
          onConfirm={showConfirm.onConfirm}
          onCancel={() => setShowConfirm(null)}
        />
      )}
      {showZeroAlert && (
        <ZeroScoreDialog
          onConfirm={showZeroAlert.onConfirm}
          onCancel={() => setShowZeroAlert(null)}
        />
      )}
      {showDirtyExit && (
        <DirtyExitDialog
          onConfirm={() => { setShowDirtyExit(false); onClose() }}
          onCancel={() => setShowDirtyExit(false)}
        />
      )}

      <div className="flex items-center gap-3 mb-4 mt-4">
        <button onClick={handleClose} className="btn-ghost p-2 py-1.5 text-sm">← Equipos</button>
        <div className="flex-1" />
        <div className="text-right">
          <p className="text-xs text-gray-500">Total parcial</p>
          <p className="font-mono font-bold text-teal-400">{grandTotal}/{MAX_SCORE}</p>
        </div>
      </div>

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
              <p className="text-xs font-bold uppercase tracking-wider text-green-400 mb-1">Reto Abierto · máx {MAX_ABIERTO} pts/ronda · se suman ambas rondas</p>
              <p className="text-xs text-gray-500">El ranking usa la suma de R1 + R2.</p>
              <div className="flex gap-4 mt-2">
                {[['R1', computeAbiertoTotal(abierto.r1)], ['R2', computeAbiertoTotal(abierto.r2)]].map(([lbl, score]) => (
                  <div key={lbl} className="text-center">
                    <p className="text-xs text-gray-600">{lbl}</p>
                    <p className="font-mono font-bold text-green-400">{score}</p>
                  </div>
                ))}
                <div className="text-center">
                  <p className="text-xs text-gray-600">Σ Suma</p>
                  <p className="font-mono font-bold text-teal-400">{computeAbiertoTotal(abierto.r1) + computeAbiertoTotal(abierto.r2)}</p>
                </div>
              </div>
            </div>

            <AbiertoCard num={1} data={abierto.r1} disabled={!!abierto.r1?.finalized}
              onChange={r1 => setAbierto(prev => ({ ...prev, r1 }))} />
            <RoundButtons
              roundKey="abierto_r1" isFinalized={!!abierto.r1?.finalized}
              saving={saving} saved={saved}
              onSave={() => handleSaveRound('abierto', 'r1')}
              onSubmit={() => requestSubmitRound('abierto', 'r1')}
            />

            {!abierto.r1?.finalized ? (
              <div className="card border-dark-600 mb-3">
                <div className="flex items-center justify-center gap-2 py-4 text-gray-600 text-sm">
                  🔒 Ronda 2 disponible después de enviar Ronda 1
                </div>
              </div>
            ) : (
              <>
                <AbiertoCard num={2} data={abierto.r2} disabled={!!abierto.r2?.finalized}
                  onChange={r2 => setAbierto(prev => ({ ...prev, r2 }))} />
                <RoundButtons
                  roundKey="abierto_r2" isFinalized={!!abierto.r2?.finalized}
                  saving={saving} saved={saved}
                  onSave={() => handleSaveRound('abierto', 'r2')}
                  onSubmit={() => requestSubmitRound('abierto', 'r2')}
                />
              </>
            )}
          </motion.div>
        )}

        {/* ── Reto Obstáculos ── */}
        {tab === 'obstaculos' && (
          <motion.div key="obstaculos" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
            <div className="card bg-red-500/5 border-red-500/20 mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">Reto Obstáculos · 1 ronda única · máx {MAX_OBSTACULOS} pts</p>
              <p className="text-xs text-gray-500">Solo se corre una ronda; empate se rompe por tiempo.</p>
              <div className="flex gap-4 mt-2">
                <div className="text-center">
                  <p className="text-xs text-gray-600">R1</p>
                  <p className="font-mono font-bold text-red-400">{computeObstaculosTotal(obstaculos.r1)}</p>
                </div>
              </div>
            </div>

            <ObstaculosCard num={1} data={obstaculos.r1} disabled={!!obstaculos.r1?.finalized}
              onChange={r1 => setObstaculos(prev => ({ ...prev, r1 }))} />
            <RoundButtons
              roundKey="obstaculos_r1" isFinalized={!!obstaculos.r1?.finalized}
              saving={saving} saved={saved}
              onSave={() => handleSaveRound('obstaculos', 'r1')}
              onSubmit={() => requestSubmitRound('obstaculos', 'r1')}
            />
          </motion.div>
        )}

        {/* ── Diario ── */}
        {tab === 'diario' && (
          <motion.div key="diario" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
            {diarioDisabled && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 mb-4">
                <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-400 text-sm">Diario de Ingeniería no entregado</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Este equipo no entregó el Diario de Ingeniería a tiempo.
                    Obtienen <span className="font-bold text-white">0 puntos</span> en esta sección.
                    No es posible registrar puntaje.
                  </p>
                </div>
              </div>
            )}
            <DiarioTab
              scores={diario.scores ?? {}}
              disabled={!!diario.finalized || diarioDisabled}
              onChange={scores => setDiario(prev => ({ ...prev, scores }))}
            />
            {!diarioDisabled && (
              <div className="mt-4">
                <RoundButtons
                  roundKey="diario" isFinalized={!!diario.finalized}
                  saving={saving} saved={saved}
                  onSave={handleSaveDiario}
                  onSubmit={requestSubmitDiario}
                />
              </div>
            )}
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

// ─── Main list view ───────────────────────────────────────────────────────────
export default function FEJudgeView() {
  const { profile, logout } = useAuth()
  const [teams,    setTeams]    = useState([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('teams')
  const [showResources, setShowResources] = useState(false)

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

  if (selected) return <TeamScoring key={selected.id} team={selected} onClose={() => setSelected(null)} />

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
          <button onClick={() => setShowResources(true)}
            className="text-gray-500 hover:text-teal-400 transition-colors p-2" title="Recursos">
            <BookOpen size={16} />
          </button>
          <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors p-2">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Resources modal */}
      {showResources && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowResources(false)}>
          <div className="card max-w-sm w-full bg-dark-800 border-teal-500/30 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-white flex items-center gap-2"><BookOpen size={16} className="text-teal-400" /> Recursos</p>
              <button onClick={() => setShowResources(false)} className="text-gray-500 hover:text-white p-1"><X size={16} /></button>
            </div>
            {RESOURCES.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-xl bg-dark-700 border border-dark-600 hover:border-teal-500/30 transition-colors">
                <span className="text-xl shrink-0">{r.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{r.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Encargado / Mesa banner */}
      {(profile?.encargado || profile?.tableComp) && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-4 bg-teal-500/10 border border-teal-500/20 flex-wrap">
          {profile?.encargado && (
            <p className="text-xs text-gray-400">Encargado: <span className="text-teal-400 font-semibold">{profile.encargado}</span></p>
          )}
          {profile?.tableComp && (
            <p className="text-xs text-gray-400">Mesa de competencia: <span className="font-mono font-bold text-teal-400">{profile.tableComp}</span></p>
          )}
        </div>
      )}

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
                      {team.correlativo || team.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm break-words">{team.name}</p>
                      {team.school && <p className="text-xs text-gray-500 break-words">{team.school}</p>}
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
