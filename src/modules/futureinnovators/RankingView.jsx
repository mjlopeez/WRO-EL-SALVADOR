import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Users } from 'lucide-react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { CATEGORIES, CATEGORY_META, MAX_SCORE } from './config'

const catColors = {
  elementary: { text: 'text-elementary', bg: 'bg-elementary/10', border: 'border-elementary/30', bar: 'bg-elementary' },
  junior:     { text: 'text-junior',     bg: 'bg-junior/10',     border: 'border-junior/30',     bar: 'bg-junior'     },
  senior:     { text: 'text-senior',     bg: 'bg-senior/10',     border: 'border-senior/30',     bar: 'bg-senior'     },
}

const medals = ['🥇', '🥈', '🥉']
const medalColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

export default function FIRankingView() {
  const [teams, setTeams]   = useState([])
  const [scores, setScores] = useState([])
  const [activeCat, setActiveCat] = useState('elementary')

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'fi_teams'),  snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'fi_scores'), snap => setScores(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2() }
  }, [])

  const scoreMap = Object.fromEntries(scores.map(s => [s.teamId, s]))
  const cc = catColors[activeCat] || catColors.elementary

  const ranked = teams
    .filter(t => t.category === activeCat && scoreMap[t.id]?.total !== undefined)
    .map(t => ({ team: t, total: scoreMap[t.id].total, finalized: scoreMap[t.id].finalized }))
    .sort((a, b) => b.total - a.total)

  const topScore = ranked[0]?.total || 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">Ranking · Future Innovators</h1>
        <p className="text-gray-400 mt-1">Clasificación en tiempo real por categoría</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map(cat => {
          const col = catColors[cat]
          return (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                activeCat === cat
                  ? `${col.bg} ${col.border} ${col.text}`
                  : 'border-dark-500 text-gray-500 hover:border-dark-400'
              }`}
            >
              {CATEGORY_META[cat].label}
            </button>
          )
        })}
      </div>

      {ranked.length === 0 ? (
        <div className="card text-center py-20">
          <Trophy size={48} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Sin evaluaciones en {CATEGORY_META[activeCat].label} todavía.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ranked.map(({ team, total, finalized }, i) => {
            const pct = Math.round((total / MAX_SCORE) * 100)
            const relPct = Math.round((total / topScore) * 100)

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`card ${i < 3 ? `${cc.bg} ${cc.border}` : ''}`}
              >
                <div className="flex items-center gap-3">
                  {/* Position */}
                  <div className="w-8 text-center shrink-0">
                    {i < 3 ? (
                      <span className="text-xl">{medals[i]}</span>
                    ) : (
                      <span className="font-bold text-gray-500 text-sm">#{i + 1}</span>
                    )}
                  </div>

                  {/* Team info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-sm ${i < 3 ? 'text-white' : 'text-gray-300'} truncate`}>
                        {team.name}
                      </p>
                      {!finalized && (
                        <span className="text-xs text-yellow-400/70 shrink-0">borrador</span>
                      )}
                    </div>
                    {team.school && <p className="text-xs text-gray-500 truncate">{team.school}</p>}

                    {/* Bar */}
                    <div className="mt-2 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${cc.bar} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${relPct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                      />
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0 ml-2">
                    <p className={`font-mono font-extrabold text-lg ${i < 3 ? cc.text : 'text-gray-400'}`}>
                      {total}
                    </p>
                    <p className="text-xs text-gray-600">/{MAX_SCORE}</p>
                    <p className="text-xs text-gray-500">{pct}%</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Teams without score */}
      {(() => {
        const unscored = teams.filter(t => t.category === activeCat && !scoreMap[t.id])
        if (!unscored.length) return null
        return (
          <div className="mt-6">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">
              Sin evaluar ({unscored.length})
            </p>
            <div className="space-y-1">
              {unscored.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-dark-700/50">
                  <Users size={14} className="text-gray-600 shrink-0" />
                  <p className="text-sm text-gray-500 truncate">{t.name}</p>
                  {t.school && <p className="text-xs text-gray-600 truncate ml-auto hidden sm:block">{t.school}</p>}
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </motion.div>
  )
}
