import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  collection, onSnapshot, doc, updateDoc, deleteDoc,
  getDocs, setDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../../firebase'
import {
  BarChart2, Upload, CheckCircle, AlertCircle, Clock,
  Download, ChevronDown, ChevronUp, ShieldCheck,
  LockOpen, Loader2, Trash2
} from 'lucide-react'
import { ELEMENTARY_MAX, JUNIOR_MAX, SENIOR_MAX } from './scoringData'

const CATS   = ['elementary', 'junior', 'senior']
const ROUNDS = [1, 2, 3]
const MAX_MAP = { elementary: ELEMENTARY_MAX, junior: JUNIOR_MAX, senior: SENIOR_MAX }

const catColors = {
  elementary: { text: 'text-elementary', bg: 'bg-elementary/10', border: 'border-elementary/30' },
  junior:     { text: 'text-junior',     bg: 'bg-junior/10',     border: 'border-junior/30'     },
  senior:     { text: 'text-senior',     bg: 'bg-senior/10',     border: 'border-senior/30'     },
}

export default function ResultsView() {
  const [scores, setScores]         = useState([])
  const [teams, setTeams]           = useState([])
  const [activeCat, setActiveCat]   = useState('elementary')
  const [expandedTeam, setExpandedTeam] = useState(null)
  const [unlocking, setUnlocking]   = useState(null)
  const [resetting, setResetting]   = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [lastPublished, setLastPublished] = useState(null)
  const [publishMsg, setPublishMsg] = useState(null)

  // Real-time listeners
  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'rm_scores'), snap =>
      setScores(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    const u2 = onSnapshot(collection(db, 'rm_teams'), snap =>
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    return () => { u1(); u2() }
  }, [])

  const handleUnlock = async (e, scoreDocId) => {
    e.stopPropagation()
    if (!confirm('¿Permitir que el juez reenvíe este puntaje?')) return
    setUnlocking(scoreDocId)
    try {
      await updateDoc(doc(db, 'rm_scores', scoreDocId), { finalized: false })
    } finally {
      setUnlocking(null)
    }
  }

  const handleReset = async (e, scoreDocId, teamName, round) => {
    e.stopPropagation()
    if (!confirm(`¿Restablecer Ronda ${round} de "${teamName}"? Esto borrará el puntaje permanentemente.`)) return
    setResetting(scoreDocId)
    try {
      await deleteDoc(doc(db, 'rm_scores', scoreDocId))
    } finally {
      setResetting(null)
    }
  }

  // Build ranked rows for active category
  const catTeams = teams.filter(t => t.category === activeCat)
  const teamRows = catTeams.map(team => {
    const roundScores = ROUNDS.map(r => {
      const s = scores.find(sc => sc.teamId === team.id && sc.round === r)
      return s ?? null
    })
    const totals = roundScores.map(s => s?.total ?? null)
    const valid  = totals.filter(t => t !== null)
    const best   = valid.length > 0 ? Math.max(...valid) : null
    return { team, roundScores, totals, best }
  }).sort((a, b) => {
    if (a.best === null && b.best === null) return 0
    if (a.best === null) return 1
    if (b.best === null) return -1
    return b.best - a.best
  })

  // Export CSV
  const handleExport = () => {
    const rows = [['Pos', 'Equipo', 'Número', 'Institución', 'Ronda 1', 'Ronda 2', 'Ronda 3', 'Mejor']]
    teamRows.forEach(({ team, totals, best }, i) => {
      rows.push([
        best !== null ? i + 1 : '—',
        team.name, team.number || '', team.school || '',
        totals[0] ?? '', totals[1] ?? '', totals[2] ?? '',
        best ?? '',
      ])
    })
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `resultados-rm-${activeCat}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // Publish all categories to public display
  const handlePublish = async () => {
    if (!confirm('¿Publicar los resultados actuales en la pantalla pública?')) return
    setPublishing(true); setPublishMsg(null)
    try {
      const allTeams = teams
      const ranking = []
      for (const cat of CATS) {
        const catT = allTeams.filter(t => t.category === cat)
        const ranked = catT.map(team => {
          const ts = scores.filter(s => s.teamId === team.id)
          const rounds = ROUNDS.map(r => ts.find(x => x.round === r)?.total ?? null)
          const valid  = rounds.filter(x => x !== null)
          const best   = valid.length > 0 ? Math.max(...valid) : 0
          const total  = rounds.reduce((acc, x) => acc + (x || 0), 0)
          return { teamId: team.id, teamName: team.name, teamNumber: team.number, school: team.school, category: cat, rounds, best, total, maxTotal: MAX_MAP[cat] }
        }).sort((a, b) => b.best - a.best || b.total - a.total)
        ranking.push(...ranked)
      }
      const ts = new Date().toISOString()
      await setDoc(doc(db, 'published_results', 'rm'), { ranking, publishedAt: ts, module: 'rm' })
      setLastPublished(ts)
      setPublishMsg({ type: 'success', text: '¡Resultados publicados en la pantalla!' })
    } catch (e) {
      setPublishMsg({ type: 'error', text: 'Error al publicar: ' + e.message })
    } finally {
      setPublishing(false)
    }
  }

  const cc = catColors[activeCat]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <BarChart2 size={22} className="text-orange-400" />
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Resultados en tiempo real</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleExport} className="btn-ghost flex items-center gap-2 text-sm py-2 px-3">
            <Download size={15} /> CSV
          </button>
          <div className="text-right">
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="btn-primary flex items-center gap-2 py-2"
            >
              {publishing
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Upload size={15} />
              }
              Publicar en pantalla
            </button>
            {lastPublished && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 justify-end">
                <Clock size={11} />
                {new Date(lastPublished).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Publish message */}
      <AnimatePresence>
        {publishMsg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl mb-4 ${
              publishMsg.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {publishMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {publishMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Vista en tiempo real — se actualiza con cada calificación
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-4">
        {CATS.map(c => {
          const ccc = catColors[c]
          return (
            <button key={c} onClick={() => { setActiveCat(c); setExpandedTeam(null) }}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all capitalize ${
                activeCat === c ? `${ccc.bg} ${ccc.border} ${ccc.text}` : 'border-dark-500 text-gray-500 hover:border-dark-400'
              }`}
            >
              {c}
            </button>
          )
        })}
      </div>

      {/* Table */}
      {teamRows.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-400">Sin equipos en {activeCat} aún.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-600">
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 w-10">#</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Equipo</th>
                {ROUNDS.map(r => (
                  <th key={r} className="text-center text-xs text-gray-500 font-medium px-3 py-3 w-20 hidden sm:table-cell">R{r}</th>
                ))}
                <th className="text-center text-xs text-gray-500 font-medium px-4 py-3 w-24">Mejor</th>
                <th className="w-8 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {teamRows.map(({ team, roundScores, totals, best }, idx) => (
                <>
                  <tr
                    key={team.id}
                    onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                    className="border-b border-dark-700 hover:bg-dark-700/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold font-mono ${
                        best !== null
                          ? idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : cc.text
                          : 'text-gray-600'
                      }`}>
                        {best !== null ? idx + 1 : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white text-sm">{team.name}</p>
                      {team.school && <p className="text-xs text-gray-500">{team.school}</p>}
                    </td>
                    {totals.map((score, i) => (
                      <td key={i} className="text-center px-3 py-3 hidden sm:table-cell">
                        {score !== null
                          ? <span className={`font-mono font-bold text-sm ${cc.text}`}>{score}</span>
                          : <span className="text-gray-600 text-sm">—</span>
                        }
                      </td>
                    ))}
                    <td className="text-center px-4 py-3">
                      {best !== null
                        ? <span className={`font-mono font-extrabold text-base ${cc.text}`}>{best}</span>
                        : <span className="text-gray-600 text-sm">—</span>
                      }
                    </td>
                    <td className="px-3 py-3">
                      {expandedTeam === team.id
                        ? <ChevronUp size={14} className="text-gray-500" />
                        : <ChevronDown size={14} className="text-gray-500" />
                      }
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {expandedTeam === team.id && (
                      <tr key={`${team.id}-detail`}>
                        <td colSpan={7} className="bg-dark-800 border-b border-dark-600 px-4 py-4">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="grid grid-cols-3 gap-3">
                              {ROUNDS.map(r => {
                                const sc          = roundScores[r - 1]
                                const isFinalized = sc?.finalized === true
                                const docId       = sc?.id
                                return (
                                  <div key={r} className={`rounded-xl border p-3 ${sc ? `${cc.border} ${cc.bg}` : 'border-dark-600 bg-dark-700'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-xs text-gray-500 font-medium">Ronda {r}</p>
                                      {isFinalized && (
                                        <div className="flex items-center gap-1">
                                          <ShieldCheck size={11} className="text-green-400" />
                                          <span className="text-xs text-green-400">Finalizado</span>
                                        </div>
                                      )}
                                    </div>
                                    {sc ? (
                                      <>
                                        <p className={`font-mono font-extrabold text-xl ${cc.text}`}>{sc.total} pts</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                          {sc.updatedAt?.toDate
                                            ? sc.updatedAt.toDate().toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
                                            : ''
                                          }
                                        </p>
                                        <div className="mt-2 flex gap-1.5 flex-wrap">
                                          {isFinalized && (
                                            <button
                                              onClick={e => handleUnlock(e, docId)}
                                              disabled={unlocking === docId}
                                              className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 px-2 py-1 rounded-lg transition-all disabled:opacity-50"
                                            >
                                              {unlocking === docId
                                                ? <Loader2 size={11} className="animate-spin" />
                                                : <LockOpen size={11} />
                                              }
                                              Permitir reenvío
                                            </button>
                                          )}
                                          <button
                                            onClick={e => handleReset(e, docId, team.name, r)}
                                            disabled={resetting === docId}
                                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded-lg transition-all disabled:opacity-50"
                                          >
                                            {resetting === docId
                                              ? <Loader2 size={11} className="animate-spin" />
                                              : <Trash2 size={11} />
                                            }
                                            Restablecer
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <p className="text-sm text-gray-600">Sin puntaje</p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  )
}
