import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

const MOD_CFG = {
  rm:  { label: 'RoboMission',       emoji: '🤖', cats: true,  color: '#f97316', cls: 'text-orange-400', bdr: 'border-orange-500/40' },
  fi:  { label: 'Future Innovators', emoji: '💡', cats: true,  color: '#a855f7', cls: 'text-purple-400', bdr: 'border-purple-500/40' },
  rs:  { label: 'RoboStarter',       emoji: '🚀', cats: true,  color: '#3b82f6', cls: 'text-blue-400',   bdr: 'border-blue-500/40'   },
  fe:  { label: 'Future Engineers',  emoji: '⚙️', cats: false, color: '#14b8a6', cls: 'text-teal-400',   bdr: 'border-teal-500/40'   },
  rsp: { label: 'RoboSports',        emoji: '⚽', cats: false, color: '#0ea5e9', cls: 'text-sky-400',    bdr: 'border-sky-500/40'    },
}

const CAT_CFG = {
  elementary: { label: 'Elementary', cls: 'text-orange-400', bdr: 'border-orange-500/30', hex: '#fb923c' },
  junior:     { label: 'Junior',     cls: 'text-blue-400',   bdr: 'border-blue-500/30',   hex: '#60a5fa' },
  senior:     { label: 'Senior',     cls: 'text-purple-400', bdr: 'border-purple-500/30', hex: '#c084fc' },
}

const SLIDES = [
  { type: 'intro',   dur: 5000 },
  { type: 'title',   mod: 'rm',  dur: 3500 },
  { type: 'results', mod: 'rm',  dur: 28000 },
  { type: 'title',   mod: 'fi',  dur: 3500 },
  { type: 'results', mod: 'fi',  dur: 28000 },
  { type: 'title',   mod: 'rs',  dur: 3500 },
  { type: 'results', mod: 'rs',  dur: 28000 },
  { type: 'title',   mod: 'fe',  dur: 3500 },
  { type: 'results', mod: 'fe',  dur: 20000 },
  { type: 'title',   mod: 'rsp', dur: 3500 },
  { type: 'results', mod: 'rsp', dur: 20000 },
]

const medals = ['🥇', '🥈', '🥉']

/* Row — noAnim skips stagger (used inside scroll loops) */
function EntryRow({ entry, idx, hex, noAnim }) {
  const pct = Math.min(100, Math.round((entry.total / (entry.maxTotal || 1)) * 100))
  const base = `flex items-center gap-3 rounded-xl px-4 py-3 border ${
    idx === 0 ? 'border-yellow-500/40 bg-yellow-500/10' :
    idx === 1 ? 'border-slate-400/30 bg-slate-500/10' :
    idx === 2 ? 'border-amber-600/30 bg-amber-700/10' :
    'border-white/5 bg-white/[0.03]'
  }`
  const inner = (
    <>
      <div className="w-7 text-center shrink-0">
        {idx < 3
          ? <span className="text-xl">{medals[idx]}</span>
          : <span className="font-mono font-bold text-gray-500 text-sm">{idx + 1}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm truncate leading-tight">{entry.teamName}</p>
        {entry.school && <p className="text-xs text-gray-500 truncate">{entry.school}</p>}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="font-mono font-bold text-sm" style={{ color: hex }}>{entry.total} pts</span>
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: hex }} />
          </div>
          <span className="text-xs text-gray-500">{pct}%</span>
        </div>
      </div>
    </>
  )

  if (noAnim) return <div className={base}>{inner}</div>
  return (
    <motion.div className={base}
      initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.06, duration: 0.35 }}>
      {inner}
    </motion.div>
  )
}

/* Category column with auto-scroll for long lists */
function CatColumn({ cat, entries }) {
  const cc = CAT_CFG[cat]
  // ~2s per entry gives comfortable reading pace; min 14s so short lists still scroll
  const scrollDur = Math.max(14, entries.length * 2)
  const scroll = entries.length > 5

  return (
    <div className={`flex-1 flex flex-col rounded-2xl border ${cc.bdr} p-4`}
      style={{ background: `${cc.hex}0a` }}>

      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cc.hex }} />
        <h3 className={`font-extrabold text-lg ${cc.cls}`}>{cc.label}</h3>
        <span className="text-gray-600 text-xs ml-auto">{entries.length} equipos</span>
      </div>

      {/* Scrolling area */}
      <div className="flex-1 overflow-hidden relative"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 7%, black 90%, transparent 100%)',
          maskImage:       'linear-gradient(to bottom, transparent 0%, black 7%, black 90%, transparent 100%)',
        }}
      >
        {entries.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">Sin resultados</p>
        ) : scroll ? (
          /* Duplicate list for seamless infinite loop */
          <motion.div
            className="space-y-2"
            animate={{ y: ['0%', '-50%'] }}
            transition={{ duration: scrollDur, ease: 'linear', repeat: Infinity, repeatType: 'loop' }}
          >
            {entries.map((e, i) => <EntryRow key={e.teamId + '-a'} entry={e} idx={i} hex={cc.hex} noAnim />)}
            {entries.map((e, i) => <EntryRow key={e.teamId + '-b'} entry={e} idx={i} hex={cc.hex} noAnim />)}
          </motion.div>
        ) : (
          <div className="space-y-2">
            {entries.map((e, i) => <EntryRow key={e.teamId || i} entry={e} idx={i} hex={cc.hex} />)}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Slides ─────────────────────────────────────────────────────────────── */

function IntroSlide() {
  return (
    <motion.div key="intro"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, #1e1530 0%, #080808 70%)' }}
    >
      <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="text-[8rem] leading-none mb-8">🏆</motion.div>

      <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="text-6xl md:text-7xl font-black text-center leading-tight tracking-tight">
        WRO El Salvador<br />
        <span style={{ background: 'linear-gradient(90deg,#f97316,#ec4899,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          2026
        </span>
      </motion.h1>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="text-gray-400 text-xl mt-6 tracking-[0.35em] uppercase font-light">
        Resultados Oficiales
      </motion.p>

      <div className="flex gap-3 mt-14">
        {[0,1,2].map(i => (
          <motion.div key={i} className="w-3 h-3 rounded-full"
            style={{ backgroundColor: ['#f97316','#ec4899','#a855f7'][i] }}
            animate={{ scale: [1, 1.7, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.28 }} />
        ))}
      </div>
    </motion.div>
  )
}

function TitleSlide({ modId }) {
  const m = MOD_CFG[modId]
  return (
    <motion.div key={`title-${modId}`}
      initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: `radial-gradient(ellipse at 50% 40%, ${m.color}35 0%, #080808 65%)` }}
    >
      {[1, 1.6, 2.4].map((s, i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{ width: `${s*200}px`, height: `${s*200}px`, border: `1px solid ${m.color}22` }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.1, 0.4] }}
          transition={{ duration: 3+i, repeat: Infinity, delay: i*0.5 }} />
      ))}
      <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.45, delay: 0.1 }}
        className="text-[9rem] leading-none mb-6 relative z-10">{m.emoji}</motion.div>
      <motion.h2 initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="text-6xl md:text-7xl font-black relative z-10"
        style={{ color: m.color, textShadow: `0 0 80px ${m.color}60` }}>{m.label}</motion.h2>
      <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.45, duration: 0.6 }}
        className="mt-5 h-1 rounded-full w-56 relative z-10" style={{ backgroundColor: m.color }} />
    </motion.div>
  )
}

function ResultsSlide({ modId, ranking }) {
  const m = MOD_CFG[modId]
  return (
    <motion.div key={`results-${modId}`}
      initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 flex flex-col"
      style={{ padding: '24px 28px 56px' }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 20% 0%, ${m.color}20 0%, transparent 55%)` }} />

      {/* Header */}
      <div className="relative flex items-center gap-3 mb-5 shrink-0">
        <span className="text-3xl">{m.emoji}</span>
        <h2 className="text-3xl font-black" style={{ color: m.color }}>{m.label}</h2>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-500">En vivo</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 min-h-0">
        {ranking.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-600 text-xl">Sin resultados publicados aún</p>
          </div>
        ) : m.cats ? (
          <div className="flex gap-4 h-full">
            {['elementary','junior','senior'].map(cat => (
              <CatColumn key={cat} cat={cat} entries={ranking.filter(e => e.category === cat)} />
            ))}
          </div>
        ) : (
          /* Single scrolling list for FE / RSP */
          (() => {
            const scroll = ranking.length > 7
            const scrollDur = Math.max(14, ranking.length * 2)
            return (
              <div className="max-w-2xl mx-auto h-full overflow-hidden relative"
                style={{
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 6%, black 92%, transparent 100%)',
                  maskImage:       'linear-gradient(to bottom, transparent 0%, black 6%, black 92%, transparent 100%)',
                }}
              >
                {scroll ? (
                  <motion.div className="space-y-2"
                    animate={{ y: ['0%', '-50%'] }}
                    transition={{ duration: scrollDur, ease: 'linear', repeat: Infinity }}
                  >
                    {ranking.map((e, i) => <EntryRow key={e.teamId+'-a'} entry={e} idx={i} hex={m.color} noAnim />)}
                    {ranking.map((e, i) => <EntryRow key={e.teamId+'-b'} entry={e} idx={i} hex={m.color} noAnim />)}
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    {ranking.map((e, i) => <EntryRow key={e.teamId || i} entry={e} idx={i} hex={m.color} />)}
                  </div>
                )}
              </div>
            )
          })()
        )}
      </div>
    </motion.div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function DisplayScreen() {
  const { token } = useParams()
  const [valid, setValid]       = useState(null)
  const [results, setResults]   = useState({})
  const [slideIdx, setSlideIdx] = useState(0)

  useEffect(() => {
    getDoc(doc(db, 'settings', 'display'))
      .then(s => setValid(s.exists() && s.data().token === token))
      .catch(() => setValid(false))
  }, [token])

  useEffect(() => {
    if (!valid) return
    const unsubs = Object.keys(MOD_CFG).map(mid =>
      onSnapshot(doc(db, 'published_results', mid), s => {
        setResults(prev => ({ ...prev, [mid]: s.exists() ? (s.data().ranking || []) : [] }))
      })
    )
    return () => unsubs.forEach(u => u())
  }, [valid])

  useEffect(() => {
    if (!valid) return
    const tid = setTimeout(
      () => setSlideIdx(i => (i + 1) % SLIDES.length),
      SLIDES[slideIdx].dur
    )
    return () => clearTimeout(tid)
  }, [valid, slideIdx])

  if (valid === null) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
      <div className="w-12 h-12 rounded-full animate-spin"
        style={{ border: '4px solid rgba(255,255,255,0.08)', borderTopColor: '#f97316' }} />
    </div>
  )
  if (!valid) return <div className="min-h-screen bg-black" />

  const slide = SLIDES[slideIdx]

  return (
    <div className="relative overflow-hidden text-white"
      style={{ width: '100vw', height: '100vh', background: '#080808' }}>

      <AnimatePresence mode="wait">
        {slide.type === 'intro'   && <IntroSlide key="intro" />}
        {slide.type === 'title'   && <TitleSlide key={`t-${slide.mod}`} modId={slide.mod} />}
        {slide.type === 'results' && (
          <ResultsSlide key={`r-${slide.mod}`} modId={slide.mod} ranking={results[slide.mod] || []} />
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-2.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,8,8,0.88)', backdropFilter: 'blur(8px)' }}>
        <p className="text-xs text-gray-600">WRO El Salvador 2026 · Sistema Oficial</p>
        <div className="flex gap-1.5 items-center">
          {SLIDES.map((s, i) => (
            <button key={i} onClick={() => setSlideIdx(i)} style={{
              width: i === slideIdx ? '24px' : '8px', height: '8px',
              borderRadius: '9999px', border: 'none', cursor: 'pointer',
              backgroundColor: s.mod ? MOD_CFG[s.mod]?.color : '#f97316',
              opacity: i === slideIdx ? 1 : 0.25, transition: 'all 0.3s',
            }} />
          ))}
        </div>
        <p className="text-xs text-gray-600">
          {new Date().toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
