import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { Swords, Upload, CheckCircle } from 'lucide-react'
import { ROUNDS } from './config'

const cc = { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', solid: 'bg-sky-500' }

export default function RSPResultsView() {
  const [teams, setTeams]       = useState([])
  const [matches, setMatches]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [roundTab, setRoundTab] = useState('all')
  const [publishing, setPublishing] = useState(false)
  const [publishMsg, setPublishMsg] = useState(null)

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'rsp_teams'),   s => setTeams(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'rsp_matches'), s => {
      setMatches(s.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => { u1(); u2() }
  }, [])

  const getTeamName = (id) => teams.find(t => t.id === id)?.name || id

  const filtered = roundTab === 'all' ? matches : matches.filter(m => m.round === roundTab)
  const sorted   = [...filtered].sort((a, b) => (b.recordedAt?.seconds || 0) - (a.recordedAt?.seconds || 0))

  const handlePublish = async () => {
    if (!confirm('¿Publicar el ranking actual en la pantalla pública?')) return
    setPublishing(true); setPublishMsg(null)
    try {
      const finalized = matches.filter(m => m.finalized)
      const ranking = teams.map(team => {
        const tm = finalized.filter(m => m.teamAId === team.id || m.teamBId === team.id)
        const wins    = tm.filter(m => m.winner === (m.teamAId === team.id ? 'A' : 'B')).length
        const setsWon = tm.reduce((a, m) => a + (m.teamAId === team.id ? m.setsA : m.setsB), 0)
        const setsLost = tm.reduce((a, m) => a + (m.teamAId === team.id ? m.setsB : m.setsA), 0)
        return { teamId: team.id, teamName: team.name, institution: team.institution,
          category: 'open', wins, setsWon, setsLost, setDiff: setsWon - setsLost, played: tm.length }
      }).filter(r => r.played > 0).sort((a, b) => b.wins - a.wins || b.setDiff - a.setDiff)

      await setDoc(doc(db, 'published_results', 'rsp'), {
        ranking, publishedAt: new Date().toISOString(), module: 'rsp'
      })
      setPublishMsg({ type: 'success', text: '¡Ranking publicado en la pantalla!' })
      setTimeout(() => setPublishMsg(null), 4000)
    } catch {
      setPublishMsg({ type: 'error', text: 'Error al publicar.' })
    } finally { setPublishing(false) }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {['all', ...ROUNDS].map(r => (
            <button key={r} onClick={() => setRoundTab(r)}
              className={'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ' + (roundTab === r ? [cc.bg, cc.border, cc.text].join(' ') : 'border-dark-500 text-gray-500 hover:text-gray-300')}>
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
          publishMsg.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
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
          <p className="text-gray-400 text-sm">Sin partidos en esta fase.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((m, i) => {
            const nameA = m.teamAName || getTeamName(m.teamAId)
            const nameB = m.teamBName || getTeamName(m.teamBId)
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }} className="card">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-dark-600 border border-dark-500 text-gray-500">{m.round}</span>
                  {m.finalized
                    ? <span className="text-xs text-green-400 font-semibold">✓ finalizado</span>
                    : <span className="text-xs text-yellow-500 font-semibold">borrador</span>
                  }
                  {m.judgeName && <span className="text-xs text-gray-600 ml-auto">Árbitro: {m.judgeName}</span>}
                </div>

                <div className="flex items-center gap-3">
                  {/* Team A */}
                  <div className={`flex-1 text-right ${m.winner === 'A' ? cc.text : 'text-gray-300'}`}>
                    <p className={`font-bold text-sm truncate ${m.winner === 'A' ? cc.text : ''}`}>{nameA}</p>
                    {m.winner === 'A' && <p className="text-xs font-semibold">🏆 Ganador</p>}
                  </div>
                  {/* Score */}
                  <div className={`flex items-center gap-2 shrink-0 px-4 py-2 rounded-xl border ${cc.bg} ${cc.border}`}>
                    <span className={`font-mono font-extrabold text-2xl ${cc.text}`}>{m.setsA}</span>
                    <span className="text-gray-600 text-lg">—</span>
                    <span className={`font-mono font-extrabold text-2xl ${cc.text}`}>{m.setsB}</span>
                  </div>
                  {/* Team B */}
                  <div className={`flex-1 ${m.winner === 'B' ? cc.text : 'text-gray-300'}`}>
                    <p className={`font-bold text-sm truncate ${m.winner === 'B' ? cc.text : ''}`}>{nameB}</p>
                    {m.winner === 'B' && <p className="text-xs font-semibold">🏆 Ganador</p>}
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
