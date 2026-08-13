import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, Globe, ChevronDown, ChevronUp, Unlock, Trash2,
  CheckCircle2, Clock, AlertCircle, Users
} from 'lucide-react'
import {
  collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../../firebase'
import { CATEGORIES, CATEGORY_META, MAX_SCORE, RUBRICS } from './config'

const catColors = {
  elementary: { text: 'text-elementary', bg: 'bg-elementary/10', border: 'border-elementary/30', bar: 'bg-elementary' },
  junior:     { text: 'text-junior',     bg: 'bg-junior/10',     border: 'border-junior/30',     bar: 'bg-junior'     },
  senior:     { text: 'text-senior',     bg: 'bg-senior/10',     border: 'border-senior/30',     bar: 'bg-senior'     },
}

// Compute average total from multiple score docs
function avgScore(scoreDocs) {
  if (!scoreDocs || scoreDocs.length === 0) return null
  const withTotal = scoreDocs.filter(s => s.total !== undefined)
  if (withTotal.length === 0) return null
  const sum = withTotal.reduce((acc, s) => acc + s.total, 0)
  return Math.round(sum / withTotal.length)
}

function TeamRow({ team, scoreDocs }) {
  const [expanded, setExpanded] = useState(false)
  const cc = catColors[team.category] || catColors.elementary
  const rubric = RUBRICS[team.category] || RUBRICS.elementary

  const hasAny     = scoreDocs.length > 0
  const avg        = avgScore(scoreDocs)
  const allFinal   = hasAny && scoreDocs.every(s => s.finalized)
  const someFinal  = hasAny && scoreDocs.some(s => s.finalized)
  const pct        = avg !== null ? Math.round((avg / MAX_SCORE) * 100) : 0

  const handleUnlock = async (scoreDocId) => {
    if (!confirm('¿Permitir reenvío de este juez?')) return
    await updateDoc(doc(db, 'fi_scores', scoreDocId), { finalized: false })
  }

  const handleReset = async (scoreDocId) => {
    if (!confirm('¿Eliminar esta evaluación?')) return
    await deleteDoc(doc(db, 'fi_scores', scoreDocId))
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
    >
      {/* Team header row */}
      <div
        className="flex items-center gap-3 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={`w-10 h-10 rounded-xl ${cc.bg} border ${cc.border} flex items-center justify-center font-bold text-sm shrink-0 ${cc.text}`}>
          {team.number || team.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{team.name}</p>
          {team.school && <p className="text-xs text-gray-500 truncate">{team.school}</p>}
        </div>

        {/* Score summary */}
        {hasAny ? (
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1.5 justify-end">
              <p className={`font-mono font-bold text-sm ${cc.text}`}>
                {avg !== null ? avg : '—'}
                <span className="text-gray-600 text-xs font-normal">/{MAX_SCORE}</span>
              </p>
              {scoreDocs.length > 1 && (
                <span className="text-xs text-gray-500 flex items-center gap-0.5">
                  <Users size={10} /> {scoreDocs.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 justify-end">
              {allFinal
                ? <span className="text-xs text-green-400 flex items-center gap-0.5"><CheckCircle2 size={11} /> Finalizado</span>
                : someFinal
                  ? <span className="text-xs text-yellow-400 flex items-center gap-0.5"><Clock size={11} /> Parcial</span>
                  : <span className="text-xs text-yellow-400 flex items-center gap-0.5"><Clock size={11} /> Borrador</span>
              }
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-600 shrink-0 flex items-center gap-1">
            <AlertCircle size={12} /> Sin evaluar
          </span>
        )}

        {expanded ? <ChevronUp size={16} className="text-gray-500 shrink-0" /> : <ChevronDown size={16} className="text-gray-500 shrink-0" />}
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-dark-600 space-y-4">
              {!hasAny ? (
                <p className="text-sm text-gray-500 text-center py-2">Ningún juez ha evaluado este equipo aún.</p>
              ) : (
                <>
                  {/* Average bar */}
                  {scoreDocs.length > 1 && avg !== null && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span className="font-semibold">Promedio ({scoreDocs.length} jueces)</span>
                        <span className={`font-mono font-bold ${cc.text}`}>{avg} pts · {pct}%</span>
                      </div>
                      <div className="h-2.5 bg-dark-600 rounded-full overflow-hidden">
                        <div className={`h-full ${cc.bar} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Per-judge scores */}
                  {scoreDocs.map(scoreDoc => {
                    const scores    = scoreDoc.scores || {}
                    const jTotal    = scoreDoc.total ?? 0
                    const jPct      = Math.round((jTotal / MAX_SCORE) * 100)
                    const finalized = scoreDoc.finalized

                    return (
                      <div key={scoreDoc.id} className="rounded-xl border border-dark-600 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-white">{scoreDoc.judgeName || scoreDoc.judgeUid}</p>
                            {scoreDoc.pairName && (
                              <p className="text-xs text-gray-600">{scoreDoc.pairName}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className={`font-mono font-bold text-sm ${cc.text}`}>{jTotal}/{MAX_SCORE}</p>
                            {finalized
                              ? <span className="text-xs text-green-400 flex items-center gap-0.5 justify-end"><CheckCircle2 size={10} /> Final</span>
                              : <span className="text-xs text-yellow-400 flex items-center gap-0.5 justify-end"><Clock size={10} /> Borrador</span>
                            }
                          </div>
                        </div>

                        {/* Mini bar */}
                        <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
                          <div className={`h-full ${cc.bar} rounded-full`} style={{ width: `${jPct}%` }} />
                        </div>

                        {/* Section breakdown */}
                        <div className="space-y-0.5">
                          {rubric.map(section => {
                            const spts = section.criteria.reduce(
                              (acc, c) => acc + Math.round((scores[c.id] ?? 0) / 10 * c.maxPts), 0
                            )
                            return (
                              <div key={section.sectionKey} className="flex justify-between text-xs">
                                <span className="text-gray-500">{section.section}</span>
                                <span className={`font-mono ${cc.text}`}>{spts}/{section.sectionMax}</span>
                              </div>
                            )
                          })}
                        </div>

                        {/* Actions per score */}
                        <div className="flex gap-2 pt-1">
                          {finalized && (
                            <button
                              onClick={() => handleUnlock(scoreDoc.id)}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                            >
                              <Unlock size={12} /> Reabrir
                            </button>
                          )}
                          <button
                            onClick={() => handleReset(scoreDoc.id)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors ml-auto"
                          >
                            <Trash2 size={12} /> Eliminar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FIResultsView() {
  const [teams, setTeams]   = useState([])
  const [scores, setScores] = useState([])
  const [activeCat, setActiveCat] = useState('elementary')
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished]   = useState(false)

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'fi_teams'),  snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'fi_scores'), snap => setScores(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2() }
  }, [])

  // Group scores by teamId: { [teamId]: ScoreDoc[] }
  const scoresByTeam = {}
  for (const s of scores) {
    if (!scoresByTeam[s.teamId]) scoresByTeam[s.teamId] = []
    scoresByTeam[s.teamId].push(s)
  }

  const catTeams = teams.filter(t => t.category === activeCat)
    .sort((a, b) => {
      const sa = avgScore(scoresByTeam[a.id]) ?? -1
      const sb = avgScore(scoresByTeam[b.id]) ?? -1
      return sb - sa
    })

  const totalScoredTeams = teams.filter(t => (scoresByTeam[t.id]?.length || 0) > 0).length

  // CSV export (one row per judge per team)
  const exportCSV = () => {
    const rows = [['Equipo', 'N°', 'Institución', 'Categoría', 'Juez', 'Pareja', 'Total', 'Promedio equipo', 'Finalizado']]
    for (const team of teams) {
      const teamScores = scoresByTeam[team.id] || []
      const avg = avgScore(teamScores)
      if (teamScores.length === 0) {
        rows.push([team.name, team.number || '', team.school || '', team.category, '', '', '', '', ''])
      } else {
        for (const s of teamScores) {
          rows.push([
            team.name,
            team.number || '',
            team.school || '',
            team.category,
            s.judgeName || '',
            s.pairName || '',
            s.total ?? '',
            avg ?? '',
            s.finalized ? 'Sí' : 'No',
          ])
        }
      }
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'fi_resultados.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // Publish averaged results
  const handlePublish = async () => {
    setPublishing(true)
    try {
      const ranking = {}
      for (const cat of CATEGORIES) {
        const catTeamsSorted = teams
          .filter(t => t.category === cat)
          .map(t => {
            const teamScores = scoresByTeam[t.id] || []
            const avg = avgScore(teamScores)
            return { team: t, avg, scoreCount: teamScores.length }
          })
          .filter(r => r.avg !== null)
          .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
        ranking[cat] = catTeamsSorted.map(({ team, avg, scoreCount }) => ({
          id:         team.id,
          name:       team.name,
          school:     team.school || '',
          number:     team.number || '',
          total:      avg,
          scoreCount,
        }))
      }
      await setDoc(doc(db, 'published_results', 'fi'), {
        ranking,
        publishedAt: serverTimestamp(),
        module: 'fi',
        moduleLabel: 'Future Innovators',
      })
      setPublished(true)
      setTimeout(() => setPublished(false), 4000)
    } finally {
      setPublishing(false)
    }
  }

  const cc = catColors[activeCat] || catColors.elementary

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Resultados · Future Innovators</h1>
          <p className="text-gray-400 mt-1">
            {scores.length} evaluaciones · {totalScoredTeams}/{teams.length} equipos evaluados
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 text-sm">
            <Download size={16} /> CSV
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className={`btn-primary flex items-center gap-2 text-sm ${published ? 'bg-green-600 border-green-500' : ''}`}
          >
            {publishing
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : published
                ? <><CheckCircle2 size={16} /> Publicado</>
                : <><Globe size={16} /> Publicar en pantalla</>
            }
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {CATEGORIES.map(cat => {
          const catTotal  = teams.filter(t => t.category === cat).length
          const scored    = teams.filter(t => t.category === cat && (scoresByTeam[t.id]?.length || 0) > 0).length
          const col       = catColors[cat]
          return (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                activeCat === cat
                  ? `${col.bg} ${col.border} ${col.text}`
                  : 'border-dark-500 text-gray-500 hover:border-dark-400'
              }`}
            >
              {CATEGORY_META[cat].label}
              <span className="ml-1.5 opacity-60 text-xs">({scored}/{catTotal})</span>
            </button>
          )
        })}
      </div>

      {/* Team rows */}
      {catTeams.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-500">No hay equipos en {CATEGORY_META[activeCat].label}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {catTeams.map(team => (
            <TeamRow
              key={team.id}
              team={team}
              scoreDocs={scoresByTeam[team.id] || []}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}
