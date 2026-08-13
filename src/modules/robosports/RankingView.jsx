import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'

const cc = { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', solid: 'bg-sky-500' }
const MEDALS = ['🥇', '🥈', '🥉']

function useRanking() {
  const [teams, setTeams]     = useState([])
  const [matches, setMatches] = useState([])

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'rsp_teams'),   s => setTeams(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'rsp_matches'), s => setMatches(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.finalized)))
    return () => { u1(); u2() }
  }, [])

  return teams
    .map(team => {
      const teamMatches = matches.filter(m => m.teamAId === team.id || m.teamBId === team.id)
      let wins = 0, losses = 0, setsWon = 0, setsLost = 0

      teamMatches.forEach(m => {
        const isA = m.teamAId === team.id
        const mysets   = isA ? m.setsA : m.setsB
        const oppsets  = isA ? m.setsB : m.setsA
        setsWon  += mysets
        setsLost += oppsets
        if (m.winner === (isA ? 'A' : 'B')) wins++
        else losses++
      })

      return {
        team,
        played: teamMatches.length,
        wins, losses,
        setsWon, setsLost,
        setDiff: setsWon - setsLost,
      }
    })
    .filter(r => r.played > 0)
    .sort((a, b) =>
      b.wins - a.wins ||
      b.setDiff - a.setDiff ||
      b.setsWon - a.setsWon
    )
}

export default function RSPRankingView() {
  const ranking = useRanking()

  return (
    <div className="space-y-4">
      {/* Criteria */}
      <div className={`card ${cc.bg} ${cc.border}`}>
        <p className="text-xs text-gray-400 mb-1">Criterio de clasificación</p>
        <p className="text-sm text-gray-300">
          1. Victorias · 2. Diferencia de sets · 3. Sets ganados totales (solo partidos finalizados)
        </p>
      </div>

      {ranking.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-sm">Sin partidos finalizados aún.</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2rem_1fr_4rem_4rem_5rem_5rem_5rem] gap-3 px-4 text-xs text-gray-600 font-semibold uppercase tracking-wider">
            <span>#</span>
            <span>Equipo</span>
            <span className="text-center">PJ</span>
            <span className="text-center">G</span>
            <span className="text-center">Sets G/P</span>
            <span className="text-center">Dif.</span>
            <span className="text-center">Sets G</span>
          </div>

          <div className="space-y-2">
            {ranking.map((r, i) => (
              <motion.div key={r.team.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`card ${i < 3 ? `${cc.bg} ${cc.border}` : ''}`}>
                {/* Mobile layout */}
                <div className="flex items-center gap-4 md:hidden">
                  <div className="w-10 text-center shrink-0">
                    {MEDALS[i] ? <span className="text-2xl">{MEDALS[i]}</span>
                      : <span className="font-mono font-bold text-gray-500 text-lg">{i + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{r.team.name}</p>
                    {r.team.institution && <p className="text-xs text-gray-500 truncate">{r.team.institution}</p>}
                    <p className="text-xs text-gray-600 mt-0.5">
                      {r.played} partidos · {r.wins}V {r.losses}D · Sets {r.setsWon}/{r.setsLost}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-mono font-extrabold text-2xl ${i < 3 ? cc.text : 'text-white'}`}>{r.wins}V</p>
                    <p className={`text-xs font-semibold ${r.setDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.setDiff >= 0 ? '+' : ''}{r.setDiff}
                    </p>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden md:grid grid-cols-[2rem_1fr_4rem_4rem_5rem_5rem_5rem] gap-3 items-center">
                  <div className="text-center">
                    {MEDALS[i] ? <span className="text-xl">{MEDALS[i]}</span>
                      : <span className="font-mono font-bold text-gray-500">{i + 1}</span>}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm truncate">{r.team.name}</p>
                    {r.team.institution && <p className="text-xs text-gray-500 truncate">{r.team.institution}</p>}
                  </div>
                  <span className="text-center text-sm text-gray-400">{r.played}</span>
                  <span className={`text-center font-bold ${cc.text}`}>{r.wins}</span>
                  <span className="text-center text-sm text-gray-300">{r.setsWon}/{r.setsLost}</span>
                  <span className={`text-center font-semibold ${r.setDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.setDiff >= 0 ? '+' : ''}{r.setDiff}
                  </span>
                  <span className={`text-center font-mono font-bold ${cc.text}`}>{r.setsWon}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
