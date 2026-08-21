import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Globe, ChevronDown, ChevronUp, Unlock, Trash2, CheckCircle2, Clock, AlertCircle, ExternalLink } from 'lucide-react'
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import {
  RUBRIC, MAX_SCORE, MAX_ABIERTO, MAX_OBSTACULOS, MAX_DIARIO,
  computeAbiertoTotal, computeObstaculosTotal, computeDiarioTotal,
} from './config'

const LEVEL_COLORS = {
  6: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  4: { text: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20'  },
  2: { text: 'text-yellow-400',bg: 'bg-yellow-500/10',border: 'border-yellow-500/20'},
  0: { text: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20'   },
}
const LEVEL_LABELS = { 6: 'Excelente', 4: 'Suficiente', 2: 'Básico', 0: 'Ausente' }

const fmtTime = s => s != null
  ? `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  : '—'

function TeamRow({ team, score }) {
  const [expanded, setExpanded] = useState(false)

  const hasScore  = !!score
  const finalized = score?.finalized ?? false
  const grandTotal = score?.grandTotal ?? 0
  const pct        = Math.round((grandTotal / MAX_SCORE) * 100)

  // New structure
  const a1 = computeAbiertoTotal(score?.abierto?.r1)
  const a2 = computeAbiertoTotal(score?.abierto?.r2)
  const o1 = computeObstaculosTotal(score?.obstaculos?.r1)
  const o2 = computeObstaculosTotal(score?.obstaculos?.r2)
  const diario = computeDiarioTotal(score?.diario?.scores ?? {})
  const bestA = Math.max(a1, a2)
  const bestO = Math.max(o1, o2)

  const diarioScores = score?.diario?.scores || {}

  const handleUnlock = async () => {
    if (!confirm('¿Permitir reenvío? El juez podrá editar.')) return
    await updateDoc(doc(db, 'fe_scores', score.id), { finalized: false })
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar evaluación de este equipo?')) return
    await deleteDoc(doc(db, 'fe_scores', score.id))
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
      <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setExpanded(v => !v)}>
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center font-bold text-teal-400 shrink-0">
          {team.number || team.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{team.name}</p>
          <div className="flex items-center gap-2">
            {team.school && <p className="text-xs text-gray-500 truncate">{team.school}</p>}
            {team.githubUrl && (
              <a href={team.githubUrl} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()} className="text-gray-600 hover:text-teal-400 shrink-0">
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        {hasScore ? (
          <div className="text-right shrink-0">
            <p className="font-mono font-bold text-sm text-teal-400">{grandTotal} <span className="text-gray-600 text-xs">/{MAX_SCORE}</span></p>
            {finalized
              ? <span className="text-xs text-green-400 flex items-center gap-0.5 justify-end"><CheckCircle2 size={11} /> Final</span>
              : <span className="text-xs text-yellow-400 flex items-center gap-0.5 justify-end"><Clock size={11} /> Borrador</span>
            }
          </div>
        ) : (
          <span className="text-xs text-gray-600 shrink-0 flex items-center gap-1"><AlertCircle size={12} /> Sin evaluar</span>
        )}
        {expanded ? <ChevronUp size={16} className="text-gray-500 shrink-0" /> : <ChevronDown size={16} className="text-gray-500 shrink-0" />}
      </div>

      <AnimatePresence initial={false}>
        {expanded && hasScore && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-dark-600 space-y-3">
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Juez: {score.judgeName || score.judgeUid?.slice(0, 8) || '—'}</span>
                  <span className="text-teal-400 font-bold">{pct}%</span>
                </div>
                <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Reto Abierto */}
              <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-green-400 mb-2">
                  Reto Abierto <span className="text-teal-400 font-mono ml-1">⭐ {Math.max(a1,a2)}/{MAX_ABIERTO}</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[['R1', a1, score.abierto?.r1?.time], ['R2', a2, score.abierto?.r2?.time]].map(([lbl, pts, t]) => (
                    <div key={lbl} className="text-xs flex items-center justify-between bg-dark-700 rounded-lg px-2.5 py-1.5">
                      <span className="text-gray-500">{lbl}</span>
                      <span className="font-mono font-bold text-white">{pts} pts</span>
                      <span className="text-gray-600 flex items-center gap-0.5"><Clock size={10} /> {fmtTime(t)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reto Obstáculos */}
              <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">
                  Reto Obstáculos <span className="text-teal-400 font-mono ml-1">⭐ {Math.max(o1,o2)}/{MAX_OBSTACULOS}</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[['R1', o1, score.obstaculos?.r1?.time], ['R2', o2, score.obstaculos?.r2?.time]].map(([lbl, pts, t]) => (
                    <div key={lbl} className="text-xs flex items-center justify-between bg-dark-700 rounded-lg px-2.5 py-1.5">
                      <span className="text-gray-500">{lbl}</span>
                      <span className="font-mono font-bold text-white">{pts} pts</span>
                      <span className="text-gray-600 flex items-center gap-0.5"><Clock size={10} /> {fmtTime(t)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diario de Ingeniería */}
              <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
                  Diario de Ingeniería <span className="text-teal-400 font-mono ml-1">→ {diario}/{MAX_DIARIO}</span>
                </p>
                <div className="space-y-1">
                  {RUBRIC.map(c => {
                    const s = diarioScores[c.id]
                    const lc = s !== undefined ? LEVEL_COLORS[s] : null
                    return (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 truncate mr-2">{c.shortLabel}</span>
                        {s !== undefined ? (
                          <span className={`font-mono font-bold shrink-0 px-2 py-0.5 rounded-full border ${lc.text} ${lc.bg} ${lc.border}`}>
                            {s} — {LEVEL_LABELS[s]}
                          </span>
                        ) : (
                          <span className="text-gray-600 shrink-0">—</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                {finalized && (
                  <button onClick={handleUnlock}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors">
                    <Unlock size={12} /> Reabrir
                  </button>
                )}
                <button onClick={handleDelete}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors ml-auto">
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FEResultsView() {
  const [teams, setTeams]   = useState([])
  const [scores, setScores] = useState([])
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished]   = useState(false)

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'fe_teams'),  snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'fe_scores'), snap => setScores(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2() }
  }, [])

  // One score doc per team (first one found if multiple judges)
  const scoreMap = {}
  for (const s of scores) {
    if (!scoreMap[s.teamId]) scoreMap[s.teamId] = s
  }

  const sortedTeams = [...teams].sort((a, b) => {
    const sa = scoreMap[a.id]?.grandTotal ?? -1
    const sb = scoreMap[b.id]?.grandTotal ?? -1
    return sb - sa
  })

  const scoredCount = teams.filter(t => scoreMap[t.id]).length

  const exportCSV = () => {
    const rows = [['Equipo', 'N°', 'Institución', 'GitHub',
      'Total', 'Abierto R1', 'Abierto R2', 'Tiempo Abierto R1', 'Tiempo Abierto R2',
      'Obstáculos R1', 'Obstáculos R2', 'Tiempo Obstáculos R1', 'Tiempo Obstáculos R2',
      'Diario', 'Finalizado', 'Juez',
      ...RUBRIC.map(c => `Diario - ${c.shortLabel}`),
    ]]
    for (const team of teams) {
      const s = scoreMap[team.id]
      const a1 = computeAbiertoTotal(s?.abierto?.r1)
      const a2 = computeAbiertoTotal(s?.abierto?.r2)
      const o1 = computeObstaculosTotal(s?.obstaculos?.r1)
      const o2 = computeObstaculosTotal(s?.obstaculos?.r2)
      rows.push([
        team.name, team.number || '', team.school || '', team.githubUrl || '',
        s?.grandTotal ?? '', a1, a2,
        fmtTime(s?.abierto?.r1?.time), fmtTime(s?.abierto?.r2?.time),
        o1, o2,
        fmtTime(s?.obstaculos?.r1?.time), fmtTime(s?.obstaculos?.r2?.time),
        computeDiarioTotal(s?.diario?.scores ?? {}),
        s?.finalized ? 'Sí' : s ? 'No' : '', s?.judgeUid || '',
        ...RUBRIC.map(c => s?.diario?.scores?.[c.id] ?? ''),
      ])
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'fe_resultados.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const ranking = sortedTeams
        .filter(t => scoreMap[t.id]?.total !== undefined)
        .map(t => ({
          id: t.id, name: t.name, school: t.school || '', number: t.number || '',
          total: scoreMap[t.id].grandTotal, finalized: scoreMap[t.id].finalized,
        }))
      await setDoc(doc(db, 'published_results', 'fe'), {
        ranking: { senior: ranking },
        publishedAt: serverTimestamp(),
        module: 'fe',
        moduleLabel: 'Future Engineers',
      })
      setPublished(true)
      setTimeout(() => setPublished(false), 4000)
    } finally { setPublishing(false) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Resultados · Future Engineers</h1>
          <p className="text-gray-400 mt-1">{scoredCount}/{teams.length} equipos evaluados · máx. {MAX_SCORE} pts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 text-sm">
            <Download size={16} /> CSV
          </button>
          <button onClick={handlePublish} disabled={publishing}
            className={`btn-primary flex items-center gap-2 text-sm ${published ? 'bg-green-600 border-green-500' : ''}`}>
            {publishing
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : published ? <><CheckCircle2 size={16} /> Publicado</> : <><Globe size={16} /> Publicar</>}
          </button>
        </div>
      </div>

      {sortedTeams.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-500">No hay equipos registrados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTeams.map(team => (
            <TeamRow key={team.id} team={team} score={scoreMap[team.id] || null} />
          ))}
        </div>
      )}
    </motion.div>
  )
}
