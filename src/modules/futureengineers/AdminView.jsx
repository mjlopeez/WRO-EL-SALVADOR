import { useState, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { Star, ChevronRight, Trophy, ExternalLink } from 'lucide-react'
import { RUBRIC, MAX_SCORE, computeTotal } from './config'

const TeamManagement = lazy(() => import('./TeamManagement'))
const ResultsView    = lazy(() => import('./ResultsView'))
const RankingView    = lazy(() => import('./RankingView'))

function useOverviewData() {
  const [teams, setTeams]   = useState([])
  const [scores, setScores] = useState([])

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'fe_teams'),  snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'fe_scores'), snap => setScores(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2() }
  }, [])

  const scoreMap = {}
  for (const s of scores) { if (!scoreMap[s.teamId]) scoreMap[s.teamId] = s }

  const top3 = [...teams]
    .filter(t => scoreMap[t.id]?.total !== undefined)
    .map(t => ({ team: t, total: scoreMap[t.id].total, finalized: scoreMap[t.id].finalized }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  return { teams, scores, scoreMap, top3 }
}

function OverviewTab({ setTab }) {
  const { teams, scores, scoreMap, top3 } = useOverviewData()
  const medals = ['🥇', '🥈', '🥉']
  const scoredCount = teams.filter(t => scoreMap[t.id]).length

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">Future Engineers 2026</h1>
        <p className="text-gray-400 mt-1">Self-Driving Cars · 14–22 años</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Equipos', value: teams.length, color: 'text-teal-400' },
          { label: 'Evaluados', value: scoredCount, color: 'text-green-400' },
          { label: 'Máx. pts', value: MAX_SCORE, color: 'text-gray-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center py-4">
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Top 3 */}
      <div className="card bg-teal-500/5 border-teal-500/20 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Star size={14} className="text-teal-400" />
          <span className="text-xs font-bold uppercase tracking-wide text-teal-400">Top equipos</span>
        </div>
        {top3.length === 0 ? (
          <p className="text-gray-600 text-sm">Sin evaluaciones aún</p>
        ) : (
          <div className="space-y-3">
            {top3.map(({ team, total, finalized }, i) => {
              const pct = Math.round((total / MAX_SCORE) * 100)
              return (
                <div key={team.id} className={`flex items-center gap-3 ${i > 0 ? 'opacity-75' : ''}`}>
                  <span className="text-xl shrink-0">{medals[i]}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${i === 0 ? 'text-white' : 'text-gray-300'}`}>{team.name}</p>
                    {team.school && <p className="text-xs text-gray-500 truncate">{team.school}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-teal-400">{total}</p>
                    <p className="text-xs text-gray-600">{pct}%{!finalized ? ' · borrador' : ''}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Rubric summary */}
      <div className="card mb-6">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Rúbrica de documentación</p>
        <div className="space-y-2">
          {RUBRIC.map(c => (
            <div key={c.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300 font-medium">{c.shortLabel}</p>
                <p className="text-xs text-gray-600 truncate">{c.description.slice(0, 60)}…</p>
              </div>
              <span className="font-mono text-xs text-teal-400 shrink-0 ml-2">0/2/4/6</span>
            </div>
          ))}
          <div className="border-t border-dark-600 pt-2 flex justify-between">
            <span className="text-sm font-bold text-white">Total</span>
            <span className="font-mono font-bold text-teal-400">{MAX_SCORE} pts</span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setTab('resultados')} className="card-hover flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0">
            <Trophy size={18} className="text-teal-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Resultados</p>
            <p className="text-xs text-gray-500">Tiempo real + publicar</p>
          </div>
        </button>
        <button onClick={() => setTab('ranking')} className="card-hover flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0">
            <Star size={18} className="text-teal-400" />
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
      <div className="w-8 h-8 border-3 border-dark-500 border-t-teal-500 rounded-full animate-spin" />
    </div>
  )
}

export default function FutureEngineersAdmin({ tab = 'overview', setTab }) {
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
