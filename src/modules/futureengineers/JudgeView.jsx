import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, ChevronRight, LogOut, BookOpen, Users, ExternalLink, CheckCircle2, Play, Pause, RotateCcw, Flag, Save, Timer } from 'lucide-react'
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import ScoreSheet from './ScoreSheet'
import { RESOURCES, RUBRIC, MAX_SCORE, LEVEL_LABELS, computeTotal } from './config'

// LEVEL_LABELS is in config but not exported — define locally
const LABELS = { 6: 'Excelente', 4: 'Suficiente', 2: 'Básico', 0: 'Ausente' }
const LEVEL_COLORS = {
  6: 'text-green-400',
  4: 'text-blue-400',
  2: 'text-yellow-400',
  0: 'text-red-400',
}

function ScoreSummary({ savedData }) {
  const total = savedData.total ?? 0
  const pct   = Math.round((total / MAX_SCORE) * 100)
  const scores = savedData.scores || {}

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="card bg-teal-500/10 border-teal-500/30">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Tu puntaje total</p>
            <p className="font-mono font-extrabold text-4xl text-teal-400">
              {total}
              <span className="text-sm text-gray-500 font-normal ml-1">/ {MAX_SCORE}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-2xl text-teal-400 opacity-70">{pct}%</p>
            {savedData.finalized && (
              <span className="text-xs text-green-400 flex items-center gap-1 justify-end">
                <CheckCircle2 size={12} /> Finalizado
              </span>
            )}
          </div>
        </div>
        <div className="h-2.5 bg-dark-600 rounded-full overflow-hidden">
          <motion.div className="h-full bg-teal-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
        </div>
      </div>

      {RUBRIC.map(c => {
        const s = scores[c.id]
        const color = s !== undefined ? LEVEL_COLORS[s] : 'text-gray-600'
        return (
          <div key={c.id} className="card">
            <div className="flex justify-between items-center">
              <p className="font-semibold text-white text-sm">{c.label}</p>
              <div className="text-right">
                <p className={`font-mono font-bold text-lg ${color}`}>{s ?? '—'}<span className="text-xs text-gray-600 font-normal">/6</span></p>
                {s !== undefined && <p className={`text-xs ${color}`}>{LABELS[s]}</p>}
              </div>
            </div>
          </div>
        )
      })}
    </motion.div>
  )
}

// ─── Chronometer ────────────────────────────────────────────────────────────
const CHRONO_ROUNDS = [
  { id: 'abierto',    label: 'Reto Abierto',     emoji: '🟢' },
  { id: 'obstaculos', label: 'Reto Obstáculos',   emoji: '🔴' },
  { id: 'diario',     label: 'Diario Ingeniería', emoji: '📋' },
]
const DURATION = 120 // seconds

const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`

function ChronoPanel({ teamId, judgeUid }) {
  const initRound = () => ({ status: 'idle', remaining: DURATION })
  const [rounds, setRounds] = useState(CHRONO_ROUNDS.map(initRound))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const intervalRefs = useRef([null, null, null])
  const lastClick = useRef({})

  // Load saved state from Firestore
  useEffect(() => {
    getDoc(doc(db, 'fe_chrono', teamId)).then(snap => {
      if (!snap.exists()) return
      const data = snap.data().rounds || []
      setRounds(CHRONO_ROUNDS.map((_, i) => {
        const s = data[i] || {}
        return {
          status: s.status === 'running' ? 'paused' : (s.status || 'idle'),
          remaining: typeof s.remaining === 'number' ? s.remaining : DURATION,
        }
      }))
    })
  }, [teamId])

  // Manage intervals for running rounds
  const statusKey = rounds.map(r => r.status).join(',')
  useEffect(() => {
    rounds.forEach((r, i) => {
      if (r.status === 'running') {
        if (!intervalRefs.current[i]) {
          intervalRefs.current[i] = setInterval(() => {
            setRounds(prev => {
              const next = [...prev]
              if (next[i].remaining <= 1) {
                clearInterval(intervalRefs.current[i])
                intervalRefs.current[i] = null
                next[i] = { ...next[i], remaining: 0, status: 'finished' }
              } else {
                next[i] = { ...next[i], remaining: next[i].remaining - 1 }
              }
              return next
            })
          }, 1000)
        }
      } else {
        if (intervalRefs.current[i]) {
          clearInterval(intervalRefs.current[i])
          intervalRefs.current[i] = null
        }
      }
    })
    return () => {
      intervalRefs.current.forEach((ref, i) => { if (ref) { clearInterval(ref); intervalRefs.current[i] = null } })
    }
  }, [statusKey])

  const guard = (key, fn) => {
    const now = Date.now()
    if (now - (lastClick.current[key] || 0) < 600) return
    lastClick.current[key] = now
    fn()
  }

  const act = (i, status) => guard(`${i}_${status}`, () =>
    setRounds(prev => { const n = [...prev]; n[i] = { ...n[i], status }; return n })
  )
  const resetRound = (i) => guard(`${i}_reset`, () =>
    setRounds(prev => { const n = [...prev]; n[i] = { status: 'idle', remaining: DURATION }; return n })
  )

  const handleSave = async () => {
    setSaving(true)
    await setDoc(doc(db, 'fe_chrono', teamId), {
      teamId, judgeUid,
      rounds: rounds.map((r, i) => ({
        id: CHRONO_ROUNDS[i].id,
        label: CHRONO_ROUNDS[i].label,
        status: r.status,
        elapsed: DURATION - r.remaining,
        remaining: r.remaining,
      })),
      updatedAt: serverTimestamp(),
    }, { merge: true })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const doneRounds = rounds.map((r, i) => ({ ...CHRONO_ROUNDS[i], elapsed: DURATION - r.remaining, status: r.status }))
    .filter(r => r.status === 'finished')
  const elapsed = doneRounds.map(r => r.elapsed)
  const bestTime = elapsed.length ? Math.min(...elapsed) : null
  const avgTime  = elapsed.length ? Math.round(elapsed.reduce((a,b)=>a+b,0)/elapsed.length) : null

  return (
    <div className="space-y-3">
      {CHRONO_ROUNDS.map((round, i) => {
        const r = rounds[i]
        const rem = r.remaining
        const isDanger  = rem <= 10 && r.status !== 'finished' && r.status !== 'idle'
        const isWarning = rem <= 30 && rem > 10 && r.status !== 'finished' && r.status !== 'idle'
        const elapsedSecs = DURATION - rem

        return (
          <div key={round.id} className={`card transition-all duration-200 ${
            r.status === 'running'
              ? isDanger   ? 'border-red-500/60 bg-red-500/5'
              : isWarning  ? 'border-yellow-500/60 bg-yellow-500/5'
              : 'border-teal-500/40 bg-teal-500/5'
              : r.status === 'finished' ? 'border-green-500/30 bg-green-500/5'
              : 'border-dark-500'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{round.emoji}</span>
              <p className="font-bold text-white flex-1 text-sm">{round.label}</p>
              {r.status === 'finished' && (
                <span className="text-xs text-green-400 font-semibold font-mono">✓ {fmtTime(elapsedSecs)}</span>
              )}
              {r.status === 'paused' && (
                <span className="text-xs text-yellow-400 font-semibold">⏸ Pausado</span>
              )}
            </div>

            {r.status !== 'finished' && (
              <div className={`font-mono text-5xl font-extrabold text-center py-3 tracking-widest select-none ${
                isDanger ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-white'
              }`}>
                {fmtTime(rem)}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              {r.status === 'idle' && (
                <button onClick={() => act(i,'running')} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm">
                  <Play size={15} /> Iniciar
                </button>
              )}
              {(r.status === 'running' || r.status === 'paused') && (<>
                {r.status === 'running' ? (
                  <button onClick={() => act(i,'paused')} className="flex-1 py-3 rounded-xl font-bold text-sm border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 flex items-center justify-center gap-2">
                    <Pause size={15} /> Pausar
                  </button>
                ) : (
                  <button onClick={() => act(i,'running')} className="flex-1 py-3 rounded-xl font-bold text-sm border border-teal-500/40 bg-teal-500/10 text-teal-400 flex items-center justify-center gap-2">
                    <Play size={15} /> Reanudar
                  </button>
                )}
                <button onClick={() => act(i,'finished')} className="flex-1 py-3 rounded-xl font-bold text-sm border border-green-500/40 bg-green-500/10 text-green-400 flex items-center justify-center gap-2">
                  <Flag size={15} /> Finalizar
                </button>
              </>)}
              {r.status !== 'idle' && (
                <button onClick={() => resetRound(i)} className="px-4 py-3 rounded-xl text-sm border border-dark-500 text-gray-500 hover:text-red-400 hover:border-red-500/30 transition-all">
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>
        )
      })}

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl font-bold border border-teal-500/40 bg-teal-500/10 text-teal-400 text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
        {saving
          ? <span className="w-4 h-4 border-2 border-teal-300/30 border-t-teal-400 rounded-full animate-spin" />
          : saved ? <><CheckCircle2 size={15} /> Guardado</> : <><Save size={15} /> Guardar tiempos</>
        }
      </button>

      {doneRounds.length > 0 && (
        <div className="card bg-dark-700 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Resumen de tiempos</p>
          {doneRounds.map(r => (
            <div key={r.id} className="flex justify-between items-center py-1.5 border-b border-dark-600 last:border-0">
              <span className="text-sm text-gray-300">{r.emoji} {r.label}</span>
              <span className="font-mono font-bold text-teal-400">{fmtTime(r.elapsed)}</span>
            </div>
          ))}
          {doneRounds.length > 1 && (
            <div className="flex gap-3 pt-3">
              <div className="flex-1 text-center py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-gray-500">Mejor</p>
                <p className="font-mono font-bold text-green-400">{fmtTime(bestTime)}</p>
              </div>
              <div className="flex-1 text-center py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-gray-500">Promedio</p>
                <p className="font-mono font-bold text-blue-400">{fmtTime(avgTime)}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Team info card ──────────────────────────────────────────────────────────
function TeamInfoCard({ team }) {
  return (
    <div className="card bg-dark-700 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center font-bold text-teal-400 shrink-0">
          {team.number || team.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white truncate">{team.name}</p>
          {team.number && <p className="text-xs text-gray-500">Equipo #{team.number}</p>}
          {team.school && <p className="text-xs text-gray-500 truncate">{team.school}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {[team.member1, team.member2, team.member3].filter(Boolean).map((m,i) => (
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

function TeamScoring({ team, onClose }) {
  const { user } = useAuth()
  const [view, setView]           = useState('chrono')
  const [savedData, setSavedData] = useState(null)

  const refreshSaved = () => {
    getDoc(doc(db, 'fe_scores', `${team.id}_${user.uid}`)).then(snap => {
      if (snap.exists()) setSavedData(snap.data())
    })
  }

  useEffect(() => { refreshSaved() }, [team.id, user.uid])

  const hasSaved = savedData !== null

  const tabs = [
    { id: 'chrono',     label: 'Cronómetro', icon: <Timer size={13} /> },
    { id: 'score',      label: 'Evaluación', icon: hasSaved ? <CheckCircle2 size={12} className="text-green-500" /> : null },
    ...(hasSaved ? [{ id: 'summary', label: 'Resumen', icon: null }] : []),
  ]

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4 mt-4">
        <button onClick={onClose} className="btn-ghost p-2 py-1.5 text-sm">← Equipos</button>
        <div className="flex-1" />
        <span className="text-xs text-gray-500">Future Engineers</span>
      </div>

      <TeamInfoCard team={team} />

      <div className="flex gap-1 mb-5 bg-dark-700 p-1 rounded-xl">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
              view === t.id ? 'bg-dark-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === 'chrono' && (
          <motion.div key="chrono" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <ChronoPanel teamId={team.id} judgeUid={user.uid} />
          </motion.div>
        )}
        {view === 'summary' && savedData && (
          <motion.div key="summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <ScoreSummary savedData={savedData} />
          </motion.div>
        )}
        {view === 'score' && (
          <motion.div key="score" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <ScoreSheet team={team} elapsedSeconds={0} onResetTimer={() => {}} onClose={onClose} onSaved={() => { refreshSaved(); setView('score') }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FEJudgeView() {
  const { profile, logout } = useAuth()
  const [teams, setTeams]   = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('teams')

  useEffect(() => {
    const q = query(collection(db, 'fe_teams'), orderBy('name'))
    return onSnapshot(q, snap => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
  }, [])

  // Only teams assigned to this judge
  const myTeams = teams.filter(t => t.assignedJudgeUid === profile?.uid)

  const filtered = myTeams.filter(t =>
    !search ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.number?.toLowerCase().includes(search.toLowerCase()) ||
    t.school?.toLowerCase().includes(search.toLowerCase())
  )

  if (selected) {
    return <TeamScoring team={selected} onClose={() => setSelected(null)} />
  }

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
                  <motion.button
                    key={team.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelected(team)}
                    className="w-full card-hover text-left flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center font-bold shrink-0 text-teal-400">
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
          <motion.div key="resources" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-3">
            <div className="card bg-teal-500/10 border-teal-500/30">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-3">Rúbrica de documentación (máx. 30 pts)</p>
              {RUBRIC.map(c => (
                <div key={c.id} className="flex justify-between items-center py-1.5 border-b border-dark-600 last:border-0">
                  <span className="text-sm text-gray-300">{c.label}</span>
                  <span className="font-mono font-bold text-sm text-teal-400">0/2/4/6</span>
                </div>
              ))}
            </div>

            <div className="card bg-amber-500/5 border-amber-500/20">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">Escala de puntuación</p>
              <div className="space-y-1.5">
                {[['6', 'Excelente', 'text-green-400'], ['4', 'Suficiente', 'text-blue-400'], ['2', 'Básico', 'text-yellow-400'], ['0', 'Ausente', 'text-red-400']].map(([pts, label, color]) => (
                  <div key={pts} className="flex items-center gap-2 text-xs">
                    <span className={`font-mono font-bold w-4 ${color}`}>{pts}</span>
                    <span className={color}>{label}</span>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
