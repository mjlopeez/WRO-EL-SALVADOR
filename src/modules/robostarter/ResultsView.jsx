import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { CATEGORIES, CATEGORY_META, ROUNDS, MISSION_MAX, DOC_MAX, DOC_RUBRIC } from './config'

const catColors = {
  elementary: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', badge: 'bg-green-500' },
  junior:     { bg: 'bg-lime-500/10',  border: 'border-lime-500/30',  text: 'text-lime-400',  badge: 'bg-lime-500'  },
}

const TOTAL_MAX = MISSION_MAX + DOC_MAX

export default function RSResultsView() {
  const [teams, setTeams]   = useState([])
  const [scores, setScores] = useState([])
  const [catTab, setCatTab] = useState(CATEGORIES[0])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'rs_teams'), snap => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    const unsub2 = onSnapshot(collection(db, 'rs_scores'), snap => {
      setScores(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => { unsub1(); unsub2() }
  }, [])

  const catTeams = teams.filter(t => t.category === catTab)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const getScores = (teamId) =>
    ROUNDS.reduce((acc, r) => {
      const s = scores.find(sc => sc.id === `${teamId}_r${r}`)
      acc[r] = s || null
      return acc
    }, {})

  const cc = catColors[catTab] || catColors.elementary
  const meta = CATEGORY_META[catTab] || {}

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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-dark-500 border-t-green-500 rounded-full animate-spin" />
        </div>
      ) : catTeams.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-sm">Sin equipos en {meta.label || catTab}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {catTeams.map((team, i) => {
            const roundScores = getScores(team.id)
            return (
              <motion.div key={team.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }} className="card">
                {/* Team header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl ${cc.bg} border ${cc.border} flex items-center justify-center font-bold ${cc.text} text-sm shrink-0`}>
                    {team.number || team.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{team.name}</p>
                    {team.institution && <p className="text-xs text-gray-500 truncate">{team.institution}</p>}
                  </div>
                </div>

                {/* Per-round scores */}
                <div className="grid grid-cols-3 gap-2">
                  {ROUNDS.map(r => {
                    const s = roundScores[r]
                    const hasScore = !!s
                    return (
                      <div key={r} className={`rounded-xl p-2.5 border text-center ${
                        hasScore ? `${cc.bg} ${cc.border}` : 'bg-dark-700 border-dark-600'
                      }`}>
                        <p className="text-xs text-gray-500 mb-1">Ronda {r}</p>
                        {hasScore ? (
                          <>
                            <p className={`font-mono font-bold text-lg ${cc.text}`}>{s.total}</p>
                            <p className="text-xs text-gray-600">mis: {s.missionScore} · doc: {s.docTotal}</p>
                            {s.finalized && (
                              <span className="text-xs text-green-400 font-semibold">✓ finalizado</span>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-600 text-xs mt-1">—</p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Best score highlight */}
                {Object.values(roundScores).some(Boolean) && (() => {
                  const best = Math.max(...ROUNDS.map(r => roundScores[r]?.total ?? 0))
                  const pct  = Math.round((best / TOTAL_MAX) * 100)
                  return (
                    <div className="mt-3 pt-3 border-t border-dark-600">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Mejor ronda</span>
                        <span className={`font-mono font-bold ${cc.text}`}>{best} / {TOTAL_MAX}</span>
                      </div>
                      <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
                        <motion.div className={`h-full ${cc.badge} rounded-full`}
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: i * 0.05 }} />
                      </div>
                    </div>
                  )
                })()}

                {/* Doc rubric detail (collapsible) */}
                {ROUNDS.map(r => {
                  const s = roundScores[r]
                  if (!s?.docScores || !Object.keys(s.docScores).length) return null
                  return (
                    <details key={r} className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400">
                        Ver rúbrica Ronda {r}
                      </summary>
                      <div className="mt-2 pl-2 space-y-1">
                        {DOC_RUBRIC.map(c => (
                          <div key={c.id} className="flex justify-between text-xs">
                            <span className="text-gray-500">{c.label}</span>
                            <span className={`${cc.text} font-mono`}>{s.docScores[c.id] ?? 0}/{c.maxPts}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )
                })}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
