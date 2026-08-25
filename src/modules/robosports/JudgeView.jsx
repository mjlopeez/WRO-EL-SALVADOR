// RoboSports — Panel de Juez / Árbitro
// Sistema WRO 2026: contar pelotas (naranja +1, morada -2) en CADA mitad del campo.
// Menor puntaje gana el partido. Un juego = 3 partidos.
// Forfeit: infractor queda con puntaje 9, rival con -4.

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogOut, ChevronRight, Save, CheckCircle, Lock, Swords,
  Plus, Minus, AlertTriangle, Trophy, X as XIcon
} from 'lucide-react'
import {
  collection, onSnapshot, addDoc, setDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import {
  ROUNDS, MAX_ORANGE, MAX_PURPLE,
  calcScore, matchWinner, calcGameResult, emptyMatch, MATCHES_PER_GAME
} from './config'

const cc = { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', solid: 'bg-sky-500' }

// ── BallCounter ───────────────────────────────────────────────────────────────
function BallCounter({ label, emoji, value, onChange, max, disabled, color = 'sky' }) {
  const colorMap = {
    orange: { ring: 'border-orange-400/50', num: 'text-orange-300', btn: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-400/30' },
    purple: { ring: 'border-purple-400/50', num: 'text-purple-300', btn: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-400/30' },
    sky:    { ring: 'border-sky-400/50',    num: 'text-sky-300',    btn: 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-400/30' },
  }
  const c = colorMap[color] || colorMap.sky
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs text-gray-500 font-semibold">{emoji} {label}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => !disabled && onChange(Math.max(0, value - 1))} disabled={disabled || value <= 0}
          className={`w-7 h-7 rounded-lg border text-white font-bold flex items-center justify-center text-sm transition-all disabled:opacity-30 ${c.btn}`}>
          <Minus size={13} />
        </button>
        <span className={`w-8 text-center font-mono font-extrabold text-lg ${c.num}`}>{value}</span>
        <button onClick={() => !disabled && onChange(Math.min(max, value + 1))} disabled={disabled || value >= max}
          className={`w-7 h-7 rounded-lg border text-white font-bold flex items-center justify-center text-sm transition-all disabled:opacity-30 ${c.btn}`}>
          <Plus size={13} />
        </button>
      </div>
    </div>
  )
}

// ── MatchPanel — un partido (de 3) ────────────────────────────────────────────
function MatchPanel({ idx, match, onChange, disabled }) {
  const { orangeA, purpleA, scoreA, orangeB, purpleB, scoreB, winner, forfeit } = match

  const setField = (field, value) => {
    const next = { ...match, [field]: value }
    // Recalcular scores si no hay forfeit activo en ese campo
    if (!next.forfeit) {
      next.scoreA  = calcScore(next.orangeA, next.purpleA)
      next.scoreB  = calcScore(next.orangeB, next.purpleB)
      next.winner  = matchWinner(next.scoreA, next.scoreB)
    }
    onChange(idx, next)
  }

  const applyForfeit = (side) => {
    // side = 'A' significa A es el infractor
    const next = { ...match, forfeit: side }
    if (side === 'A') {
      next.orangeA = 9; next.purpleA = 0; next.scoreA = 9
      next.orangeB = 0; next.purpleB = 2; next.scoreB = -4
      next.winner = 'B'
    } else {
      next.orangeB = 9; next.purpleB = 0; next.scoreB = 9
      next.orangeA = 0; next.purpleA = 2; next.scoreA = -4
      next.winner = 'A'
    }
    onChange(idx, next)
  }

  const clearForfeit = () => {
    const next = { ...match, forfeit: null,
      orangeA: 0, purpleA: 0, scoreA: 0,
      orangeB: 0, purpleB: 0, scoreB: 0, winner: 'draw' }
    onChange(idx, next)
  }

  const winnerColor = (side) => winner === side ? 'text-green-400' : winner !== 'draw' ? 'text-gray-600' : 'text-gray-400'

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${forfeit ? 'border-red-500/30 bg-red-500/5' : 'border-dark-600 bg-dark-800'}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Partido {idx + 1}</p>
        {!disabled && (
          forfeit ? (
            <button onClick={clearForfeit}
              className="text-xs text-red-400 border border-red-500/30 px-2 py-0.5 rounded-lg hover:bg-red-500/10 transition-all">
              ✕ Quitar forfeit
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={() => applyForfeit('A')}
                className="text-xs text-red-400 border border-red-500/20 px-2 py-0.5 rounded-lg hover:bg-red-500/10 transition-all">
                Forfeit A
              </button>
              <button onClick={() => applyForfeit('B')}
                className="text-xs text-red-400 border border-red-500/20 px-2 py-0.5 rounded-lg hover:bg-red-500/10 transition-all">
                Forfeit B
              </button>
            </div>
          )
        )}
      </div>

      {forfeit && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-1.5">
          <AlertTriangle size={12} />
          Forfeit — Equipo {forfeit} cometió la infracción
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        {/* Equipo A */}
        <div className="space-y-2">
          <BallCounter label="Naranja" emoji="🟠" value={orangeA} max={MAX_ORANGE}
            onChange={v => setField('orangeA', v)} disabled={disabled || !!forfeit} color="orange" />
          <BallCounter label="Morada" emoji="🟣" value={purpleA} max={MAX_PURPLE}
            onChange={v => setField('purpleA', v)} disabled={disabled || !!forfeit} color="purple" />
        </div>

        {/* Marcador central */}
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <div className={`text-2xl font-mono font-extrabold ${winnerColor('A')}`}>{scoreA}</div>
          <div className="text-gray-700 text-xs font-bold">vs</div>
          <div className={`text-2xl font-mono font-extrabold ${winnerColor('B')}`}>{scoreB}</div>
          <div className="text-xs mt-1 font-semibold">
            {winner === 'A' ? <span className="text-green-400">A gana</span>
              : winner === 'B' ? <span className="text-green-400">B gana</span>
              : <span className="text-gray-500">Empate</span>}
          </div>
        </div>

        {/* Equipo B */}
        <div className="space-y-2 items-end flex flex-col">
          <BallCounter label="Naranja" emoji="🟠" value={orangeB} max={MAX_ORANGE}
            onChange={v => setField('orangeB', v)} disabled={disabled || !!forfeit} color="orange" />
          <BallCounter label="Morada" emoji="🟣" value={purpleB} max={MAX_PURPLE}
            onChange={v => setField('purpleB', v)} disabled={disabled || !!forfeit} color="purple" />
        </div>
      </div>

      <p className="text-xs text-gray-700 text-center">Menor puntaje gana · naranja +1 · morada −2</p>
    </div>
  )
}

// ── GameRecorder ───────────────────────────────────────────────────────────────
function GameRecorder({ teams, onClose, editGame }) {
  const { user, profile } = useAuth()
  const [teamA, setTeamA] = useState(editGame?.teamAId || '')
  const [teamB, setTeamB] = useState(editGame?.teamBId || '')
  const [round, setRound] = useState(editGame?.round || ROUNDS[0])
  const [matchData, setMatchData] = useState(
    editGame?.matchData || Array.from({ length: MATCHES_PER_GAME }, emptyMatch)
  )
  const [finalized, setFinalized] = useState(editGame?.finalized || false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [savedAsDraft, setSavedAsDraft] = useState(editGame?.id && !editGame?.finalized)
  const [showDirtyExit, setShowDirtyExit] = useState(false)

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const teamAData = teams.find(t => t.id === teamA)
  const teamBData = teams.find(t => t.id === teamB)

  const handleMatchChange = (idx, next) => {
    setMatchData(prev => prev.map((m, i) => i === idx ? next : m))
  }

  const gameResult = calcGameResult(matchData)

  const buildPayload = (fin) => {
    const res = calcGameResult(matchData)
    return {
      teamAId: teamA, teamAName: teamAData?.name || '',
      teamBId: teamB, teamBName: teamBData?.name || '',
      round,
      matchData,
      winsA: res.winsA, winsB: res.winsB, draws: res.draws,
      gameWinner: fin ? res.gameWinner : null,
      pointsA: fin ? res.pointsA : null,
      pointsB: fin ? res.pointsB : null,
      finalized: fin,
      judgeUid: user.uid,
      judgeName: profile?.name || user.email,
      recordedAt: serverTimestamp(),
    }
  }

  const handleSave = async (finalize = false) => {
    if (!teamA || !teamB || teamA === teamB) { showToast('error', 'Selecciona dos equipos distintos.'); return }
    setSaving(true)
    try {
      if (editGame?.id) {
        await setDoc(doc(db, 'rsp_matches', editGame.id), buildPayload(finalize), { merge: true })
      } else {
        await addDoc(collection(db, 'rsp_matches'), buildPayload(finalize))
      }
      showToast('success', finalize ? '¡Juego registrado!' : 'Borrador guardado.')
      if (finalize) { setFinalized(true); setSavedAsDraft(false); setTimeout(onClose, 1200) }
      else { setSavedAsDraft(true) }
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
          <span className="flex-1 truncate">{sel ? sel.name : 'Seleccionar equipo'}</span>
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

  const handleClose = () => {
    if (savedAsDraft && !finalized) { setShowDirtyExit(true) } else { onClose() }
  }

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto pb-24">
      {/* DirtyExit dialog */}
      {showDirtyExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="card max-w-sm w-full border-yellow-500/40 bg-dark-800">
            <div className="text-center mb-4">
              <AlertTriangle size={36} className="text-yellow-400 mx-auto mb-2" />
              <p className="font-bold text-white text-lg">Juego sin registrar</p>
              <p className="text-sm text-gray-400 mt-1">
                Guardaste un borrador pero <span className="text-yellow-400 font-semibold">aún no lo registraste</span>.
                ¿Salir de todas formas?
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDirtyExit(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm border border-dark-500 text-gray-300 hover:text-white hover:border-gray-400 transition-all">
                Seguir editando
              </button>
              <button onClick={() => { setShowDirtyExit(false); onClose() }}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 transition-all">
                Salir igual
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-5 mt-4">
        <button onClick={handleClose} className="btn-ghost p-2 py-1.5 text-sm">← Juegos</button>
        <p className="font-bold text-white flex-1 text-center">
          {editGame?.id ? 'Editar juego' : 'Nuevo juego'}
        </p>
        <div className="w-20" />
      </div>

      {finalized && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 mb-4">
          <Lock size={14} className="text-green-400 shrink-0" />
          <p className="text-sm text-green-400 font-semibold">Juego registrado y cerrado.</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Round */}
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

        {/* Equipos */}
        <div className="grid grid-cols-2 gap-3">
          <TeamPicker label="Equipo A" value={teamA} onChange={setTeamA} exclude={teamB} />
          <TeamPicker label="Equipo B" value={teamB} onChange={setTeamB} exclude={teamA} />
        </div>

        {/* Nombres en cabecera de marcador */}
        {(teamAData || teamBData) && (
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-center">
            <p className={`text-xs font-bold truncate ${cc.text}`}>{teamAData?.name || 'A'}</p>
            <p className="text-xs text-gray-700">vs</p>
            <p className={`text-xs font-bold truncate ${cc.text}`}>{teamBData?.name || 'B'}</p>
          </div>
        )}

        {/* 3 partidos */}
        {matchData.map((match, idx) => (
          <MatchPanel key={idx} idx={idx} match={match} onChange={handleMatchChange} disabled={finalized} />
        ))}

        {/* Resultado del juego */}
        <div className={`rounded-2xl border p-4 ${cc.bg} ${cc.border}`}>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={14} className={cc.text} />
            <p className={`text-xs font-bold uppercase tracking-wider ${cc.text}`}>Resultado del juego</p>
          </div>
          <div className="grid grid-cols-3 text-center gap-2">
            <div>
              <p className={`font-mono font-extrabold text-3xl ${gameResult.gameWinner === 'A' ? 'text-green-400' : 'text-gray-500'}`}>
                {gameResult.winsA}
              </p>
              <p className="text-xs text-gray-500">partidos A</p>
              {gameResult.gameWinner === 'A' && <p className="text-xs text-green-400 font-bold mt-0.5">+3 pts</p>}
              {gameResult.gameWinner === 'draw' && <p className="text-xs text-yellow-400 font-bold mt-0.5">+1 pt</p>}
              {gameResult.gameWinner === 'B' && <p className="text-xs text-gray-600 font-bold mt-0.5">+0 pts</p>}
            </div>
            <div>
              <p className="text-xs text-gray-600">{gameResult.draws} empate{gameResult.draws !== 1 ? 's' : ''}</p>
              <div className="my-1">
                {gameResult.gameWinner === 'draw'
                  ? <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">Empate</span>
                  : <span className={`text-xs font-bold ${cc.text} bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full`}>
                      Gana {gameResult.gameWinner}
                    </span>
                }
              </div>
            </div>
            <div>
              <p className={`font-mono font-extrabold text-3xl ${gameResult.gameWinner === 'B' ? 'text-green-400' : 'text-gray-500'}`}>
                {gameResult.winsB}
              </p>
              <p className="text-xs text-gray-500">partidos B</p>
              {gameResult.gameWinner === 'B' && <p className="text-xs text-green-400 font-bold mt-0.5">+3 pts</p>}
              {gameResult.gameWinner === 'draw' && <p className="text-xs text-yellow-400 font-bold mt-0.5">+1 pt</p>}
              {gameResult.gameWinner === 'A' && <p className="text-xs text-gray-600 font-bold mt-0.5">+0 pts</p>}
            </div>
          </div>
        </div>

        {/* Acciones */}
        {!finalized && (
          <div className="flex gap-3 pt-2">
            <button onClick={() => handleSave(false)} disabled={saving}
              className="btn-ghost flex-1 flex items-center justify-center gap-2 text-sm py-2">
              {saving ? <span className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                : <><Save size={15} /> Borrador</>}
            </button>
            <button onClick={() => handleSave(true)} disabled={saving || !teamA || !teamB || teamA === teamB}
              className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2 disabled:opacity-50">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><CheckCircle size={15} /> Registrar juego</>}
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
  const [teams, setTeams]     = useState([])
  const [games, setGames]     = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editGame, setEditGame] = useState(null)

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'rsp_teams'), s => {
      setTeams(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || '')))
    })
    const u2 = onSnapshot(collection(db, 'rsp_matches'), s => {
      setGames(s.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => { u1(); u2() }
  }, [])

  const getTeamName = id => teams.find(t => t.id === id)?.name || id

  if (creating || editGame) {
    return (
      <GameRecorder
        teams={teams}
        editGame={editGame}
        onClose={() => { setCreating(false); setEditGame(null) }}
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

      <button onClick={() => setCreating(true)}
        className="btn-primary w-full flex items-center justify-center gap-2 mb-5 py-3">
        <Swords size={18} /> Registrar juego
      </button>

      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">Juegos registrados</p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-dark-500 border-t-sky-500 rounded-full animate-spin" />
        </div>
      ) : games.length === 0 ? (
        <div className="card text-center py-10">
          <Swords size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Sin juegos aún.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...games].sort((a, b) => (b.recordedAt?.seconds || 0) - (a.recordedAt?.seconds || 0)).map((g, i) => {
            const nameA = g.teamAName || getTeamName(g.teamAId)
            const nameB = g.teamBName || getTeamName(g.teamBId)
            const gw = g.gameWinner
            return (
              <motion.button key={g.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.98 }}
                onClick={() => setEditGame(g)}
                className="w-full card-hover text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-dark-600 border border-dark-500 text-gray-500">{g.round}</span>
                  {g.finalized
                    ? <span className="text-xs text-green-400 font-semibold">✓ final</span>
                    : <span className="text-xs text-yellow-500 font-semibold">borrador</span>}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`font-semibold flex-1 truncate ${gw === 'A' ? 'text-green-400' : 'text-white'}`}>{nameA}</span>
                  <span className="font-mono font-bold text-white text-xs bg-dark-700 px-2 py-1 rounded-lg">
                    {g.winsA ?? '?'} — {g.winsB ?? '?'}
                  </span>
                  <span className={`font-semibold flex-1 truncate text-right ${gw === 'B' ? 'text-green-400' : 'text-white'}`}>{nameB}</span>
                </div>
                {g.finalized && (
                  <p className="text-xs text-gray-600 mt-1">
                    Pts: {nameA} {g.pointsA ?? 0} · {nameB} {g.pointsB ?? 0}
                  </p>
                )}
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
