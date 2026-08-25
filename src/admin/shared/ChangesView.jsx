import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  collection, onSnapshot, query, orderBy, limit
} from 'firebase/firestore'
import { db } from '../../firebase'
import { ACTION_LABELS, ACTION_COLORS } from '../../utils/auditLog'
import { History, Filter, RefreshCw, ChevronDown, ChevronUp, User, Package } from 'lucide-react'

const MODULE_LABELS = {
  rm:  '🤖 RoboMission',
  fi:  '💡 Future Innovators',
  rs:  '🚀 RoboStarter',
  fe:  '⚙️ Future Engineers',
  rsp: '⚽ RoboSports',
}

const ALL_ACTIONS = Object.keys(ACTION_LABELS)
const ALL_MODULES = Object.keys(MODULE_LABELS)

function timeAgo(ts) {
  if (!ts) return '—'
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  const diff = Date.now() - date.getTime()
  const secs  = Math.floor(diff / 1000)
  const mins  = Math.floor(secs / 60)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days  > 0) return `hace ${days}d`
  if (hours > 0) return `hace ${hours}h`
  if (mins  > 0) return `hace ${mins}m`
  return 'ahora'
}

function formatTime(ts) {
  if (!ts) return '—'
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  return date.toLocaleString('es-SV', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function FieldDiff({ diff }) {
  if (!diff || Object.keys(diff).length === 0) return null
  return (
    <div className="mt-2 space-y-0.5">
      {Object.entries(diff).map(([key, val]) => (
        <div key={key} className="flex items-center gap-2 text-xs font-mono">
          <span className="text-gray-600 min-w-[80px]">{key}</span>
          {val?.before !== undefined && (
            <span className="text-red-400 line-through">{String(val.before)}</span>
          )}
          {val?.before !== undefined && <span className="text-gray-600">→</span>}
          {val?.after !== undefined && (
            <span className="text-green-400">{String(val.after)}</span>
          )}
          {val?.before === undefined && val?.after === undefined && (
            <span className="text-gray-500">{JSON.stringify(val)}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function LogEntry({ entry, i }) {
  const [expanded, setExpanded] = useState(false)
  const ac = ACTION_COLORS[entry.action] || { text: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' }
  const actionLabel = ACTION_LABELS[entry.action] || entry.action

  const hasDetail = entry.fieldDiff || entry.totalBefore != null || entry.totalAfter != null || entry.extra

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.02 }}
      className="card overflow-hidden"
    >
      <div
        className={`flex items-start gap-3 ${hasDetail ? 'cursor-pointer select-none' : ''}`}
        onClick={() => hasDetail && setExpanded(v => !v)}
      >
        {/* Action badge */}
        <div className={`mt-0.5 px-2 py-0.5 rounded-lg text-xs font-semibold border shrink-0 ${ac.bg} ${ac.border} ${ac.text}`}>
          {actionLabel}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {entry.team?.name && (
              <span className="text-sm font-semibold text-white truncate">
                {entry.team.number ? `#${entry.team.number} ` : ''}{entry.team.name}
              </span>
            )}
            {entry.module && (
              <span className="text-xs text-gray-500">
                {MODULE_LABELS[entry.module] || entry.module}
              </span>
            )}
            {entry.round && (
              <span className="text-xs text-gray-600 bg-dark-600 px-1.5 py-0.5 rounded">
                {entry.round}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {entry.actor?.name && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <User size={10} /> {entry.actor.name}
                {entry.actor.role && <span className="text-gray-600">({entry.actor.role})</span>}
              </span>
            )}
            {entry.totalBefore != null && entry.totalAfter != null && (
              <span className="text-xs font-mono">
                <span className="text-gray-600">{entry.totalBefore}</span>
                <span className="text-gray-600 mx-1">→</span>
                <span className="text-white font-bold">{entry.totalAfter}</span>
                <span className="text-gray-600"> pts</span>
              </span>
            )}
          </div>
        </div>

        {/* Time + expand */}
        <div className="shrink-0 text-right flex flex-col items-end gap-1">
          <span className="text-xs text-gray-500" title={formatTime(entry.timestamp)}>
            {timeAgo(entry.timestamp)}
          </span>
          {hasDetail && (
            expanded
              ? <ChevronUp size={14} className="text-gray-600" />
              : <ChevronDown size={14} className="text-gray-600" />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && hasDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-dark-600 space-y-2">
              {entry.totalBefore != null && (
                <div className="text-xs text-gray-500">
                  Puntaje: <span className="text-red-400 line-through">{entry.totalBefore}</span>
                  {' → '}
                  <span className="text-green-400 font-bold">{entry.totalAfter}</span> pts
                </div>
              )}
              <FieldDiff diff={entry.fieldDiff} />
              {entry.extra && (
                <pre className="text-xs text-gray-600 font-mono bg-dark-700 rounded-lg px-3 py-2 overflow-x-auto">
                  {JSON.stringify(entry.extra, null, 2)}
                </pre>
              )}
              <p className="text-xs text-gray-600">{formatTime(entry.timestamp)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ChangesView() {
  const [logs, setLogs]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [filterModule, setFilterModule] = useState('all')
  const [filterAction, setFilterAction] = useState('all')
  const [maxEntries, setMaxEntries]   = useState(100)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    setLoading(true)
    const q = query(
      collection(db, 'audit_logs'),
      orderBy('timestamp', 'desc'),
      limit(maxEntries)
    )
    const unsub = onSnapshot(q, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, err => {
      console.error('ChangesView: onSnapshot error', err)
      setLoading(false)
    })
    return unsub
  }, [maxEntries])

  const filtered = logs.filter(l => {
    if (filterModule !== 'all' && l.module !== filterModule) return false
    if (filterAction !== 'all' && l.action !== filterAction) return false
    return true
  })

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
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
            <History size={28} className="text-gray-400" />
            Historial de Cambios
          </h1>
          <p className="text-gray-400 mt-1">
            {loading ? 'Cargando…' : `${filtered.length} ${filtered.length === 1 ? 'registro' : 'registros'}`}
            {filterModule !== 'all' || filterAction !== 'all' ? ' (filtrado)' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`btn-ghost flex items-center gap-2 text-sm ${showFilters ? 'text-white' : ''}`}
        >
          <Filter size={15} />
          Filtros
          {(filterModule !== 'all' || filterAction !== 'all') && (
            <span className="w-2 h-2 rounded-full bg-brand-orange" />
          )}
        </button>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <div className="card flex flex-wrap gap-4">
              {/* Module filter */}
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1.5">
                  <Package size={11} /> Módulo
                </label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <button
                    onClick={() => setFilterModule('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      filterModule === 'all'
                        ? 'bg-dark-500 border-dark-400 text-white'
                        : 'border-dark-600 text-gray-600 hover:text-gray-400'
                    }`}
                  >Todos</button>
                  {ALL_MODULES.map(m => (
                    <button
                      key={m}
                      onClick={() => setFilterModule(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        filterModule === m
                          ? 'bg-dark-500 border-dark-400 text-white'
                          : 'border-dark-600 text-gray-600 hover:text-gray-400'
                      }`}
                    >{MODULE_LABELS[m]}</button>
                  ))}
                </div>
              </div>

              {/* Action filter */}
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-gray-500 font-semibold mb-1 block">Acción</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <button
                    onClick={() => setFilterAction('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      filterAction === 'all'
                        ? 'bg-dark-500 border-dark-400 text-white'
                        : 'border-dark-600 text-gray-600 hover:text-gray-400'
                    }`}
                  >Todas</button>
                  {ALL_ACTIONS.map(a => {
                    const ac = ACTION_COLORS[a]
                    return (
                      <button
                        key={a}
                        onClick={() => setFilterAction(a)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          filterAction === a
                            ? `${ac.bg} ${ac.border} ${ac.text}`
                            : 'border-dark-600 text-gray-600 hover:text-gray-400'
                        }`}
                      >{ACTION_LABELS[a]}</button>
                    )
                  })}
                </div>
              </div>

              {/* Reset */}
              {(filterModule !== 'all' || filterAction !== 'all') && (
                <button
                  onClick={() => { setFilterModule('all'); setFilterAction('all') }}
                  className="text-xs text-gray-500 hover:text-white flex items-center gap-1 self-end"
                >
                  <RefreshCw size={11} /> Limpiar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log entries */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-dark-500 border-t-brand-orange rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <History size={40} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-semibold">Sin registros</p>
          <p className="text-gray-600 text-sm mt-1">
            {logs.length === 0
              ? 'Aún no hay actividad registrada en el sistema.'
              : 'Ningún registro coincide con los filtros activos.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map((entry, i) => (
              <LogEntry key={entry.id} entry={entry} i={i} />
            ))}
          </div>

          {/* Load more */}
          {logs.length >= maxEntries && (
            <div className="text-center mt-4">
              <button
                onClick={() => setMaxEntries(n => n + 100)}
                className="btn-ghost text-sm flex items-center gap-2 mx-auto"
              >
                <RefreshCw size={14} /> Cargar más registros
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
