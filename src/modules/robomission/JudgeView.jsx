import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Users, LogOut, ChevronRight, BarChart2, CheckCircle2 } from 'lucide-react'
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import ScoreSheet from './ScoreSheet'
import { ELEMENTARY_MAX, JUNIOR_MAX, SENIOR_MAX } from './scoringData'

const ROUNDS = [1, 2, 3]
const MAX_MAP = { elementary: ELEMENTARY_MAX, junior: JUNIOR_MAX, senior: SENIOR_MAX }

const catColors = {
  elementary: { bg: 'bg-elementary/10', border: 'border-elementary/30', text: 'text-elementary', solid: 'bg-elementary' },
  junior:     { bg: 'bg-junior/10',     border: 'border-junior/30',     text: 'text-junior',     solid: 'bg-junior'     },
  senior:     { bg: 'bg-senior/10',     border: 'border-senior/30',     text: 'text-senior',     solid: 'bg-senior'     },
}

// Summary view when all 3 rounds are saved
function SummaryView({ team, category, savedTotals, onBack }) {
  const max = MAX_MAP[category] || ELEMENTARY_MAX
  const cc  = catColors[category] || catColors.elementary
  const totalSum  = ROUNDS.reduce((acc, r) => acc + (savedTotals[r] ?? 0), 0)
  const bestRound = Math.max(...ROUNDS.map(r => savedTotals[r] ?? 0))

  return (
    <motion.div
      key="summary"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22 }}
      className="space-y-4"
    >
      <div className="card">
        <h3 className={`font-bold ${cc.text} mb-4 flex items-center gap-2`}>
          <BarChart2 size={18} /> Resumen — {team.name}
        </h3>
        <div className="space-y-3">
          {ROUNDS.map(r => {
            const total = savedTotals[r] ?? 0
            const pct   = Math.round((total / max) * 100)
            return (
              <div key={r}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-white">Ronda {r}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold ${cc.text}`}>{total}</span>
                    <span className="text-gray-500 text-xs">/ {max}</span>
                    <span className="text-gray-400 text-xs w-10 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${cc.solid} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: r * 0.1 }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-dark-600 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-medium">Suma total</span>
            <span className={`font-mono font-extrabold text-2xl ${cc.text}`}>
              {totalSum} <span className="text-sm text-gray-500 font-normal">pts</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">Mejor ronda</span>
            <span className={`font-mono font-bold text-lg ${cc.text} opacity-75`}>
              {bestRound} <span className="text-sm text-gray-500 font-normal">pts</span>
            </span>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-gray-600">Las 3 rondas han sido registradas correctamente.</p>
    </motion.div>
  )
}

// Team info card for judge
function TeamInfoCard({ team, category }) {
  const cc = catColors[category] || catColors.elementary
  const members = [team.member1, team.member2, team.member3].filter(Boolean)
  return (
    <div className="card bg-dark-700 mb-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${cc.bg} border ${cc.border} flex items-center justify-center font-bold shrink-0 ${cc.text}`}>
          {team.number || team.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-white">{team.name}</p>
            {team.number && <span className="text-xs text-gray-500">#{team.number}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${cc.bg} ${cc.border} ${cc.text}`}>{category}</span>
          </div>
          {team.school && <p className="text-xs text-gray-500 mt-0.5 truncate">{team.school}</p>}
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

// Scoring view for a single team (all rounds + summary)
function TeamScoring({ team, category, onClose }) {
  const { user } = useAuth()
  const [round, setRound]           = useState(1)
  const [savedTotals, setSavedTotals] = useState({})  // { 1: 200, 2: 185, 3: 220 }
  const [showSummary, setShowSummary] = useState(false)
  const cc  = catColors[category] || catColors.elementary
  const max = MAX_MAP[category] || ELEMENTARY_MAX

  // Load totals for all 3 rounds so we can show checkmarks + summary
  const refreshTotals = () => {
    Promise.all(
      ROUNDS.map(r => getDoc(doc(db, 'rm_scores', `${team.id}_r${r}`)))
    ).then(snaps => {
      const totals = {}
      snaps.forEach((snap, i) => {
        if (snap.exists()) totals[i + 1] = snap.data().total ?? 0
      })
      setSavedTotals(totals)
    })
  }

  useEffect(() => { refreshTotals() }, [team.id])

  const allSaved = ROUNDS.every(r => savedTotals[r] !== undefined)

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Back nav */}
      <div className="flex items-center gap-3 mb-4 mt-4">
        <button onClick={onClose} className="btn-ghost p-2 py-1.5 text-sm">← Equipos</button>
        <div className="flex-1" />
        <span className="text-xs text-gray-500">RoboMission</span>
      </div>

      <TeamInfoCard team={team} category={category} />

      {/* Round tabs + summary */}
      <div className="flex gap-2 mb-5">
        {ROUNDS.map(r => {
          const hasSaved = savedTotals[r] !== undefined
          const isActive = !showSummary && round === r
          return (
            <button
              key={r}
              onClick={() => { setRound(r); setShowSummary(false) }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 border ${
                isActive
                  ? `${cc.bg} ${cc.border} ${cc.text}`
                  : 'border-dark-500 text-gray-400 hover:text-white hover:border-dark-400'
              }`}
            >
              {hasSaved && (
                <CheckCircle2 size={12} className={isActive ? cc.text : 'text-green-500'} />
              )}
              Ronda {r}
            </button>
          )
        })}

        {allSaved && (
          <button
            onClick={() => setShowSummary(true)}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 border ${
              showSummary
                ? `${cc.bg} ${cc.border} ${cc.text}`
                : 'border-dark-500 text-gray-400 hover:text-white hover:border-dark-400'
            }`}
          >
            <BarChart2 size={14} /> Resumen
          </button>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {showSummary ? (
          <SummaryView
            key="summary"
            team={team}
            category={category}
            savedTotals={savedTotals}
            onBack={() => setShowSummary(false)}
          />
        ) : (
          <motion.div
            key={round}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ScoreSheet
              team={team}
              round={round}
              category={category}
              onClose={onClose}
              onSaved={refreshTotals}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function JudgeView() {
  const { profile, user, logout } = useAuth()
  const category = profile?.category || 'elementary'

  const [teams, setTeams]       = useState([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)   // team object

  useEffect(() => {
    // Load all rm_teams, filter client-side by category — no composite index needed
    return onSnapshot(collection(db, 'rm_teams'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const mine = all
        .filter(t => t.category === category)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      setTeams(mine)
      setLoading(false)
    }, (err) => {
      console.error('RM JudgeView error:', err)
      setLoading(false)
    })
  }, [category])

  const filtered = teams.filter(t =>
    !search ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.number?.toLowerCase().includes(search.toLowerCase()) ||
    t.school?.toLowerCase().includes(search.toLowerCase())
  )

  const cc = catColors[category] || catColors.elementary

  if (selected) {
    return (
      <TeamScoring
        team={selected}
        category={category}
        onClose={() => setSelected(null)}
      />
    )
  }

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <p className="font-extrabold text-white text-lg leading-tight">RoboMission</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${cc.bg} ${cc.border} ${cc.text}`}>
              {category}
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
        <input
          className="input-field pl-9 py-2.5 text-sm"
          placeholder="Buscar equipo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Team list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-dark-500 border-t-orange-500 rounded-full animate-spin" />
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
            <motion.button
              key={team.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(team)}
              className="w-full card-hover text-left flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl ${cc.bg} border ${cc.border} flex items-center justify-center font-bold shrink-0 ${cc.text}`}>
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
    </div>
  )
}
