import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'

const cc = { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400' }
const MEDALS = ['🥇', '🥈', '🥉']

function useRanking() {
  const [teams, setTeams] = useState([])
  const [games, setGames] = useState([])

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'rsp_teams'), s =>
      setTeams(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'rsp_matches'), s =>
      setGames(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(g => g.finalized)))
    return () => { u1(); u2() }
  }, [])

  return teams
    .map(team => {
      const myGames = games.filter(g => g.teamAId === team.id || g.teamBId === team.id)
      let points = 0, gameWins = 0, gameLosses = 0, gameDraws = 0
      let matchesWon = 0, matchesLost = 0, matchesDrawn = 0

      myGames.forEach(g => {
        const isA = g.teamAId === team.id
        points += isA ? (g.pointsA || 0) : (g.pointsB || 0)

        const gw = g.gameWinner
        if (gw === (isA ? 'A' : 'B')) gameWins++
        else if (gw === 'draw') gameDraws++
        else gameLosses++

        const md = Array.isArray(g.matchData) ? g.matchData : []
        md.forEach(m => {
          const side = isA ? 'A' : 'B'
          if (m.winner === side) matchesWon++
          else if (m.winner === 'draw') matchesDrawn++
          else matchesLost++
        })
      })

      return {
        team,
        gamesPlayed: myGames.length,
        points,
        gameWins, gameLosses, gameDraws,
        matchesWon, matchesLost,
        matchDiff: matchesWon - matchesLost,
      }
    })
    .filter(r => r.gamesPlayed > 0)
    .sort((a, b) =>
      b.points      - a.points      ||
      b.gameWins    - a.gameWins    ||
      b.matchDiff   - a.matchDiff   ||
      b.matchesWon  - a.matchesWon
    )
}

export default function RSPRankingView() {
  const ranking = useRanking()

  return (
    <div className="space-y-4">
      {/* Criterios */}
      <div className={`card ${cc.bg} ${cc.border}`}>
        <p className="text-xs text-gray-400 mb-1">Criterio de clasificación (WRO 2026)</p>
        <p className="text-sm text-gray-300">
          1. Puntos acumulados (V=3, E=1, D=0) · 2. Victorias de juego · 3. Diferencia de partidos · 4. Partidos ganados
        </p>
      </div>

      {ranking.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-sm">Sin juegos finalizados aún.</p>
        </div>
      ) : (
        <>
          {/* Cabecera tabla */}
          <div className="hidden md:grid grid-cols-[2rem_1fr_4rem_4rem_4rem_5rem_5rem] gap-3 px-4 text-xs text-gray-600 font-semibold uppercase tracking-wider">
            <span>#</span>
            <span>Equipo</span>
            <span className="text-center">JJ</span>
            <span className="text-center">PTS</span>
            <span className="text-center">V-E-D</span>
            <span className="text-center">Part. G/P</span>
            <span className="text-center">Dif.</span>
          </div>

          <div className="space-y-2">
            {ranking.map((r, i) => (
              <motion.div key={r.team.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`card ${i < 3 ? `${cc.bg} ${cc.border}` : ''}`}>

                {/* Mobile */}
                <div className="flex items-center gap-4 md:hidden">
                  <div className="w-10 text-center shrink-0">
                    {MEDALS[i]
                      ? <span className="text-2xl">{MEDALS[i]}</span>
                      : <span className="font-mono font-bold text-gray-500 text-lg">{i + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{r.team.name}</p>
                    {r.team.institution && <p className="text-xs text-gray-500 truncate">{r.team.institution}</p>}
                    <p className="text-xs text-gray-600 mt-0.5">
                      {r.gamesPlayed} juegos · {r.gameWins}V {r.gameDraws}E {r.gameLosses}D · partidos {r.matchesWon}/{r.matchesLost}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-mono font-extrabold text-2xl ${i < 3 ? cc.text : 'text-white'}`}>{r.points}</p>
                    <p className="text-xs text-gray-500">pts</p>
                    <p className={`text-xs font-semibold ${r.matchDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.matchDiff >= 0 ? '+' : ''}{r.matchDiff}
                    </p>
                  </div>
                </div>

                {/* Desktop */}
                <div className="hidden md:grid grid-cols-[2rem_1fr_4rem_4rem_4rem_5rem_5rem] gap-3 items-center">
                  <div className="text-center">
                    {MEDALS[i]
                      ? <span className="text-xl">{MEDALS[i]}</span>
                      : <span className="font-mono font-bold text-gray-500">{i + 1}</span>}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm truncate">{r.team.name}</p>
                    {r.team.institution && <p className="text-xs text-gray-500 truncate">{r.team.institution}</p>}
                  </div>
                  <span className="text-center text-sm text-gray-400">{r.gamesPlayed}</span>
                  <span className={`text-center font-extrabold text-lg ${i < 3 ? cc.text : 'text-white'}`}>{r.points}</span>
                  <span className="text-center text-xs text-gray-400">{r.gameWins}-{r.gameDraws}-{r.gameLosses}</span>
                  <span className="text-center text-sm text-gray-300">{r.matchesWon}/{r.matchesLost}</span>
                  <span className={`text-center font-semibold ${r.matchDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.matchDiff >= 0 ? '+' : ''}{r.matchDiff}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
