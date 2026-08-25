import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Users, LogOut, ChevronRight, BarChart2, CheckCircle2, AlertTriangle, Lock } from 'lucide-react'
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import ScoreSheet from './ScoreSheet'
import { ROUNDS, MISSION_MAX, DOC_MAX, CATEGORY_META } from './config'

const catColors = {
  elementary: { bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-400',  solid: 'bg-green-500'  },
  junior:     { bg: 'bg-lime-500/10',   border: 'border-lime-500/30',   text: 'text-lime-400',   solid: 'bg-lime-500'   },
}

const TOTAL_MAX = MISSION_MAX + DOC_MAX  // 300

// Summary after all rounds saved
function SummaryView({ team, category, savedData }) {
  const cc = catColors[category] || catColors.elementary
  const bestMission = Math.max(...ROUNDS.map(r => savedData[r]?.missionScore ?? 0))
  const sumTotal    = ROUNDS.reduce((acc, r) => acc + (savedData[r]?.total ?? 0), 0)
  const bestTotal   = Math.max(...ROUNDS.map(r => savedData[r]?.total ?? 0))

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="card">
        <h3 className={`font-bold ${cc.text} mb-4 flex items-center gap-2`}>
          <BarChart2 size={18} /> Resumen — {team.name}
        </h3>
        <div className="space-y-4">
          {ROUNDS.map(r => {
            const d = savedData[r]
            if (!d) return null
            const pct = Math.round((d.total / TOTAL_MAX) * 100)
            return (
              <div key={r}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-white">Ronda {r}</span>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>Misión: <span className={cc.text}>{d.missionScore}</span></span>
                    <span>Doc: <span className={cc.text}>{d.docTotal}</span></span>
                    <span className={`font-bold ${cc.text} text-sm`}>{d.total} pts</span>
                  </div>
                </div>
                <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
                  <motion.div className={`h-full ${cc.solid} rounded-full`}
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: r * 0.1 }} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-5 pt-4 border-t border-dark-600 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Suma total (3 rondas)</span>
            <span className={`font-mono font-extrabold text-xl ${cc.text}`}>{sumTotal} pts</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Mejor ronda individual</span><span className={cc.text}>{bestTotal}/{MISSION_MAX}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Mejor misión</span><span className={cc.text}>{bestMission}/{MISSION_MAX}</span>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-gray-600">Las {ROUNDS.length} rondas han sido registradas.</p>
    </motion.div>
  )
}

// Team info header
function TeamInfoCard({ team, category }) {
  const cc = catColors[category] || catColors.elementary
  const meta = CATEGORY_META[category] || {}
  const members = [team.member1, team.member2, team.member3].filter(Boolean)
  return (
    <div className="card bg-dark-700 mb-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${cc.bg} border ${cc.border} flex items-center justify-center font-bold shrink-0 ${cc.text} text-sm`}>
          {team.number || team.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-white">{team.name}</p>
            {team.number && <span className="text-xs text-gray-500">#{team.number}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full border ${cc.bg} ${cc.border} ${cc.text}`}>
              {meta.label || category}
            </span>
          </div>
          {team.institution && <p className="text-xs text-gray-500 mt-0.5 truncate">{team.institution}</p>}
          {members.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {members.map((m, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-dark-600 border border-dark-500 text-gray-300">{m}</span>
              ))}
              {team.coach && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${cc.bg} border ${cc.border} ${cc.text}`}>{team.coach}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Scoring view for a single team
function TeamScoring({ team, category, onClose }) {
  const [round, setRound]         = useState(1)
  const [savedData, setSavedData] = useState({})   // { 1: {missionScore, docTotal, total, finalized}, ... }
  const [showSummary, setShowSummary] = useState(false)
  const [showDirtyExit, setShowDirtyExit] = useState(false)
  const cc = catColors[category] || catColors.elementary

  const refreshData = () => {
    Promise.all(
      ROUNDS.map(r => getDoc(doc(db, 'rs_scores', `${team.id}_r${r}`)))
    ).then(snaps => {
      const d = {}
      snaps.forEach((snap, i) => {
        if (snap.exists()) d[i + 1] = snap.data()
      })
      setSavedData(d)
    })
  }

  useEffect(() => { refreshData() }, [team.id])

  const allSaved = ROUNDS.every(r => savedData[r] !== undefined)
  const isDirty  = ROUNDS.some(r => savedData[r] !== undefined && !savedData[r]?.finalized)

  const handleClose = () => {
    if (isDirty) { setShowDirtyExit(true) } else { onClose() }
  }

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* DirtyExit dialog */}
      {showDirtyExit && (
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
              <button onClick={() => setShowDirtyExit(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm border border-dark-500 text-gray-300 hover:text-white hover:border-gray-400 transition-all">
                Seguir editando
              </button>
              <button onClick={() => { setShowDirtyExit(false); onClose() }}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 transition-all">
                Salir igual
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 mt-4">
        <button onClick={handleClose} className="btn-ghost p-2 py-1.5 text-sm">← Equipos</button>
        <div className="flex-1" />
        <span className="text-xs text-gray-500">RoboStarter</span>
      </div>

      <TeamInfoCard team={team} category={category} />

      {/* Round tabs */}
      <div className="flex gap-2 mb-5">
        {ROUNDS.map(r => {
          const hasSaved = savedData[r] !== undefined
          const isActive = !showSummary && round === r
          const locked   = r > 1 && !savedData[r - 1]?.finalized
          return (
            <button key={r}
              onClick={() => { if (!locked) { setRound(r); setShowSummary(false) } }}
              disabled={locked}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 border ${
                locked
                  ? 'bg-dark-800 text-gray-600 border-dark-700 cursor-not-allowed'
                  : isActive
                    ? `${cc.bg} ${cc.border} ${cc.text}`
                    : 'border-dark-500 text-gray-400 hover:text-white hover:border-dark-400'
              }`}>
              {locked
                ? <><Lock size={11} /> Ronda {r}</>
                : <>{hasSaved && <CheckCircle2 size={12} className={isActive ? cc.text : 'text-green-500'} />} Ronda {r}</>
              }
            </button>
          )
        })}
        {allSaved && (
          <button onClick={() => setShowSummary(true)}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 border ${
              showSummary ? `${cc.bg} ${cc.border} ${cc.text}` : 'border-dark-500 text-gray-400 hover:text-white hover:border-dark-400'
            }`}>
            <BarChart2 size={14} /> Resumen
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showSummary ? (
          <SummaryView key="summary" team={team} category={category} savedData={savedData} />
        ) : (
          <motion.div key={round} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <ScoreSheet team={team} round={round} category={category}
              onClose={onClose} onSaved={refreshData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function RSJudgeView() {
  const { profile, logout } = useAuth()
  const category = profile?.category || 'elementary'

  const [teams, setTeams]     = useState([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    return onSnapshot(collection(db, 'rs_teams'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const mine = all
        .filter(t => t.category === category)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      setTeams(mine)
      setLoading(false)
    }, (err) => {
      console.error('RS JudgeView error:', err)
      setLoading(false)
    })
  }, [category])

  const filtered = teams.filter(t =>
    !search ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.number?.toLowerCase().includes(search.toLowerCase()) ||
    t.institution?.toLowerCase().includes(search.toLowerCase())
  )

  const cc = catColors[category] || catColors.elementary
  const meta = CATEGORY_META[category] || {}

  if (selected) return <TeamScoring team={selected} category={category} onClose={() => setSelected(null)} />

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
            <span className="text-xl">🟢</span>
          </div>
          <div>
            <p className="font-extrabold text-white text-lg leading-tight">RoboStarter</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cc.bg} ${cc.border} ${cc.text}`}>
              {meta.label || category}
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

      {/* Search */}
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
          <div className="w-8 h-8 border-3 border-dark-500 border-t-green-500 rounded-full animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-semibold text-sm">Sin equipos asignados</p>
          <p className="text-gray-600 text-xs mt-1">El administrador debe asignarte equipos para evaluar.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-400 text-sm">Sin resultados.</p>
          <button onClick={() => setSearch('')} className="btn-ghost mt-3 text-sm py-1.5 px-4">Limpiar</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((team, i) => (
            <motion.button key={team.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(team)}
              className="w-full card-hover text-left flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${cc.bg} border ${cc.border} flex items-center justify-center font-bold shrink-0 ${cc.text} text-sm`}>
                {team.number || team.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{team.name}</p>
                {team.institution && <p className="text-xs text-gray-500 truncate">{team.institution}</p>}
              </div>
              <ChevronRight size={16} className="text-gray-600 shrink-0" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
