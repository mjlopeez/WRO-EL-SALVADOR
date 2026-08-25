import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { CATEGORIES, CATEGORY_META, ROUNDS, MISSION_MAX, DOC_MAX } from './config'

const catColors = {
  elementary: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', solid: 'bg-green-500' },
  junior:     { bg: 'bg-lime-500/10',  border: 'border-lime-500/30',  text: 'text-lime-400',  solid: 'bg-lime-500'  },
}

const MEDALS = ['🥇', '🥈', '🥉']
const TOTAL_MAX = MISSION_MAX + DOC_MAX
const SUM_MAX   = TOTAL_MAX * 3   // máximo posible sumando las 3 rondas

function useRanking() {
  const [teams, setTeams]   = useState([])
  const [scores, setScores] = useState([])

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'rs_teams'),  s => setTeams(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'rs_scores'), s => setScores(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2() }
  }, [])

  // Rank by sum of all rounds; tiebreak by best single round
  return CATEGORIES.reduce((acc, cat) => {
    const catTeams = teams.filter(t => t.category === cat)
    acc[cat] = catTeams
      .map(team => {
        const ts   = scores.filter(s => s.teamId === team.id)
        const best = ts.length ? Math.max(...ts.map(s => s.total ?? 0)) : null
        const sum  = ts.reduce((a, s) => a + (s.total ?? 0), 0)
        return { team, best, sum, rounds: ts.length }
      })
      .filter(r => r.best !== null)
      .sort((a, b) => b.sum - a.sum || b.best - a.best)
    return acc
  }, {})
}

export default function RSRankingView() {
  const [catTab, setCatTab] = useState(CATEGORIES[0])
  const ranking = useRanking()
  const ranked  = ranking[catTab] || []
  const cc      = catColors[catTab] || catColors.elementary
  const meta    = CATEGORY_META[catTab] || {}

  return (
    <div className="space-y-5">
      {/* Category tabs */}
      <div className="flex gap-2 bg-dark-700 p-1 rounded-xl w-fit">
        {CATEGORIES.map(cat => {
          const c = catColors[cat]
          return (
            <button key={cat} onClick={() => setCatTab(cat)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                catTab === cat ? `bg-dark-600 ${c.text}` : 'text-gray-500 hover:text-gray-300'
              }`}>
              {CATEGORY_META[cat]?.label || cat}
            </button>
          )
        })}
      </div>

      {/* Header info */}
      <div className={`card ${cc.bg} ${cc.border}`}>
        <p className="text-xs text-gray-400 mb-1">Criterio de clasificación</p>
        <p className="text-sm text-gray-300">
          Suma de las 3 rondas (máx. {SUM_MAX} pts). Desempate por mejor ronda individual.
        </p>
      </div>

      {ranked.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-sm">Sin puntajes en {meta.label || catTab}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ranked.map((r, i) => {
            const pct = Math.round((r.sum / SUM_MAX) * 100)
            const medal = MEDALS[i]
            return (
              <motion.div key={r.team.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`card ${i < 3 ? `${cc.bg} ${cc.border}` : ''}`}>
                <div className="flex items-center gap-4">
                  {/* Position */}
                  <div className="w-10 text-center shrink-0">
                    {medal
                      ? <span className="text-2xl">{medal}</span>
                      : <span className="font-mono font-bold text-gray-500 text-lg">{i + 1}</span>
                    }
                  </div>

                  {/* Team info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white text-sm">{r.team.name}</p>
                      {r.team.number && <span className="text-xs text-gray-500">#{r.team.number}</span>}
                    </div>
                    {r.team.institution && <p className="text-xs text-gray-500 truncate">{r.team.institution}</p>}
                    <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden mt-1.5">
                      <motion.div className={`h-full ${cc.solid} rounded-full`}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }} />
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <p className={`font-mono font-extrabold text-2xl ${i < 3 ? cc.text : 'text-white'}`}>{r.sum}</p>
                    <p className="text-xs text-gray-500">/ {SUM_MAX}</p>
                    <p className="text-xs text-gray-600 mt-0.5">mejor: {r.best}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
