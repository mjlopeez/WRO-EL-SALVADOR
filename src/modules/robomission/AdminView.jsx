import { useState, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { Star, ChevronRight, Trophy } from 'lucide-react'
import { ELEMENTARY_MAX, JUNIOR_MAX, SENIOR_MAX } from './scoringData'

const TeamManagement = lazy(() => import('./TeamManagement'))
const ResultsView    = lazy(() => import('./ResultsView'))
const RankingView    = lazy(() => import('./RankingView'))

const MAX_MAP = { elementary: ELEMENTARY_MAX, junior: JUNIOR_MAX, senior: SENIOR_MAX }

const catMeta = [
  { cat: 'elementary', label: 'Elementary', ages: '8–12 años',  color: 'elementary', max: ELEMENTARY_MAX },
  { cat: 'junior',     label: 'Junior',     ages: '11–15 años', color: 'junior',     max: JUNIOR_MAX     },
  { cat: 'senior',     label: 'Senior',     ages: '14–22 años', color: 'senior',     max: SENIOR_MAX     },
]

function useTopTeams() {
  const [teams, setTeams]   = useState([])
  const [scores, setScores] = useState([])

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'rm_teams'),  snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'rm_scores'), snap => setScores(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2() }
  }, [])

  const top = {}
  for (const { cat } of catMeta) {
    const catTeams = teams.filter(t => t.category === cat)
    const ranked = catTeams
      .map(team => {
        const ts   = scores.filter(s => s.teamId === team.id)
        const best = ts.length ? Math.max(...ts.map(s => s.total ?? 0)) : null
        const sum  = ts.length ? ts.reduce((acc, s) => acc + (s.total ?? 0), 0) : null
        return { team, sum, best }
      })
      .filter(r => r.best !== null)
      .sort((a, b) => b.best - a.best || b.sum - a.sum)
      .slice(0, 3)
    top[cat] = ranked
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
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">RoboMission 2026</h1>
        <p className="text-gray-400 mt-1">Panel de administración</p>
      </div>

      {/* Top 3 per category */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {catMeta.map(({ cat, label, color }) => {
          const top3 = topTeams[cat] || []
          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card bg-${color}/10 border-${color}/30`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Star size={14} className={`text-${color}`} />
                <span className={`text-xs font-bold uppercase tracking-wide text-${color}`}>{label}</span>
              </div>
              {top3.length === 0 ? (
                <p className="text-gray-600 text-sm">Sin puntajes aún</p>
              ) : (
                <div className="space-y-3">
                  {top3.map(({ team, sum, best }, i) => (
                    <div key={team.id} className={`flex items-center gap-2 ${i > 0 ? 'opacity-70' : ''}`}>
                      <span className="text-base shrink-0">{medals[i]}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm truncate ${i === 0 ? 'text-white' : 'text-gray-300'}`}>
                          {team.name}
                        </p>
                        {team.school && (
                          <p className="text-xs text-gray-500 truncate">{team.school}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-mono font-bold text-sm text-${color}`}>{best}</p>
                        <p className="text-xs text-gray-600">suma: {sum}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Category info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {catMeta.map(({ cat, label, ages, color, max }) => (
          <motion.div
            key={cat}
            whileHover={{ y: -3 }}
            onClick={() => setTab('equipos')}
            className={`card bg-${color}/5 border-${color}/20 cursor-pointer`}
          >
            <span className={`text-xs font-bold uppercase tracking-wide text-${color} mb-2 block`}>{label}</span>
            <p className="text-lg font-extrabold text-white">{ages}</p>
            <p className="text-gray-500 text-sm mt-1">Máx. {max} pts / ronda</p>
            <div className={`mt-3 text-${color} flex items-center gap-1 text-sm font-medium`}>
              Ver equipos <ChevronRight size={15} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setTab('resultados')}
          className="card-hover flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
            <Trophy size={18} className="text-orange-400" />
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
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
            <Star size={18} className="text-orange-400" />
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
      <div className="w-8 h-8 border-3 border-dark-500 border-t-orange-500 rounded-full animate-spin" />
    </div>
  )
}

export default function RoboMissionAdmin({ tab = 'overview', setTab }) {
  return (
    <Suspense fallback={<LoadingTab />}>
      <AnimatePresence mode="wait">
        {tab === 'overview'    && <OverviewTab key="overview" setTab={setTab} />}
        {tab === 'equipos'     && <TeamManagement key="equipos" />}
        {tab === 'resultados'  && <ResultsView key="resultados" />}
        {tab === 'ranking'     && <RankingView key="ranking" />}
      </AnimatePresence>
    </Suspense>
  )
}
