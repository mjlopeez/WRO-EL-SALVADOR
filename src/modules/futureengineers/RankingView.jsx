import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { MAX_SCORE } from './config'

const MEDALS = ['🥇', '🥈', '🥉']

export default function FERankingView() {
  const [teams, setTeams]   = useState([])
  const [scores, setScores] = useState([])

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'fe_teams'),  snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'fe_scores'), snap => setScores(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2() }
  }, [])

  const scoreMap = {}
  for (const s of scores) {
    if (!scoreMap[s.teamId]) scoreMap[s.teamId] = s
  }

  const ranked = teams
    .filter(t => scoreMap[t.id]?.total !== undefined)
    .map(t => ({ team: t, total: scoreMap[t.id].total, finalized: scoreMap[t.id].finalized }))
    .sort((a, b) => b.total - a.total)

  const unscored = teams.filter(t => !scoreMap[t.id]?.total === undefined || !scoreMap[t.id])

  const best = ranked[0]?.total || MAX_SCORE

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">Ranking · Future Engineers</h1>
        <p className="text-gray-400 mt-1">{ranked.length} equipos clasificados · {teams.length} total</p>
      </div>

      {ranked.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-3">🏎️</p>
          <p className="text-gray-400">Aún no hay evaluaciones finalizadas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ranked.map(({ team, total, finalized }, i) => {
            const pct = Math.round((total / best) * 100)
            const isTop3 = i < 3
            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`card overflow-hidden ${isTop3 ? 'border-teal-500/30 bg-teal-500/5' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    {isTop3
                      ? <span className="text-2xl">{MEDALS[i]}</span>
                      : <span className="font-mono font-bold text-gray-500 text-sm">#{i + 1}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${isTop3 ? 'text-white' : 'text-gray-200'}`}>{team.name}</p>
                    {team.school && <p className="text-xs text-gray-500 truncate">{team.school}</p>}
                    <div className="mt-1.5 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-teal-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: i * 0.04 + 0.2, duration: 0.5 }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-teal-400">{total}</p>
                    <p className="text-xs text-gray-600">/{MAX_SCORE}</p>
                    {!finalized && <p className="text-xs text-yellow-500 mt-0.5">borrador</p>}
                  </div>
                </div>
              </motion.div>
            )
          })}

          {/* Unscored teams */}
          {teams.filter(t => !scoreMap[t.id]).map((team, i) => (
            <motion.div key={team.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ranked.length * 0.04 + i * 0.03 }}
              className="card opacity-40 flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <span className="font-mono text-gray-600 text-sm">—</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-400 text-sm truncate">{team.name}</p>
                {team.school && <p className="text-xs text-gray-600 truncate">{team.school}</p>}
              </div>
              <span className="text-xs text-gray-600">Sin evaluar</span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
