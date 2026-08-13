import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, Users, LogOut, ChevronRight, ExternalLink,
  BookOpen, CheckCircle2, BarChart2, UserCheck, AlertCircle
} from 'lucide-react'
import {
  collection, onSnapshot, doc, getDoc
} from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import ScoreSheet from './ScoreSheet'
import { RESOURCES, CATEGORY_META, MAX_SCORE, RUBRICS } from './config'

const CC = {
  elementary: { bg: 'bg-elementary/10', border: 'border-elementary/30', text: 'text-elementary', solid: 'bg-elementary' },
  junior:     { bg: 'bg-junior/10',     border: 'border-junior/30',     text: 'text-junior',     solid: 'bg-junior'     },
  senior:     { bg: 'bg-senior/10',     border: 'border-senior/30',     text: 'text-senior',     solid: 'bg-senior'     },
}

// Summary after score is saved
function ScoreSummary({ team, category, savedData }) {
  const cc = CC[category] || CC.elementary
  const rubric = RUBRICS[category] || RUBRICS.elementary
  const total = savedData.total ?? 0
  const pct   = Math.round((total / MAX_SCORE) * 100)
  const scores = savedData.scores || {}

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className={`card ${cc.bg} ${cc.border}`}>
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Tu puntaje</p>
            <p className={`font-mono font-extrabold text-4xl ${cc.text}`}>
              {total}
              <span className="text-sm text-gray-500 font-normal ml-1">/ {MAX_SCORE}</span>
            </p>
          </div>
          <div className="text-right">
            <p className={`font-bold text-2xl ${cc.text} opacity-70`}>{pct}%</p>
            {savedData.finalized && (
              <span className="text-xs text-green-400 flex items-center gap-1 justify-end">
                <CheckCircle2 size={12} /> Finalizado
              </span>
            )}
          </div>
        </div>
        <div className="h-2.5 bg-dark-600 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${cc.solid} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        {savedData.pairName && (
          <p className="text-xs text-gray-500 mt-2">Pareja: {savedData.pairName}</p>
        )}
      </div>

      {savedData.comments && (
        <div className="card bg-dark-700">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Comentarios</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{savedData.comments}</p>
        </div>
      )}

      {rubric.map(section => {
        const spts = section.criteria.reduce(
          (acc, c) => acc + Math.round((scores[c.id] ?? 0) / 10 * c.maxPts), 0
        )
        return (
          <div key={section.sectionKey} className="card">
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-white text-sm">{section.section}</p>
              <span className={`font-mono font-bold text-sm ${cc.text}`}>{spts}/{section.sectionMax}</span>
            </div>
            <div className="space-y-1">
              {section.criteria.map(c => {
                const s = scores[c.id] ?? 0
                const p = Math.round(s / 10 * c.maxPts)
                return (
                  <div key={c.id} className="flex justify-between text-xs text-gray-500">
                    <span className="truncate mr-2">{c.label}</span>
                    <span className="font-mono shrink-0">{s}/10 → {p}pts</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </motion.div>
  )
}

// Team info card for judge
function TeamInfoCard({ team, category }) {
  const cc = CC[category] || CC.elementary
  const catMeta = CATEGORY_META[category] || CATEGORY_META.elementary
  const members = [team.member1, team.member2, team.member3].filter(Boolean)
  return (
    <div className="card bg-dark-700 mb-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${cc.bg} border ${cc.border} flex items-center justify-center font-bold shrink-0 ${cc.text}`}>
          {team.number || team.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-white">{team.name}</p>
            {team.number && <span className="text-xs text-gray-500">#{team.number}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${cc.bg} ${cc.border} ${cc.text}`}>{catMeta.label}</span>
          </div>
          {team.school && <p className="text-xs text-gray-500 mt-0.5 truncate">{team.school}</p>}
          {members.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {members.map((m, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-dark-600 border border-dark-500 text-gray-300">{m}</span>
              ))}
              {team.coach && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${cc.bg} border ${cc.border} ${cc.text}`}>{team.coach}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Scoring view for a single team
function TeamScoring({ team, category, pair, onClose }) {
  const { user } = useAuth()
  const cc = CC[category] || CC.elementary
  const [view, setView]       = useState('score')
  const [savedData, setSavedData] = useState(null)

  const refreshSaved = () => {
    getDoc(doc(db, 'fi_scores', `${team.id}_${user.uid}`)).then(snap => {
      if (snap.exists()) setSavedData(snap.data())
    })
  }

  useEffect(() => { refreshSaved() }, [team.id, user.uid])

  const hasSaved = savedData !== null

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4 mt-4">
        <button onClick={onClose} className="btn-ghost p-2 py-1.5 text-sm">← Equipos</button>
        <div className="flex-1" />
        <span className="text-xs text-gray-500">Future Innovators</span>
      </div>

      <TeamInfoCard team={team} category={category} />

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setView('score')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 border ${
            view === 'score'
              ? `${cc.bg} ${cc.border} ${cc.text}`
              : 'border-dark-500 text-gray-400 hover:text-white hover:border-dark-400'
          }`}
        >
          {hasSaved && <CheckCircle2 size={12} className={view === 'score' ? cc.text : 'text-green-500'} />}
          Evaluación
        </button>
        {hasSaved && (
          <button
            onClick={() => setView('summary')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 border ${
              view === 'summary'
                ? `${cc.bg} ${cc.border} ${cc.text}`
                : 'border-dark-500 text-gray-400 hover:text-white hover:border-dark-400'
            }`}
          >
            <BarChart2 size={14} /> Resumen
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {view === 'summary' && savedData ? (
          <motion.div key="summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <ScoreSummary team={team} category={category} savedData={savedData} />
          </motion.div>
        ) : (
          <motion.div key="score" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <ScoreSheet
              team={team}
              category={category}
              pairId={pair?.id || null}
              pairName={pair?.name || null}
              onClose={onClose}
              onSaved={() => { refreshSaved(); setView('score') }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FIJudgeView() {
  const { profile, user, logout } = useAuth()
  const category = profile?.category || 'elementary'
  const cc = CC[category] || CC.elementary
  const catMeta = CATEGORY_META[category] || CATEGORY_META.elementary

  const [teams, setTeams]       = useState([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('teams')

  // Load ALL fi_teams, filter client-side by category — no composite index needed
  useEffect(() => {
    return onSnapshot(collection(db, 'fi_teams'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const mine = all
        .filter(t => t.category === category)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      setTeams(mine)
      setLoading(false)
    }, (err) => {
      console.error('FI JudgeView error:', err)
      setLoading(false)
    })
  }, [category])

  const myTeams = teams

  const filtered = myTeams.filter(t =>
    !search ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.number?.toLowerCase().includes(search.toLowerCase()) ||
    t.school?.toLowerCase().includes(search.toLowerCase())
  )

  if (selected) {
    return (
      <TeamScoring
        team={selected}
        category={selected.category || category}
        pair={null}
        onClose={() => setSelected(null)}
      />
    )
  }

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <span className="text-xl">💡</span>
          </div>
          <div>
            <p className="font-extrabold text-white text-lg leading-tight">Future Innovators</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${cc.bg} ${cc.border} ${cc.text}`}>
              {catMeta.label} · {catMeta.ages}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500 hidden sm:block">{profile?.name}</p>
          <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors p-2">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Assigned teams banner */}
      {!loading && myTeams.length > 0 && (
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4 ${cc.bg} border ${cc.border}`}>
          <UserCheck size={15} className={cc.text} />
          <p className={`text-xs font-bold ${cc.text}`}>{myTeams.length} equipo{myTeams.length !== 1 ? 's' : ''} asignado{myTeams.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* No teams warning */}
      {!loading && myTeams.length === 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-4 bg-amber-500/10 border border-amber-500/30">
          <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-400">Sin equipos asignados</p>
            <p className="text-xs text-gray-400 mt-0.5">El administrador debe asignarte equipos para evaluar.</p>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2 mb-5 bg-dark-700 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'teams' ? 'bg-dark-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Users size={15} /> Mis Equipos
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'resources' ? 'bg-dark-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <BookOpen size={15} /> Recursos
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'teams' && (
          <motion.div key="teams" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                className="input-field pl-9 py-2.5 text-sm"
                placeholder="Buscar equipo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-3 border-dark-500 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : myTeams.length === 0 ? null
            : filtered.length === 0 ? (
              <div className="card text-center py-10">
                <p className="text-gray-400 text-sm">Sin resultados.</p>
                <button onClick={() => setSearch('')} className="btn-ghost mt-3 text-sm py-1.5 px-4">Limpiar</button>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((team, i) => (
                  <motion.button
                    key={team.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelected(team)}
                    className="w-full card-hover text-left flex items-center gap-3"
                  >
                    <div className={`w-10 h-10 rounded-xl ${cc.bg} border ${cc.border} flex items-center justify-center font-bold shrink-0 ${cc.text}`}>
                      {team.number || team.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{team.name}</p>
                      {team.school && <p className="text-xs text-gray-500 truncate">{team.school}</p>}
                      {(team.member1 || team.members) && (
                        <p className="text-xs text-gray-600 truncate">
                          {[team.member1, team.member2, team.member3].filter(Boolean).join(' · ') || team.members}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-gray-600 shrink-0" />
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'resources' && (
          <motion.div key="resources" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="space-y-3">
            <div className={`card ${cc.bg} ${cc.border}`}>
              <p className={`text-xs font-bold uppercase tracking-wider ${cc.text} mb-3`}>
                Rúbrica — {catMeta.label} (máx. 200 pts)
              </p>
              {['Proyecto e Innovación', 'Solución Robótica', 'Presentación y Espíritu'].map((label, i) => {
                const maxMap = { elementary: [70, 65, 65], junior: [75, 70, 55], senior: [75, 70, 55] }
                const max = (maxMap[category] || maxMap.elementary)[i]
                return (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-dark-600 last:border-0">
                    <span className="text-sm text-gray-300">{label}</span>
                    <span className={`font-mono font-bold text-sm ${cc.text}`}>{max} pts</span>
                  </div>
                )
              })}
            </div>

            <div className="card bg-amber-500/5 border-amber-500/20">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">Proceso de evaluación</p>
              <ul className="text-xs text-gray-400 space-y-1.5">
                <li>• Cada sesión dura <strong className="text-white">10 minutos</strong>: 5 de presentación + 5 de preguntas.</li>
                <li>• Evalúa con <strong className="text-white">0 a 10</strong> cada criterio. Los puntos se calculan solos.</li>
                <li>• Tu pareja también evalúa — el sistema promedia ambos puntajes.</li>
                <li>• Revisa el informe del equipo <strong className="text-white">antes</strong> de la sesión.</li>
              </ul>
            </div>

            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider px-1">Documentos oficiales</p>
            {RESOURCES.map(r => (
              <motion.a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                whileTap={{ scale: 0.98 }} className="card-hover flex items-start gap-3 no-underline">
                <span className="text-2xl shrink-0 mt-0.5">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{r.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                </div>
                <ExternalLink size={14} className="text-gray-600 shrink-0 mt-1" />
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
