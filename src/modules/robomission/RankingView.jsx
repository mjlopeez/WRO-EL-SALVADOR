import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, TrendingUp, Users } from 'lucide-react'
import { collection, onSnapshot, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { ELEMENTARY_MAX, JUNIOR_MAX, SENIOR_MAX } from './scoringData'

const CATS = ['elementary', 'junior', 'senior']
const MAX_MAP = { elementary: ELEMENTARY_MAX, junior: JUNIOR_MAX, senior: SENIOR_MAX }

const catColors = {
  elementary: { bg: 'bg-elementary/10', border: 'border-elementary/30', text: 'text-elementary' },
  junior:     { bg: 'bg-junior/10',     border: 'border-junior/30',     text: 'text-junior'     },
  senior:     { bg: 'bg-senior/10',     border: 'border-senior/30',     text: 'text-senior'     },
}

function useRankingData(category) {
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    // Listen to teams
    const unsub = onSnapshot(collection(db, 'rm_teams'), async teamsSnap => {
      const teams = teamsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(t => t.category === category)

      // Fetch all scores for this category's teams
      const scoresSnap = await getDocs(collection(db, 'rm_scores'))
      const scores = scoresSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Build ranking
      const ranked = teams.map(team => {
        const teamScores = scores.filter(s => s.teamId === team.id)
        const rounds = [1, 2, 3].map(r => {
          const s = teamScores.find(x => x.round === r)
          return s ? s.total || 0 : null
        })
        const validRounds = rounds.filter(r => r !== null)
        const best = validRounds.length > 0 ? Math.max(...validRounds) : 0
        const total = rounds.reduce((acc, r) => acc + (r || 0), 0)
        return { ...team, rounds, best, total }
      })

      ranked.sort((a, b) => b.total - a.total || b.best - a.best)
      setRanking(ranked)
      setLoading(false)
    })

    return unsub
  }, [category])

  return { ranking, loading }
}

function CategoryRanking({ category }) {
  const { ranking, loading } = useRankingData(category)
  const max = MAX_MAP[category]
  const cc = catColors[category]
  const medals = ['🥇', '🥈', '🥉']

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-7 h-7 border-3 border-dark-500 border-t-orange-500 rounded-full animate-spin" />
    </div>
  )

  if (ranking.length === 0) return (
    <div className="card text-center py-10">
      <Users size={36} className="text-gray-600 mx-auto mb-2" />
      <p className="text-gray-400 text-sm">Sin equipos en {category}.</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {ranking.map((team, idx) => (
        <motion.div
          key={team.id}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.04 }}
          className={`flex items-center gap-4 rounded-2xl px-4 py-3 border ${
            idx === 0 ? `${cc.bg} ${cc.border}` :
            idx < 3 ? 'bg-dark-700 border-dark-500' :
            'bg-dark-800 border-dark-600 opacity-80'
          }`}
        >
          {/* Position */}
          <div className="w-8 text-center shrink-0">
            {idx < 3
              ? <span className="text-xl">{medals[idx]}</span>
              : <span className="font-mono text-gray-500 text-sm font-bold">{idx + 1}</span>
            }
          </div>

          {/* Avatar */}
          <div className={`w-9 h-9 rounded-xl ${cc.bg} border ${cc.border} flex items-center justify-center font-bold text-sm shrink-0 ${cc.text}`}>
            {team.number || team.name?.[0]?.toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm truncate">{team.name}</p>
            {team.school && <p className="text-xs text-gray-500 truncate">{team.school}</p>}
          </div>

          {/* Round scores */}
          <div className="hidden sm:flex gap-1 shrink-0">
            {team.rounds.map((r, ri) => (
              <div key={ri} className="text-center w-10">
                <p className="text-xs text-gray-500">R{ri + 1}</p>
                <p className={`text-sm font-mono font-bold ${r !== null ? 'text-gray-200' : 'text-gray-600'}`}>
                  {r !== null ? r : '–'}
                </p>
              </div>
            ))}
          </div>

          {/* Score bar + total */}
          <div className="w-28 shrink-0">
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-500">total</span>
              <span className={`font-mono font-bold ${cc.text}`}>{team.total}</span>
            </div>
            <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${cc.bg.replace('/10', '/60')}`}
                initial={{ width: 0 }}
                animate={{ width: `${(team.total / (max * 3)) * 100}%` }}
                transition={{ duration: 0.7, delay: idx * 0.04 + 0.2 }}
              />
            </div>
            <div className="flex justify-between text-xs mt-0.5">
              <span className="text-gray-600">mejor</span>
              <span className="font-mono text-gray-500">{team.best}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default function RankingView() {
  const [activeTab, setActiveTab] = useState('elementary')

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <Trophy size={22} className="text-orange-400" />
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">Ranking · RoboMission</h1>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6">
        {CATS.map(c => {
          const cc = catColors[c]
          return (
            <button key={c} onClick={() => setActiveTab(c)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all capitalize ${
                activeTab === c ? `${cc.bg} ${cc.border} ${cc.text}` : 'border-dark-500 text-gray-500 hover:border-dark-400'
              }`}
            >
              {c}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <TrendingUp size={14} />
        Clasificado por suma total de las 3 rondas
      </div>

      <CategoryRanking category={activeTab} />
    </motion.div>
  )
}
