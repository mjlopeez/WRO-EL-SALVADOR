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
  const [teams, setTeams]     = useState([])
  const [matches, setMatches] = useState([])

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'rsp_teams'),   s => setTeams(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'rsp_matches'), s => setMatches(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2() }
  }, [])

  const finalized = matches.filter(m => m.finalized)

  // Top 3 by wins
  const top3 = teams
    .map(team => {
      const tm = finalized.filter(m => m.teamAId === team.id || m.teamBId === team.id)
      const wins = tm.filter(m => m.winner === (m.teamAId === team.id ? 'A' : 'B')).length
      const setsWon = tm.reduce((acc, m) => acc + (m.teamAId === team.id ? m.setsA : m.setsB), 0)
      const setsLost = tm.reduce((acc, m) => acc + (m.teamAId === team.id ? m.setsB : m.setsA), 0)
      return { team, wins, setsWon, setDiff: setsWon - setsLost, played: tm.length }
    })
    .filter(r => r.played > 0)
    .sort((a, b) => b.wins - a.wins || b.setDiff - a.setDiff)
    .slice(0, 3)

  return { teams, matches, finalized, top3 }
}

function OverviewTab({ setTab }) {
  const { teams, matches, finalized, top3 } = useStats()

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">RoboSports 2026</h1>
        <p className="text-gray-400 mt-1">Double Tennis · Categoría Open (11–19 años)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Equipos', value: teams.length, sub: 'Open', color: cc },
          { label: 'Partidos',  value: matches.length,   sub: 'registrados', color: cc },
          { label: 'Finalizados', value: finalized.length, sub: 'confirmados', color: cc },
          { label: 'Pendientes', value: matches.length - finalized.length, sub: 'borradores',
            color: { bg:'bg-dark-700', border:'border-dark-500', text:'text-gray-300' } },
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
          <p className="text-gray-600 text-sm">Sin partidos finalizados aún.</p>
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
                  <p className={`font-bold ${cc.text} text-sm`}>{r.wins} victorias</p>
                  <p className="text-xs text-gray-600">{r.setDiff >= 0 ? '+' : ''}{r.setDiff} sets</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setTab('ranking')} className={`mt-4 text-xs ${cc.text} hover:underline`}>
          Ver ranking completo →
        </button>
      </div>

      {/* Rules */}
      <div className="card bg-dark-700">
        <p className="font-bold text-white text-sm mb-2">⚽ Sobre RoboSports</p>
        <div className="text-xs text-gray-400 space-y-1">
          <p>• Disciplina: <strong className="text-white">Double Tennis</strong> — 2 robots por equipo.</p>
          <p>• Categoría única: <strong className="text-white">Open</strong>, 11–19 años.</p>
          <p>• Formato: mejor de 3 sets por partido. Gana el primero en llegar a 2 sets.</p>
          <p>• Ranking: victorias → diferencia de sets → sets ganados totales.</p>
          <p>• Solo se cuentan partidos <strong className="text-white">finalizados</strong> en el ranking.</p>
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
      {tab === 'overview'   && <OverviewTab setTab={setTab} />}
      {tab === 'equipos'    && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <h1 className="text-2xl font-extrabold text-white mb-6">Equipos RoboSports</h1>
          <TeamManagement />
        </motion.div>
      )}
      {tab === 'resultados' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <h1 className="text-2xl font-extrabold text-white mb-6">Partidos RoboSports</h1>
          <ResultsView />
        </motion.div>
      )}
      {tab === 'ranking'    && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <h1 className="text-2xl font-extrabold text-white mb-6">Ranking RoboSports</h1>
          <RankingView />
        </motion.div>
      )}
    </Suspense>
  )
}
