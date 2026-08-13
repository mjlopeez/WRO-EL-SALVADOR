import { useState, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { Star, ChevronRight, Trophy, Users } from 'lucide-react'
import { CATEGORIES, CATEGORY_META, MAX_SCORE } from './config'

const TeamManagement  = lazy(() => import('./TeamManagement'))
const ResultsView     = lazy(() => import('./ResultsView'))
const RankingView     = lazy(() => import('./RankingView'))

const catColors = {
  elementary: { text: 'text-elementary', bg: 'bg-elementary/10', border: 'border-elementary/30', bar: 'bg-elementary' },
  junior:     { text: 'text-junior',     bg: 'bg-junior/10',     border: 'border-junior/30',     bar: 'bg-junior'     },
  senior:     { text: 'text-senior',     bg: 'bg-senior/10',     border: 'border-senior/30',     bar: 'bg-senior'     },
}

function useTopTeams() {
  const [teams, setTeams]   = useState([])
  const [scores, setScores] = useState([])

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'fi_teams'),  snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'fi_scores'), snap => setScores(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2() }
  }, [])

  // Group scores by teamId (multi-judge support)
  const scoresByTeam = {}
  for (const s of scores) {
    if (!scoresByTeam[s.teamId]) scoresByTeam[s.teamId] = []
    scoresByTeam[s.teamId].push(s)
  }

  const avgScore = (teamScores) => {
    if (!teamScores || teamScores.length === 0) return null
    const withTotal = teamScores.filter(s => s.total !== undefined)
    if (withTotal.length === 0) return null
    return Math.round(withTotal.reduce((acc, s) => acc + s.total, 0) / withTotal.length)
  }

  const top = {}
  for (const cat of CATEGORIES) {
    const catTeams = teams.filter(t => t.category === cat)
    top[cat] = catTeams
      .map(t => ({ team: t, total: avgScore(scoresByTeam[t.id]) }))
      .filter(r => r.total !== null)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
  }
  return top
}

function OverviewTab({ setTab }) {
  const topTeams = useTopTeams()
  const medals   = ['🥇', '🥈', '🥉']

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">Future Innovators 2026</h1>
        <p className="text-gray-400 mt-1">Panel de administración</p>
      </div>

      {/* Top 3 per category */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {CATEGORIES.map(cat => {
          const top3 = topTeams[cat] || []
          const cc   = catColors[cat]
          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card ${cc.bg} ${cc.border}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Star size={14} className={cc.text} />
                <span className={`text-xs font-bold uppercase tracking-wide ${cc.text}`}>
                  {CATEGORY_META[cat].label}
                </span>
                <span className="text-xs text-gray-600 ml-auto">{CATEGORY_META[cat].ages}</span>
              </div>
              {top3.length === 0 ? (
                <p className="text-gray-600 text-sm">Sin evaluaciones aún</p>
              ) : (
                <div className="space-y-3">
                  {top3.map(({ team, total }, i) => {
                    const pct = Math.round((total / MAX_SCORE) * 100)
                    return (
                      <div key={team.id} className={`flex items-center gap-2 ${i > 0 ? 'opacity-70' : ''}`}>
                        <span className="text-base shrink-0">{medals[i]}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm truncate ${i === 0 ? 'text-white' : 'text-gray-300'}`}>
                            {team.name}
                          </p>
                          {team.school && <p className="text-xs text-gray-500 truncate">{team.school}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-mono font-bold text-sm ${cc.text}`}>{total}</p>
                          <p className="text-xs text-gray-600">{pct}%</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Category info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {CATEGORIES.map(cat => {
          const cc = catColors[cat]
          const meta = CATEGORY_META[cat]
          return (
            <motion.div
              key={cat}
              whileHover={{ y: -3 }}
              onClick={() => setTab('equipos')}
              className={`card ${cc.bg} ${cc.border} cursor-pointer`}
            >
              <span className={`text-xs font-bold uppercase tracking-wide ${cc.text} mb-2 block`}>{meta.label}</span>
              <p className="text-lg font-extrabold text-white">{meta.ages}</p>
              <p className="text-gray-500 text-sm mt-1">Nacidos {meta.born}</p>
              <div className={`mt-3 ${cc.text} flex items-center gap-1 text-sm font-medium`}>
                Ver equipos <ChevronRight size={15} />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setTab('resultados')}
          className="card-hover flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Trophy size={18} className="text-violet-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Ver resultados</p>
            <p className="text-xs text-gray-500">Tiempo real + publicar</p>
          </div>
        </button>
        <button
          onClick={() => setTab('ranking')}
          className="card-hover flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Star size={18} className="text-violet-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Ranking</p>
            <p className="text-xs text-gray-500">Clasificación general</p>
          </div>
        </button>
      </div>
    </motion.div>
  )
}

function LoadingTab() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-3 border-dark-500 border-t-violet-500 rounded-full animate-spin" />
    </div>
  )
}

export default function FutureInnovatorsAdmin({ tab = 'overview', setTab }) {
  return (
    <Suspense fallback={<LoadingTab />}>
      <AnimatePresence mode="wait">
        {tab === 'overview'   && <OverviewTab key="overview" setTab={setTab} />}
        {tab === 'equipos'    && <TeamManagement key="equipos" />}
        {tab === 'resultados' && <ResultsView key="resultados" />}
        {tab === 'ranking'    && <RankingView key="ranking" />}
      </AnimatePresence>
    </Suspense>
  )
}
