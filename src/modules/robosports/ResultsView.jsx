import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { Swords, Upload, CheckCircle, ChevronDown, ChevronUp, AlertTriangle, Unlock, Trash2 } from 'lucide-react'
import { ROUNDS, calcGameResult } from './config'

const cc = { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400' }

function MatchRow({ match, idx }) {
  const { orangeA, purpleA, scoreA, orangeB, purpleB, scoreB, winner, forfeit } = match
  const winA = winner === 'A', winB = winner === 'B'
  return (
    <div className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg ${forfeit ? 'bg-red-500/5' : 'bg-dark-800'}`}>
      <span className="text-gray-600 w-14 shrink-0">P{idx + 1}{forfeit ? ' ⚠️' : ''}</span>
      {/* A */}
      <span className={`flex-1 text-right font-mono ${winA ? 'text-green-400 font-bold' : 'text-gray-500'}`}>
        🟠{orangeA} 🟣{purpleA}
        <span className={`ml-1 font-extrabold ${winA ? 'text-green-400' : 'text-gray-400'}`}>({scoreA >= 0 ? '+' : ''}{scoreA})</span>
      </span>
      <span className={`w-10 text-center font-bold text-xs shrink-0 ${
        winA ? 'text-green-400' : winB ? 'text-red-400' : 'text-gray-600'
      }`}>
        {winA ? 'A' : winB ? 'B' : '='}
      </span>
      <span className={`flex-1 font-mono ${winB ? 'text-green-400 font-bold' : 'text-gray-500'}`}>
        <span className={`mr-1 font-extrabold ${winB ? 'text-green-400' : 'text-gray-400'}`}>({scoreB >= 0 ? '+' : ''}{scoreB})</span>
        🟠{orangeB} 🟣{purpleB}
      </span>
    </div>
  )
}

function GameCard({ game, i, getTeamName }) {
  const [expanded, setExpanded] = useState(false)
  const nameA = game.teamAName || getTeamName(game.teamAId)
  const nameB = game.teamBName || getTeamName(game.teamBId)

  const handleUnlock = async () => {
    if (!confirm('¿Reabrir este juego para que el árbitro pueda editar?')) return
    await updateDoc(doc(db, 'rsp_matches', game.id), { finalized: false })
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar el juego "${nameA} vs ${nameB}"? Esta acción es permanente.`)) return
    await deleteDoc(doc(db, 'rsp_matches', game.id))
  }
  const gw = game.gameWinner
  const hasForfeit = Array.isArray(game.matchData) && game.matchData.some(m => m.forfeit)

  return (
    <motion.div key={game.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }} className="card space-y-3">

      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-dark-600 border border-dark-500 text-gray-500">{game.round}</span>
        {game.finalized
          ? <span className="text-xs text-green-400 font-semibold">✓ finalizado</span>
          : <span className="text-xs text-yellow-500 font-semibold">borrador</span>}
        {hasForfeit && <span className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={10} /> forfeit</span>}
        {game.judgeName && <span className="text-xs text-gray-600 ml-auto">Árbitro: {game.judgeName}</span>}
      </div>

      {/* Marcador de juego */}
      <div className="flex items-center gap-3">
        <div className={`flex-1 text-right ${gw === 'A' ? 'text-green-400' : 'text-gray-300'}`}>
          <p className={`font-bold text-sm truncate ${gw === 'A' ? 'text-green-400' : ''}`}>{nameA}</p>
          {gw === 'A' && <p className="text-xs font-semibold">🏆 +3 pts</p>}
          {gw === 'draw' && <p className="text-xs text-yellow-400 font-semibold">+1 pt</p>}
          {gw === 'B' && <p className="text-xs text-gray-600 font-semibold">+0 pts</p>}
        </div>

        <div className={`flex items-center gap-2 shrink-0 px-4 py-2 rounded-xl border ${cc.bg} ${cc.border}`}>
          <span className={`font-mono font-extrabold text-2xl ${gw === 'A' ? 'text-green-400' : cc.text}`}>{game.winsA ?? '?'}</span>
          <span className="text-gray-600 text-lg">—</span>
          <span className={`font-mono font-extrabold text-2xl ${gw === 'B' ? 'text-green-400' : cc.text}`}>{game.winsB ?? '?'}</span>
        </div>

        <div className={`flex-1 ${gw === 'B' ? 'text-green-400' : 'text-gray-300'}`}>
          <p className={`font-bold text-sm truncate ${gw === 'B' ? 'text-green-400' : ''}`}>{nameB}</p>
          {gw === 'B' && <p className="text-xs font-semibold">🏆 +3 pts</p>}
          {gw === 'draw' && <p className="text-xs text-yellow-400 font-semibold">+1 pt</p>}
          {gw === 'A' && <p className="text-xs text-gray-600 font-semibold">+0 pts</p>}
        </div>
      </div>

      {/* Detalle de 3 partidos */}
      {Array.isArray(game.matchData) && game.matchData.length > 0 && (
        <>
          <button onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Ocultar partidos' : 'Ver detalle de partidos'}
          </button>
          {expanded && (
            <div className="space-y-1 pt-1 border-t border-dark-600">
              <div className="flex text-xs text-gray-700 px-2 mb-1">
                <span className="w-14 shrink-0" />
                <span className="flex-1 text-right">{nameA}</span>
                <span className="w-10 shrink-0" />
                <span className="flex-1">{nameB}</span>
              </div>
              {game.matchData.map((m, idx) => <MatchRow key={idx} match={m} idx={idx} />)}
            </div>
          )}
        </>
      )}

      {/* Admin actions */}
      <div className="flex gap-2 pt-1 border-t border-dark-700 mt-1">
        {game.finalized && (
          <button
            onClick={handleUnlock}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
          >
            <Unlock size={12} /> Reabrir
          </button>
        )}
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors ml-auto"
        >
          <Trash2 size={12} /> Eliminar
        </button>
      </div>
    </motion.div>
  )
}

export default function RSPResultsView() {
  const [teams, setTeams]     = useState([])
  const [games, setGames]     = useState([])
  const [loading, setLoading] = useState(true)
  const [roundTab, setRoundTab] = useState('all')
  const [publishing, setPublishing] = useState(false)
  const [publishMsg, setPublishMsg] = useState(null)

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'rsp_teams'), s => setTeams(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'rsp_matches'), s => {
      setGames(s.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => { u1(); u2() }
  }, [])

  const getTeamName = id => teams.find(t => t.id === id)?.name || id

  const filtered = roundTab === 'all' ? games : games.filter(g => g.round === roundTab)
  const sorted   = [...filtered].sort((a, b) => (b.recordedAt?.seconds || 0) - (a.recordedAt?.seconds || 0))

  const handlePublish = async () => {
    if (!confirm('¿Publicar el ranking actual en la pantalla pública?')) return
    setPublishing(true); setPublishMsg(null)
    try {
      const finalized = games.filter(g => g.finalized)
      const ranking = teams.map(team => {
        const myGames = finalized.filter(g => g.teamAId === team.id || g.teamBId === team.id)
        let points = 0, gameWins = 0, matchesWon = 0, matchesLost = 0

        myGames.forEach(g => {
          const isA = g.teamAId === team.id
          points += isA ? (g.pointsA || 0) : (g.pointsB || 0)
          if (g.gameWinner === (isA ? 'A' : 'B')) gameWins++
          const md = Array.isArray(g.matchData) ? g.matchData : []
          md.forEach(m => {
            if (m.winner === (isA ? 'A' : 'B')) matchesWon++
            else if (m.winner !== 'draw') matchesLost++
          })
        })

        return {
          teamId: team.id, teamName: team.name || '', teamNumber: team.number || team.id,
          school: team.institution || team.school || '',
          category: 'open', points, gameWins,
          matchesWon, matchesLost, matchDiff: matchesWon - matchesLost,
          gamesPlayed: myGames.length,
        }
      })
      .filter(r => r.gamesPlayed > 0)
      .sort((a, b) =>
        b.points - a.points || b.gameWins - a.gameWins ||
        b.matchDiff - a.matchDiff || b.matchesWon - a.matchesWon
      )

      const maxPts = ranking.length > 0 ? Math.max(...ranking.map(r => r.points)) : 1
      const rankingFinal = ranking.map(r => ({
        teamId: r.teamId, teamName: r.teamName, teamNumber: r.teamNumber,
        school: r.school || '', category: 'open',
        total: r.points, maxTotal: maxPts,
        points: r.points, gameWins: r.gameWins || 0, gamesPlayed: r.gamesPlayed || 0,
      }))
      await setDoc(doc(db, 'published_results', 'rsp'), {
        ranking: rankingFinal, publishedAt: new Date().toISOString(), module: 'rsp'
      })
      setPublishMsg({ type: 'success', text: '¡Ranking publicado en la pantalla!' })
      setTimeout(() => setPublishMsg(null), 4000)
    } catch (err) {
      console.error('RSP publish error:', err)
      setPublishMsg({ type: 'error', text: 'Error al publicar: ' + (err?.message || err) })
    } finally { setPublishing(false) }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {['all', ...ROUNDS].map(r => (
            <button key={r} onClick={() => setRoundTab(r)}
              className={'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ' +
                (roundTab === r ? [cc.bg, cc.border, cc.text].join(' ') : 'border-dark-500 text-gray-500 hover:text-gray-300')}>
              {r === 'all' ? 'Todos' : r}
            </button>
          ))}
        </div>
        <button onClick={handlePublish} disabled={publishing}
          className="btn-primary flex items-center gap-2 text-sm py-2">
          {publishing
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <><Upload size={15} /> Publicar ranking</>}
        </button>
      </div>

      {publishMsg && (
        <div className={[
          'flex items-center gap-2 px-4 py-3 rounded-xl text-sm border',
          publishMsg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        ].join(' ')}>
          <CheckCircle size={15} /> {publishMsg.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-dark-500 border-t-sky-500 rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="card text-center py-12">
          <Swords size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Sin juegos en esta fase.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((g, i) => <GameCard key={g.id} game={g} i={i} getTeamName={getTeamName} />)}
        </div>
      )}
    </div>
  )
}
