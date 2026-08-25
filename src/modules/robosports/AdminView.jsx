import { useState, useEffect, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { Swords, Trophy, Star } from 'lucide-react'

const TeamManagement = lazy(() => import('./TeamManagement'))
const ResultsView    = lazy(() => import('./ResultsView'))
const RankingView    = lazy(() => import('./RankingView'))

const cc = { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', solid: 'bg-sky-500' }
const MEDALS = ['🥇', '🥈', '🥉']

function useStats() {
  const [teams, setTeams] = useState([])
  const [games, setGames] = useState([])

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'rsp_teams'), s => setTeams(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'rsp_matches'), s => setGames(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2() }
  }, [])

  const finalized = games.filter(g => g.finalized)

  // Top 3 por puntos
  const top3 = teams
    .map(team => {
      const myGames = finalized.filter(g => g.teamAId === team.id || g.teamBId === team.id)
      let points = 0, gameWins = 0, matchDiff = 0

      myGames.forEach(g => {
        const isA = g.teamAId === team.id
        points += isA ? (g.pointsA || 0) : (g.pointsB || 0)
        if (g.gameWinner === (isA ? 'A' : 'B')) gameWins++

        const md = Array.isArray(g.matchData) ? g.matchData : []
        md.forEach(m => {
          if (m.winner === (isA ? 'A' : 'B')) matchDiff++
          else if (m.winner !== 'draw') matchDiff--
        })
      })

      return { team, points, gameWins, matchDiff, played: myGames.length }
    })
    .filter(r => r.played > 0)
    .sort((a, b) => b.points - a.points || b.gameWins - a.gameWins || b.matchDiff - a.matchDiff)
    .slice(0, 3)

  return { teams, games, finalized, top3 }
}

function OverviewTab({ setTab }) {
  const { teams, games, finalized, top3 } = useStats()

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">RoboSports 2026</h1>
        <p className="text-gray-400 mt-1">Double Tennis · Categoría Open (11–19 años)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Equipos',     value: teams.length,            sub: 'Open',         color: cc },
          { label: 'Juegos',      value: games.length,            sub: 'registrados',  color: cc },
          { label: 'Finalizados', value: finalized.length,        sub: 'confirmados',  color: cc },
          { label: 'Pendientes',  value: games.length - finalized.length, sub: 'borradores',
            color: { bg: 'bg-dark-700', border: 'border-dark-500', text: 'text-gray-300' } },
        ].map((s, i) => (
          <div key={i} className={`card ${s.color.bg} ${s.color.border}`}>
            <p className={`font-extrabold text-2xl ${s.color.text}`}>{s.value}</p>
            <p className="text-xs font-semibold text-gray-300">{s.label}</p>
            <p className="text-xs text-gray-600">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Top 3 */}
      <div className={`card ${cc.bg} ${cc.border} mb-5`}>
        <div className="flex items-center gap-2 mb-4">
          <Star size={14} className={cc.text} />
          <span className={`text-xs font-bold uppercase tracking-wide ${cc.text}`}>Clasificación actual</span>
        </div>
        {top3.length === 0 ? (
          <p className="text-gray-600 text-sm">Sin juegos finalizados aún.</p>
        ) : (
          <div className="space-y-3">
            {top3.map((r, i) => (
              <div key={r.team.id} className="flex items-center gap-3">
                <span className="text-xl w-7 text-center">{MEDALS[i]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{r.team.name}</p>
                  {r.team.institution && <p className="text-xs text-gray-500 truncate">{r.team.institution}</p>}
                </div>
                <div className="text-right">
                  <p className={`font-bold ${cc.text} text-sm`}>{r.points} pts</p>
                  <p className="text-xs text-gray-600">{r.gameWins} vic. · dif {r.matchDiff >= 0 ? '+' : ''}{r.matchDiff}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setTab('ranking')} className={`mt-4 text-xs ${cc.text} hover:underline`}>
          Ver ranking completo →
        </button>
      </div>

      {/* Reglas */}
      <div className="card bg-dark-700">
        <p className="font-bold text-white text-sm mb-2">⚽ Sobre RoboSports — WRO 2026</p>
        <div className="text-xs text-gray-400 space-y-1">
          <p>• Disciplina: <strong className="text-white">Double Tennis</strong> — 2 robots por equipo, categoría Open.</p>
          <p>• Cada juego = 3 partidos. Gana el juego quien gane más partidos.</p>
          <p>• Puntuación por partido: 🟠 naranja +1, 🟣 morada −2. <strong className="text-white">Menor puntaje gana.</strong></p>
          <p>• Forfeit: infractor queda con puntaje 9, rival con −4.</p>
          <p>• Puntos de juego: Victoria = 3, Empate = 1, Derrota = 0.</p>
          <p>• Ranking: puntos → victorias de juego → diferencia de partidos → partidos ganados.</p>
        </div>
      </div>
    </motion.div>
  )
}

function LoadingView() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-10 h-10 border-4 border-dark-500 border-t-sky-500 rounded-full animate-spin" />
    </div>
  )
}

export default function RSPAdminView({ tab, setTab }) {
  return (
    <Suspense fallback={<LoadingView />}>
      {tab === 'overview'    && <OverviewTab setTab={setTab} />}
      {tab === 'equipos'     && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <h1 className="text-2xl font-extrabold text-white mb-6">Equipos RoboSports</h1>
          <TeamManagement />
        </motion.div>
      )}
      {tab === 'resultados'  && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <h1 className="text-2xl font-extrabold text-white mb-6">Juegos RoboSports</h1>
          <ResultsView />
        </motion.div>
      )}
      {tab === 'ranking'     && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <h1 className="text-2xl font-extrabold text-white mb-6">Ranking RoboSports</h1>
          <RankingView />
        </motion.div>
      )}
    </Suspense>
  )
}
