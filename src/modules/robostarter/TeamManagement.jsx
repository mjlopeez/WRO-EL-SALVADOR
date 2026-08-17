import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Trash2, Pencil, X, Check, Search, AlertCircle, CheckCircle, UserCheck, ChevronDown, Shuffle, Building2, GraduationCap } from 'lucide-react'
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  onSnapshot, orderBy, query as fsQuery, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db } from '../../firebase'
import { CATEGORIES, CATEGORY_META } from './config'

const catColors = {
  elementary: 'bg-green-500/10 border-green-500/30 text-green-400',
  junior:     'bg-lime-500/10 border-lime-500/30 text-lime-400',
}

// Judge selector (single judge per team)
function JudgeSelector({ team, judges }) {
  const [open, setOpen] = useState(false)
  const assigned = judges.find(j => j.id === team.assignedJudgeUid)
  const eligible  = judges.filter(j => j.category === team.category)

  const assign = async (judgeId) => {
    await updateDoc(doc(db, 'rs_teams', team.id), { assignedJudgeUid: judgeId || null })
    setOpen(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border transition-all ${
          assigned ? 'bg-green-500/10 border-green-500/30 text-green-400'
                   : 'border-dark-500 text-gray-500 hover:border-dark-400 hover:text-gray-300'
        }`}
      >
        <UserCheck size={12} />
        {assigned ? (assigned.judgeId ? `${assigned.judgeId} · ${assigned.name}` : assigned.name) : 'Asignar juez'}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1 bg-dark-700 border border-dark-500 rounded-xl shadow-xl z-40 min-w-[180px] overflow-hidden"
            >
              {assigned && (
                <button onClick={() => assign(null)}
                  className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-dark-600 transition-colors border-b border-dark-600">
                  ✕ Quitar asignación
                </button>
              )}
              {eligible.length === 0
                ? <p className="px-3 py-2 text-xs text-gray-500">Sin jueces en {team.category}</p>
                : eligible.map(j => (
                  <button key={j.id} onClick={() => assign(j.id)}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                      j.id === team.assignedJudgeUid ? 'bg-green-500/10 text-green-400' : 'text-gray-300 hover:bg-dark-600'
                    }`}
                  >
                    {j.id === team.assignedJudgeUid && <Check size={11} />}
                    {j.name}
                    {j.judgeId && <span className="text-gray-600 ml-auto">#{j.judgeId}</span>}
                  </button>
                ))
              }
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

const emptyForm = { name: '', number: '', school: '', category: 'elementary', member1: '', member2: '', member3: '', coach: '' }

export default function RSTeamManagement() {
  const [teams, setTeams]           = useState([])
  const [institutions, setInstitutions] = useState([])
  const [judges, setJudges]         = useState([])
  const [filterCat, setFilterCat]   = useState('all')
  const [search, setSearch]         = useState('')
  const [showForm, setShowForm]     = useState(false)
  const [editId, setEditId]         = useState(null)
  const [form, setForm]             = useState(emptyForm)
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState(null)
  const [deleting, setDeleting]     = useState(null)
  const [assigning, setAssigning]   = useState(false)

  useEffect(() => {
    const q = fsQuery(collection(db, 'rs_teams'), orderBy('name'))
    return onSnapshot(q, snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    return onSnapshot(collection(db, 'institutions'), snap =>
      setInstitutions(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)))
    )
  }, [])

  useEffect(() => {
    return onSnapshot(fsQuery(collection(db, 'users')), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setJudges(all.filter(j => j.role === 'judge' && j.modules?.includes('rs')))
    })
  }, [])

  const filtered = teams.filter(t => {
    if (filterCat !== 'all' && t.category !== filterCat) return false
    if (!search) return true
    const q = search.toLowerCase()
    return t.name?.toLowerCase().includes(q) || t.number?.toLowerCase().includes(q) || t.school?.toLowerCase().includes(q)
  })

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true) }
  const openEdit   = t => {
    setForm({ name: t.name, number: t.number || '', school: t.school || '', category: t.category || 'elementary',
      member1: t.member1 || '', member2: t.member2 || '', member3: t.member3 || '', coach: t.coach || '' })
    setEditId(t.id); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditId(null) }

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000) }

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if (editId) {
        await updateDoc(doc(db, 'rs_teams', editId), { ...form, updatedAt: serverTimestamp() })
        showMsg('success', `Equipo "${form.name}" actualizado.`)
      } else {
        await addDoc(collection(db, 'rs_teams'), { ...form, createdAt: serverTimestamp() })
        showMsg('success', `Equipo "${form.name}" registrado.`)
      }
      closeForm()
    } catch (err) { showMsg('error', err.message || 'Error al guardar.')
    } finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('¿Eliminar este equipo?')) return
    setDeleting(id); await deleteDoc(doc(db, 'rs_teams', id)); setDeleting(null)
  }

  const handleQuickAssign = async () => {
    const unassigned = teams.filter(t => !t.assignedJudgeUid)
    if (unassigned.length === 0) { showMsg('success', 'Todos los equipos ya tienen juez asignado.'); return }
    const eligible = CATEGORIES.reduce((acc, cat) => {
      acc[cat] = judges.filter(j => j.category === cat)
      return acc
    }, {})
    const noJudge = unassigned.filter(t => (eligible[t.category] || []).length === 0)
    if (noJudge.length === unassigned.length) { showMsg('error', 'No hay jueces disponibles para las categorías sin asignar.'); return }
    if (!confirm(`¿Asignar jueces al azar a ${unassigned.length} equipo(s) sin asignar?`)) return
    setAssigning(true)
    try {
      const assignCount = {}
      teams.forEach(t => { if (t.assignedJudgeUid) assignCount[t.assignedJudgeUid] = (assignCount[t.assignedJudgeUid] || 0) + 1 })
      const batch = writeBatch(db)
      for (const team of unassigned) {
        const pool = eligible[team.category] || []
        if (pool.length === 0) continue
        const min = Math.min(...pool.map(j => assignCount[j.id] || 0))
        const least = pool.filter(j => (assignCount[j.id] || 0) === min)
        const picked = least[Math.floor(Math.random() * least.length)]
        batch.update(doc(db, 'rs_teams', team.id), { assignedJudgeUid: picked.id })
        assignCount[picked.id] = (assignCount[picked.id] || 0) + 1
      }
      await batch.commit()
      showMsg('success', `✅ ${unassigned.filter(t => (eligible[t.category] || []).length > 0).length} equipo(s) asignados correctamente.`)
    } catch (err) {
      showMsg('error', err.message || 'Error en asignación rápida.')
    } finally { setAssigning(false) }
  }

  const counts = { all: teams.length }
  CATEGORIES.forEach(c => { counts[c] = teams.filter(t => t.category === c).length })

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Equipos · RoboStarter</h1>
          <p className="text-gray-400 mt-1">{filtered.length} de {teams.length} equipos · Categoría formativa</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={handleQuickAssign} disabled={assigning}
            className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-50"
            title="Asignar jueces al azar a equipos sin asignación">
            {assigning ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shuffle size={16} />}
            Asignación rápida
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Nuevo Equipo
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[['all', 'Todos'], ...CATEGORIES.map(c => [c, CATEGORY_META[c].label])].map(([val, label]) => (
          <button key={val} onClick={() => setFilterCat(val)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filterCat === val
                ? val === 'all' ? 'bg-green-500/20 border-green-500/40 text-green-400' : catColors[val]
                : 'border-dark-500 text-gray-500 hover:border-dark-400'
            }`}
          >
            {label} ({counts[val]})
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input className="input-field pl-9 py-2 text-sm" placeholder="Buscar por nombre, número o institución..."
          value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={14} /></button>}
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl mb-4 ${
              msg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {msg.text}
            <button onClick={() => setMsg(null)} className="ml-auto"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {teams.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={48} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No hay equipos registrados.</p>
          <button onClick={openCreate} className="btn-ghost mt-4 inline-flex items-center gap-2"><Plus size={16} /> Registrar primero</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-400 text-sm">Sin resultados.</p>
          <button onClick={() => { setSearch(''); setFilterCat('all') }} className="btn-ghost mt-3 text-sm py-1.5 px-4">Limpiar filtros</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t, i) => {
            const members = [t.member1, t.member2, t.member3].filter(Boolean)
            return (
              <motion.div key={t.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="card-hover">
                <div className="flex items-start gap-4">
                  <div className={`rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 w-14 h-14 text-center px-1 ${catColors[t.category] || catColors.elementary}`}>
                    {t.number || t.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-bold text-white text-base leading-tight">{t.name}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${catColors[t.category] || catColors.elementary}`}>
                          {CATEGORY_META[t.category]?.label || t.category}
                        </span>
                        <button onClick={() => openEdit(t)} className="text-gray-600 hover:text-green-400 transition-colors p-1"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id} className="text-gray-600 hover:text-red-400 transition-colors p-1 disabled:opacity-40">
                          {deleting === t.id ? <span className="w-3.5 h-3.5 border-2 border-gray-500 border-t-red-400 rounded-full animate-spin inline-block" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                    {(t.school || t.city) && (
                      <p className="text-sm text-gray-400 flex items-center gap-1.5">
                        <Building2 size={12} className="shrink-0 text-gray-600" />
                        {[t.school, t.city].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {members.length > 0 && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <GraduationCap size={12} className="shrink-0 text-gray-600" />
                        {members.join(' · ')}
                        {t.coach && <span className="text-gray-600 ml-1">· Coach: {t.coach}</span>}
                      </p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap pt-0.5">
                      <JudgeSelector team={t} judges={judges} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={e => e.target === e.currentTarget && closeForm()}
          >
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              className="card w-full max-w-md my-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{editId ? 'Editar Equipo' : 'Nuevo Equipo'}</h2>
                <button onClick={closeForm} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5 font-medium">Nombre del equipo</label>
                    <input className="input-field" placeholder="Ej: Little Builders" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5 font-medium">N° de equipo</label>
                    <input className="input-field" placeholder="Ej: 01" value={form.number}
                      onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-medium">Categoría</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c} type="button" onClick={() => setForm(f => ({ ...f, category: c }))}
                        className={`py-2 px-3 rounded-xl text-sm font-semibold border transition-all ${
                          form.category === c ? catColors[c] : 'border-dark-500 text-gray-400 hover:border-dark-400'
                        }`}>
                        {CATEGORY_META[c].label}
                        <span className="block text-xs font-normal opacity-70">{CATEGORY_META[c].ages}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5 font-medium">Institución</label>
                  {institutions.length > 0 ? (
                    <select className="input-field" value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))}>
                      <option value="">Sin institución</option>
                      {institutions.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                    </select>
                  ) : (
                    <input className="input-field" placeholder="Nombre de la institución" value={form.school}
                      onChange={e => setForm(f => ({ ...f, school: e.target.value }))} />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm text-gray-400 font-medium">Participantes</label>
                  {['member1', 'member2', 'member3'].map((k, i) => (
                    <input key={k} className="input-field" placeholder={`Participante ${i + 1}${i === 2 ? ' (opcional)' : ''}`}
                      value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} required={i < 2} />
                  ))}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5 font-medium">Coach / Instructor</label>
                  <input className="input-field" placeholder="Nombre del coach" value={form.coach}
                    onChange={e => setForm(f => ({ ...f, coach: e.target.value }))} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeForm} className="btn-ghost flex-1">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : editId ? 'Actualizar' : 'Registrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
