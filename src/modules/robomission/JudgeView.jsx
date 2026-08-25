import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Trophy, ChevronRight, Bot, ArrowLeft, BookOpen, ExternalLink, Search, X, CheckCircle2, BarChart2, Building2, AlertTriangle, Lock } from 'lucide-react'
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import ScoreSheet from './ScoreSheet'
import { ELEMENTARY_MAX, JUNIOR_MAX, SENIOR_MAX } from './scoringData'

const ROUNDS = [1, 2, 3]

const CAT_CONFIG = {
  elementary: {
    max: ELEMENTARY_MAX,
    color: 'elementary', label: 'Elementary', ages: '8–12 años',
    theme: 'from-elementary/20 to-transparent',
    rulesUrl:    'https://drive.google.com/file/d/1C-9FSgemEzuhrBjE06a5HPjsGlhB-Sb1/view',
    trackUrl:    'https://drive.google.com/file/d/1S3ffqSFwAsZDG8SrRw5Q4IF6Yc2_cN9h/view',
    elementsUrl: 'https://drive.google.com/file/d/1oyjsJ1k4etNmFuxiyb2wKp_n_FyGsuxc/view',
    videoUrl:    'https://youtu.be/J-gyMW91qsQ',
    theme_desc:  '🎵 Festival de Música',
  },
  junior: {
    max: JUNIOR_MAX,
    color: 'junior', label: 'Junior', ages: '11–15 años',
    theme: 'from-junior/20 to-transparent',
    rulesUrl:    'https://drive.google.com/file/d/1Pc5LmF-ubwu7pvzcvAxlWLJlqchDI5kY/view',
    trackUrl:    'https://drive.google.com/file/d/1P8MhsG1ofaZdjdEYd7mzztj8EJ3h7yBc/view',
    elementsUrl: 'https://drive.google.com/file/d/1-VxWA0K-kiFJ714ArLObuyw66-YW7UTc/view',
    videoUrl:    'https://youtu.be/Ks2DLT8AyHA',
    theme_desc:  '🏰 Patrimonio Histórico',
  },
  senior: {
    max: SENIOR_MAX,
    color: 'senior', label: 'Senior', ages: '14–22 años',
    theme: 'from-senior/20 to-transparent',
    rulesUrl:    'https://drive.google.com/file/d/1o_Xi_eLACKXUOCqZ5SzKwWG6TsFp7h2z/view',
    trackUrl:    'https://drive.google.com/file/d/1jANShezkNJAnseZCoUEjgEqlsG5Jh4dr/view',
    elementsUrl: 'https://drive.google.com/file/d/1ClM8h_IUYh6dsOtAAZ4X8NQyBY1y0TT4/view',
    videoUrl:    'https://youtu.be/kYOWCv24Tjg',
    theme_desc:  '🏗️ Construcción Urbana',
  },
}

// ─── Main export ────────────────────────────────────────────────────────────

export default function JudgeView() {
  const { user, profile, logout } = useAuth()
  const category = profile?.category || 'elementary'
  const config   = CAT_CONFIG[category] || CAT_CONFIG.elementary

  const [teams, setTeams]     = useState([])
  const [selected, setSelected] = useState(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [search, setSearch]   = useState('')

  const filteredTeams = search
    ? teams.filter(t => {
        const q = search.toLowerCase()
        const members = [t.member1, t.member2, t.member3].filter(Boolean)
        return (
          t.name?.toLowerCase().includes(q) ||
          t.number?.toLowerCase().includes(q) ||
          t.school?.toLowerCase().includes(q) ||
          t.city?.toLowerCase().includes(q) ||
          members.some(m => m.toLowerCase().includes(q))
        )
      })
    : teams

  useEffect(() => {
    if (!user || !profile) return
    return onSnapshot(collection(db, 'rm_teams'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setTeams(all.filter(t => t.category === category && t.assignedJudgeUid === user.uid).sort((a, b) => (a.name || '').localeCompare(b.name || '')))
    })
  }, [user, profile, category])

  if (selected) {
    return (
      <TeamScoring
        team={selected}
        config={config}
        category={category}
        judgeUid={user.uid}
        profile={profile}
        onBack={() => setSelected(null)}
        onLogout={logout}
      />
    )
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-${config.color}/20 border border-${config.color}/30 flex items-center justify-center`}>
            <Bot size={22} className={`text-${config.color}`} />
          </div>
          <div>
            <p className={`badge-${config.color} inline-block mb-1`}>{config.label}</p>
            <p className="text-lg font-bold text-white leading-tight">Panel de Juez</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setInfoOpen(true)}
            className="btn-ghost flex items-center gap-2 text-sm py-2 px-4">
            <BookOpen size={16} /> Recursos
          </button>
          <button onClick={logout} className="text-gray-400 hover:text-red-400 transition-colors p-2">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Judge info card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className={`card bg-gradient-to-r ${config.theme} border-${config.color}/30 mb-6`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-${config.color}/20 flex items-center justify-center font-extrabold text-xl text-${config.color}`}>
            {profile?.name?.[0]?.toUpperCase() || 'J'}
          </div>
          <div>
            <p className="text-xl font-bold text-white">{profile?.name}</p>
            <p className="text-sm text-gray-400">{profile?.email}</p>
            <p className="text-sm text-gray-400 mt-0.5">
              {config.label} · {config.ages} · {config.theme_desc}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Teams header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-white">Equipos asignados</h2>
        <span className={`text-${config.color} text-sm font-medium`}>{filteredTeams.length} de {teams.length}</span>
      </div>

      {/* Search */}
      {teams.length > 0 && (
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input className="input-field pl-9 py-2 text-sm"
            placeholder="Buscar equipo por nombre, número, escuela..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Team list */}
      {teams.length === 0 ? (
        <div className="card text-center py-12">
          <Trophy size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No tienes equipos asignados aún.</p>
          <p className="text-gray-500 text-sm mt-1">El administrador te asignará los equipos pronto.</p>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="card text-center py-8">
          <Search size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Sin resultados para "<span className={`text-${config.color}`}>{search}</span>"</p>
          <button onClick={() => setSearch('')} className="btn-ghost mt-3 text-sm py-1.5 px-4">Limpiar</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTeams.map((team, i) => {
            const members = [team.member1, team.member2, team.member3].filter(Boolean)
            return (
              <motion.button
                key={team.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(team)}
                className={`card-hover w-full text-left border-${config.color}/20`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-${config.color}/15 flex items-center justify-center font-bold text-lg text-${config.color} shrink-0`}>
                    {team.number || team.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-base">{team.name}</p>
                    <p className="text-sm text-gray-400 truncate">
                      {members.length > 0 ? members.join(' · ') : 'Sin integrantes'}
                    </p>
                    {team.school && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Building2 size={10} className="shrink-0" />
                        {team.school}{team.city && ` · ${team.city}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500 mb-1">3 rondas</p>
                    <ChevronRight size={18} className={`text-${config.color}`} />
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Resources modal */}
      <AnimatePresence>
        {infoOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setInfoOpen(false)}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="card w-full max-w-sm">
              <h3 className="font-bold text-white mb-4">Recursos – {config.label}</h3>
              <div className="space-y-2">
                {[
                  { label: '📋 Reglamento',           url: config.rulesUrl    },
                  { label: '🗺️ Pista',                url: config.trackUrl    },
                  { label: '🧩 Elementos de pista',   url: config.elementsUrl },
                  { label: '▶️ Video explicativo',    url: config.videoUrl    },
                ].map(({ label, url }) => (
                  <a key={label} href={url} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between px-4 py-3 bg-dark-600 hover:bg-dark-500 rounded-xl text-sm text-gray-300 hover:text-white transition-all group">
                    {label}
                    <ExternalLink size={14} className="text-gray-500 group-hover:text-white transition-colors" />
                  </a>
                ))}
              </div>
              <button onClick={() => setInfoOpen(false)} className="btn-ghost w-full mt-4 py-2 text-sm">Cerrar</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Team scoring (rounds + summary) ────────────────────────────────────────

// ─── DirtyExitDialog ────────────────────────────────────────────────────────
function DirtyExitDialog({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="card max-w-sm w-full border-yellow-500/40 bg-dark-800">
        <div className="text-center mb-4">
          <AlertTriangle size={36} className="text-yellow-400 mx-auto mb-2" />
          <p className="font-bold text-white text-lg">Puntaje sin enviar</p>
          <p className="text-sm text-gray-400 mt-1">
            Guardaste un borrador pero <span className="text-yellow-400 font-semibold">aún no lo enviaste</span>.
            ¿Salir de todas formas?
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm border border-dark-500 text-gray-300 hover:text-white hover:border-gray-400 transition-all">
            Seguir editando
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 transition-all">
            Salir igual
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function TeamScoring({ team, config, category, judgeUid, profile, onBack, onLogout }) {
  const [round, setRound]           = useState(1)
  const [savedTotals, setSavedTotals] = useState({})
  // savedFlags[r] = { finalized: bool } — tracks finalization per round
  const [savedFlags, setSavedFlags]   = useState({})
  const [showSummary, setShowSummary] = useState(false)
  const [showDirtyExit, setShowDirtyExit] = useState(false)
  const members = [team.member1, team.member2, team.member3].filter(Boolean)

  const loadTotals = () => {
    Promise.all(
      ROUNDS.map(r => getDoc(doc(db, 'rm_scores', `${team.id}_r${r}`)))
    ).then(snaps => {
      const totals = {}
      const flags  = {}
      snaps.forEach((snap, i) => {
        if (snap.exists()) {
          const d = snap.data()
          totals[i + 1] = d.total ?? null
          flags[i + 1]  = { finalized: d.finalized === true }
        }
      })
      setSavedTotals(totals)
      setSavedFlags(flags)
    })
  }

  useEffect(() => { loadTotals() }, [team.id])

  // A round is "dirty" if it was saved as draft but not finalized
  const isDirty = ROUNDS.some(r => savedTotals[r] !== undefined && !savedFlags[r]?.finalized)

  const handleBack = () => {
    if (isDirty) { setShowDirtyExit(true) } else { onBack() }
  }

  const allSaved  = ROUNDS.every(r => savedTotals[r] !== undefined)
  const CAT_TEXT  = { elementary: 'text-dark-900', junior: 'text-white', senior: 'text-white' }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleBack} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-lg truncate">{team.name}</p>
          <p className="text-sm text-gray-400 truncate">
            {members.join(' · ')}{team.school && ` · ${team.school}`}
          </p>
        </div>
        <button onClick={onLogout} className="text-gray-500 hover:text-red-400 transition-colors p-2">
          <LogOut size={16} />
        </button>
      </div>

      {/* Team info card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={`card border-${config.color}/20 mb-6`}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Número de equipo</p>
            <p className={`font-bold font-mono text-${config.color}`}>{team.number || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Categoría</p>
            <span className={`badge-${config.color}`}>{config.label}</span>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Coach</p>
            <p className="text-white font-medium">{team.coach || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Ciudad</p>
            <p className="text-gray-300">{team.city || '—'}</p>
          </div>
          {members.length > 0 && (
            <div className="col-span-2">
              <p className="text-gray-500 text-xs mb-0.5">Integrantes</p>
              <p className="text-white">{members.join(', ')}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* DirtyExit dialog */}
      {showDirtyExit && (
        <DirtyExitDialog
          onConfirm={() => { setShowDirtyExit(false); onBack() }}
          onCancel={() => setShowDirtyExit(false)}
        />
      )}

      {/* Round tabs + summary toggle */}
      <div className="flex gap-2 mb-5">
        {ROUNDS.map(r => {
          const hasSaved  = savedTotals[r] !== undefined
          const isActive  = !showSummary && round === r
          const locked    = r > 1 && !savedFlags[r - 1]?.finalized
          return (
            <button key={r}
              onClick={() => { if (!locked) { setRound(r); setShowSummary(false) } }}
              disabled={locked}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
                locked
                  ? 'bg-dark-800 text-gray-600 border border-dark-700 cursor-not-allowed'
                  : isActive
                    ? `bg-${config.color} ${CAT_TEXT[category] || 'text-white'} shadow-lg`
                    : 'bg-dark-700 text-gray-400 hover:text-white border border-dark-500'
              }`}>
              {locked
                ? <><Lock size={11} /> Ronda {r}</>
                : <>{hasSaved && <CheckCircle2 size={11} className={isActive ? 'opacity-70' : 'text-green-500'} />} Ronda {r}</>
              }
            </button>
          )
        })}
        {allSaved && (
          <button onClick={() => setShowSummary(true)}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 ${
              showSummary
                ? `bg-${config.color} ${CAT_TEXT[category] || 'text-white'} shadow-lg`
                : 'bg-dark-700 text-gray-400 hover:text-white border border-dark-500'
            }`}>
            <BarChart2 size={14} /> Resumen
          </button>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {showSummary ? (
          <motion.div key="summary"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}
            className="space-y-4">
            <div className="card">
              <h3 className={`font-bold text-${config.color} mb-4 flex items-center gap-2`}>
                <BarChart2 size={18} /> Resumen de puntuación – {team.name}
              </h3>
              <div className="space-y-3">
                {ROUNDS.map(r => {
                  const total = savedTotals[r] ?? 0
                  const pct   = Math.round((total / config.max) * 100)
                  return (
                    <div key={r}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-white">Ronda {r}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold text-${config.color}`}>{total}</span>
                          <span className="text-gray-500 text-xs">/ {config.max}</span>
                          <span className="text-gray-400 text-xs w-10 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                        <motion.div className={`h-full bg-${config.color} rounded-full`}
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, delay: r * 0.1 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 pt-4 border-t border-dark-600 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-medium">Suma total</span>
                  <span className={`font-mono font-extrabold text-2xl text-${config.color}`}>
                    {ROUNDS.reduce((acc, r) => acc + (savedTotals[r] ?? 0), 0)}
                    <span className="text-sm text-gray-500 font-normal ml-1">pts</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Mejor ronda</span>
                  <span className={`font-mono font-bold text-lg text-${config.color} opacity-75`}>
                    {Math.max(...ROUNDS.map(r => savedTotals[r] ?? 0))}
                    <span className="text-sm text-gray-500 font-normal ml-1">pts</span>
                  </span>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-gray-600">Las 3 rondas han sido registradas correctamente.</p>
          </motion.div>
        ) : (
          <motion.div key={round}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <ScoreSheet
              team={team}
              category={category}
              round={round}
              judgeUid={judgeUid}
              judgeName={profile?.name || null}
              onSaved={loadTotals}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
