// RoboSports — Panel de Juez / Árbitro
// El juez registra partidos: selecciona dos equipos y anota sets ganados por cada uno.
// Un partido es mejor de 3 sets; gana quien llega primero a 2 sets.

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogOut, Search, X, Users, ChevronRight, Save, CheckCircle, Lock,
  BarChart2, Swords, Plus, Minus
} from 'lucide-react'
import {
  collection, onSnapshot, addDoc, setDoc, doc, getDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { ROUNDS, SETS_TO_WIN } from './config'

const cc = { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', solid: 'bg-sky-500' }

// ── Match Recorder ────────────────────────────────────────────────────────────
function MatchRecorder({ teams, onClose, editMatch }) {
  const { user, profile } = useAuth()
  const [teamA, setTeamA]   = useState(editMatch?.teamAId || '')
  const [teamB, setTeamB]   = useState(editMatch?.teamBId || '')
  const [setsA, setSetsA]   = useState(editMatch?.setsA ?? 0)
  const [setsB, setSetsB]   = useState(editMatch?.setsB ?? 0)
  const [round, setRound]   = useState(editMatch?.round || ROUNDS[0])
  const [finalized, setFinalized] = useState(editMatch?.finalized || false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState(null)

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const teamAData = teams.find(t => t.id === teamA)
  const teamBData = teams.find(t => t.id === teamB)

  // Determine winner based on sets
  const winner = setsA >= SETS_TO_WIN ? 'A' : setsB >= SETS_TO_WIN ? 'B' : null

  const buildPayload = (fin) => ({
    teamAId: teamA, teamAName: teamAData?.name || '',
    teamBId: teamB, teamBName: teamBData?.name || '',
    setsA, setsB, round,
    winner: fin ? winner : null,
    finalized: fin,
    judgeUid: user.uid,
    judgeName: profile?.name || user.email,
    recordedAt: serverTimestamp(),
  })

  const handleSave = async (finalize = false) => {
    if (!teamA || !teamB || teamA === teamB) { showToast('error', 'Selecciona dos equipos distintos.'); return }
    setSaving(true)
    try {
      if (editMatch?.id) {
        await setDoc(doc(db, 'rsp_matches', editMatch.id), buildPayload(finalize), { merge: true })
      } else {
        await addDoc(collection(db, 'rsp_matches'), buildPayload(finalize))
      }
      showToast('success', finalize ? '¡Partido registrado!' : 'Borrador guardado.')
      if (finalize) { setFinalized(true); setTimeout(onClose, 1200) }
    } catch { showToast('error', 'Error al guardar.') }
    finally { setSaving(false) }
  }

  const TeamPicker = ({ label, value, onChange, exclude }) => {
    const [search, setSearch] = useState('')
    const [open, setOpen] = useState(false)
    const sel = teams.find(t => t.id === value)
    const opts = teams.filter(t => t.id !== exclude && (!search || t.name.toLowerCase().includes(search.toLowerCase())))
    return (
      <div className="relative">
        <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">{label}</p>
        <button type="button" onClick={() => !finalized && setOpen(v => !v)} disabled={finalized}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
            sel ? `${cc.bg} ${cc.border} ${cc.text} font-semibold` : 'border-dark-500 text-gray-500 bg-dark-700'
          } disabled:opacity-60`}>
          {sel ? (
            <><span className="flex-1 truncate">{sel.name}</span>{sel.number && <span className="text-xs opacity-60">#{sel.number}</span>}</>
          ) : 'Seleccionar equipo'}
          <ChevronRight size={14} className="text-gray-600 shrink-0" />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="absolute z-40 top-full left-0 right-0 mt-1 bg-dark-700 border border-dark-500 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
              <div className="p-2">
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..." className="input-field py-1.5 text-sm" />
              </div>
              {opts.map(t => (
                <button key={t.id} onClick={() => { onChange(t.id); setOpen(false); setSearch('') }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-dark-600 transition-all ${value === t.id ? `${cc.text} bg-sky-500/5` : 'text-gray-300'}`}>
                  {t.name} {t.number && <span className="text-xs text-gray-500">#{t.number}</span>}
                </button>
              ))}
              {opts.length === 0 && <p className="px-3 py-2 text-xs text-gray-600">Sin resultados</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const SetCounter = ({ label, value, onChange, disabled, highlight }) => (
    <div className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border ${highlight ? `${cc.bg} ${cc.border}` : 'bg-dark-700 border-dark-600'}`}>
      <p className={`text-xs font-bold uppercase tracking-wider ${highlight ? cc.text : 'text-gray-500'}`}>{label}</p>
      <button onClick={() => !disabled && onChange(Math.min(value + 1, SETS_TO_WIN))} disabled={disabled}
        className="w-10 h-10 rounded-xl bg-dark-600 border border-dark-500 text-gray-300 font-bold text-xl flex items-center justify-center disabled:opacity-40">
        <Plus size={18} />
      </button>
      <span className={`font-mono font-extrabold text-4xl ${highlight ? cc.text : 'text-white'}`}>{value}</span>
      <button onClick={() => !disabled && onChange(Math.max(0, value - 1))} disabled={disabled}
        className="w-10 h-10 rounded-xl bg-dark-600 border border-dark-500 text-gray-300 font-bold text-xl flex items-center justify-center disabled:opacity-40">
        <Minus size={18} />
      </button>
    </div>
  )

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-5 mt-4">
        <button onClick={onClose} className="btn-ghost p-2 py-1.5 text-sm">← Partidos</button>
        <p className="font-bold text-white flex-1 text-center">
          {editMatch?.id ? 'Editar partido' : 'Nuevo partido'}
        </p>
        <div className="w-20" />
      </div>

      {finalized && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 mb-4">
          <Lock size={14} className="text-green-400 shrink-0" />
          <p className="text-sm text-green-400 font-semibold">Partido registrado y cerrado.</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Round selector */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wider">Fase</p>
          <div className="flex flex-wrap gap-2">
            {ROUNDS.map(r => (
              <button key={r} type="button" onClick={() => !finalized && setRound(r)} disabled={finalized}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  round === r ? `${cc.bg} ${cc.border} ${cc.text}` : 'border-dark-500 text-gray-500 hover:text-gray-300'
                } disabled:opacity-60`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Team pickers */}
        <div className="grid grid-cols-2 gap-3">
          <TeamPicker label="Equipo A" value={teamA} onChange={setTeamA} exclude={teamB} />
          <TeamPicker label="Equipo B" value={teamB} onChange={setTeamB} exclude={teamA} />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-dark-600" />
          <Swords size={16} className="text-gray-600" />
          <div className="flex-1 h-px bg-dark-600" />
        </div>

        {/* Set counters */}
        <div className="flex gap-3">
          <SetCounter label={teamAData?.name || 'Equipo A'} value={setsA} onChange={setSetsA}
            disabled={finalized} highlight={winner === 'A'} />
          <SetCounter label={teamBData?.name || 'Equipo B'} value={setsB} onChange={setSetsB}
            disabled={finalized} highlight={winner === 'B'} />
        </div>

        {/* Winner display */}
        {winner && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl ${cc.bg} ${cc.border} border`}>
            <CheckCircle size={16} className={cc.text} />
            <p className={`font-bold ${cc.text} text-sm`}>
              Ganador: {winner === 'A' ? teamAData?.name : teamBData?.name}
            </p>
          </motion.div>
        )}

        {/* Actions */}
        {!finalized && (
          <div className="flex gap-3 pt-2">
            <button onClick={() => handleSave(false)} disabled={saving}
              className="btn-ghost flex-1 flex items-center justify-center gap-2 text-sm py-2">
              {saving ? <span className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                : <><Save size={15} /> Guardar borrador</>}
            </button>
            <button onClick={() => handleSave(true)} disabled={saving || !teamA || !teamB || teamA === teamB}
              className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2 disabled:opacity-50">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><CheckCircle size={15} /> Registrar resultado</>}
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300'
                : 'bg-red-500/20 border border-red-500/40 text-red-300'
            }`}>
            {toast.type === 'success' && <CheckCircle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Judge View ────────────────────────────────────────────────────────────
export default function RSPJudgeView() {
  const { profile, logout } = useAuth()
  const [teams, setTeams]       = useState([])
  const [matches, setMatches]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [editMatch, setEditMatch] = useState(null)

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'rsp_teams'), s => {
      setTeams(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.name||'').localeCompare(b.name||'')))
    })
    const u2 = onSnapshot(collection(db, 'rsp_matches'), s => {
      setMatches(s.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => { u1(); u2() }
  }, [])

  const getTeamName = (id) => teams.find(t => t.id === id)?.name || id

  if (creating || editMatch) {
    return (
      <MatchRecorder
        teams={teams}
        editMatch={editMatch}
        onClose={() => { setCreating(false); setEditMatch(null) }}
      />
    )
  }

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <span className="text-xl">⚽</span>
          </div>
          <div>
            <p className="font-extrabold text-white text-lg leading-tight">RoboSports</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-sky-500/10 border-sky-500/30 text-sky-400">
              Árbitro
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

      {/* New match button */}
      <button onClick={() => setCreating(true)}
        className="btn-primary w-full flex items-center justify-center gap-2 mb-5 py-3">
        <Swords size={18} /> Registrar partido
      </button>

      {/* Recent matches */}
      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">Partidos registrados</p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-dark-500 border-t-sky-500 rounded-full animate-spin" />
        </div>
      ) : matches.length === 0 ? (
        <div className="card text-center py-10">
          <Swords size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Sin partidos aún.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...matches].sort((a, b) => (b.recordedAt?.seconds || 0) - (a.recordedAt?.seconds || 0)).map((m, i) => (
            <motion.button key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.98 }}
              onClick={() => setEditMatch(m)}
              className="w-full card-hover text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-dark-600 border border-dark-500 text-gray-500">{m.round}</span>
                {m.finalized && <span className="text-xs text-green-400 font-semibold">✓ final</span>}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={`font-semibold flex-1 truncate ${m.winner === 'A' ? cc.text : 'text-white'}`}>
                  {m.teamAName || getTeamName(m.teamAId)}
                </span>
                <span className="font-mono font-bold text-white">{m.setsA} — {m.setsB}</span>
                <span className={`font-semibold flex-1 truncate text-right ${m.winner === 'B' ? cc.text : 'text-white'}`}>
                  {m.teamBName || getTeamName(m.teamBId)}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
