import { useState, useEffect, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { Star } from 'lucide-react'
import { CATEGORIES, CATEGORY_META, MISSION_MAX, DOC_MAX } from './config'

const TeamManagement = lazy(() => import('./TeamManagement'))
const ResultsView    = lazy(() => import('./ResultsView'))
const RankingView    = lazy(() => import('./RankingView'))

const catColors = {
  elementary: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
  junior:     { bg: 'bg-lime-500/10',  border: 'border-lime-500/30',  text: 'text-lime-400'  },
}

const TOTAL_MAX = MISSION_MAX + DOC_MAX
const MEDALS = ['🥇', '🥈', '🥉']

function useTopTeams() {
  const [teams, setTeams]   = useState([])
  const [scores, setScores] = useState([])

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'rs_teams'),  s => setTeams(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'rs_scores'), s => setScores(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2() }
  }, [])

  return CATEGORIES.reduce((acc, cat) => {
    const catTeams = teams.filter(t => t.category === cat)
    acc[cat] = catTeams
      .map(team => {
        const ts   = scores.filter(s => s.teamId === team.id)
        const best = ts.length ? Math.max(...ts.map(s => s.total ?? 0)) : null
        const sum  = ts.reduce((a, s) => a + (s.total ?? 0), 0)
        return { team, best, sum }
      })
      .filter(r => r.best !== null)
      .sort((a, b) => b.sum - a.sum || b.best - a.best)
      .slice(0, 3)
    return acc
  }, {})
}

function OverviewTab({ setTab }) {
  const topTeams = useTopTeams()

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">RoboStarter 2026</h1>
        <p className="text-gray-400 mt-1">Categoría formativa · Kids Elementary &amp; Kids Junior</p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Kids Elementary', sub: '5–7 años', color: catColors.elementary },
          { label: 'Kids Junior',     sub: '7–10 años', color: catColors.junior     },
          { label: 'Rondas',          sub: '3 por equipo', color: { bg:'bg-dark-700', border:'border-dark-500', text:'text-gray-300' } },
          { label: 'Puntaje máx.',    sub: `${TOTAL_MAX} pts`, color: { bg:'bg-dark-700', border:'border-dark-500', text:'text-gray-300' } },
        ].map((item, i) => (
          <div key={i} className={`card ${item.color.bg} ${item.color.border}`}>
            <p className={`font-bold text-sm ${item.color.text}`}>{item.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Top 3 per category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {CATEGORIES.map(cat => {
          const cc   = catColors[cat]
          const top3 = topTeams[cat] || []
          const meta = CATEGORY_META[cat]
          return (
            <div key={cat} className={`card ${cc.bg} ${cc.border}`}>
              <div className="flex items-center gap-2 mb-4">
                <Star size={14} className={cc.text} />
                <span className={`text-xs font-bold uppercase tracking-wide ${cc.text}`}>{meta?.label}</span>
                <span className="text-xs text-gray-600 ml-auto">{meta?.ages}</span>
              </div>
              {top3.length === 0 ? (
                <p className="text-gray-600 text-sm">Sin puntajes aún</p>
              ) : (
                <div className="space-y-2.5">
                  {top3.map((r, i) => (
                    <div key={r.team.id} className="flex items-center gap-3">
                      <span className="text-xl w-7 text-center">{MEDALS[i]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{r.team.name}</p>
                        {r.team.institution && <p className="text-xs text-gray-500 truncate">{r.team.institution}</p>}
                      </div>
                      <span className={`font-mono font-bold ${cc.text}`}>{r.sum}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setTab('ranking')}
                className={`mt-4 text-xs ${cc.text} hover:underline`}>
                Ver ranking completo →
              </button>
            </div>
          )
        })}
      </div>

      {/* Rules summary */}
      <div className="card bg-dark-700">
        <p className="font-bold text-white text-sm mb-2">🟢 Sobre RoboStarter</p>
        <div className="text-xs text-gray-400 space-y-1">
          <p>• Categoría <strong className="text-white">formativa</strong> — no clasifica a la final internacional.</p>
          <p>• Hardware y software: <strong className="text-white">Robo Robo</strong>.</p>
          <p>• Puntaje = Misión en tapete. Junior: máx <strong className="text-white">170 pts</strong> · Elementary: referencia <strong className="text-white">200 pts</strong>.</p>
          <p>• Clasificación por <strong className="text-white">mejor ronda</strong> individual.</p>
        </div>
      </div>
    </motion.div>
  )
}

function LoadingView() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-10 h-10 border-4 border-dark-500 border-t-green-500 rounded-full animate-spin" />
    </div>
  )
}

export default function RSAdminView({ tab, setTab }) {
  return (
    <Suspense fallback={<LoadingView />}>
      {tab === 'overview'   && <OverviewTab setTab={setTab} />}
      {tab === 'equipos'    && <TeamManagement />}
      {tab === 'resultados' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <h1 className="text-2xl font-extrabold text-white mb-6">Resultados RoboStarter</h1>
          <ResultsView />
        </motion.div>
      )}
      {tab === 'ranking'    && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <h1 className="text-2xl font-extrabold text-white mb-6">Ranking RoboStarter</h1>
          <RankingView />
        </motion.div>
      )}
    </Suspense>
  )
}
