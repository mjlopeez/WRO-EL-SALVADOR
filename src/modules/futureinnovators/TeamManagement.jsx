import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Trash2, Pencil, X, Search, AlertCircle, CheckCircle, UserCheck, ChevronDown, ChevronUp, Shuffle, Building2, GraduationCap } from 'lucide-react'
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  onSnapshot, orderBy, query as fsQuery, serverTimestamp, arrayUnion, arrayRemove, where, writeBatch
} from 'firebase/firestore'
import { db } from '../../firebase'
import { CATEGORIES, CATEGORY_META } from './config'

const emptyForm = { name: '', number: '', school: '', category: 'elementary', member1: '', member2: '', member3: '', coach: '' }

const catColors = {
  elementary: 'bg-elementary/10 border-elementary/30 text-elementary',
  junior:     'bg-junior/10 border-junior/30 text-junior',
  senior:     'bg-senior/10 border-senior/30 text-senior',
}

// Judge assignment panel per team (individual judges, multiple allowed)
function JudgeAssignment({ team, judges }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const assignedUids = team.assignedJudgeUids || []
  const fiJudges = judges.filter(j => j.modules?.includes('fi') && j.category === team.category)
  const assignedJudges = fiJudges.filter(j => assignedUids.includes(j.id))
  const availableJudges = fiJudges.filter(j => !assignedUids.includes(j.id))

  const addJudge = async (judge) => {
    setSaving(true)
    await updateDoc(doc(db, 'fi_teams', team.id), {
      assignedJudgeUids: arrayUnion(judge.id),
    })
    setSaving(false)
  }

  const removeJudge = async (judgeId) => {
    setSaving(true)
    await updateDoc(doc(db, 'fi_teams', team.id), {
      assignedJudgeUids: arrayRemove(judgeId),
    })
    setSaving(false)
  }

  return (
    <div className="mt-2 border-t border-dark-700 pt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-400 transition-colors w-full"
      >
        <UserCheck size={12} />
        <span>
          {assignedJudges.length > 0
            ? <span className="text-violet-400 font-medium">{assignedJudges.map(j => j.name).join(', ')}</span>
            : 'Sin jueces asignados'
          }
        </span>
        {open ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
            className="overflow-hidden mt-2"
          >
            {/* Assigned */}
            {assignedJudges.map(j => (
              <div key={j.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-xs mb-1">
                <UserCheck size={11} className="text-violet-400 shrink-0" />
                <span className="flex-1 font-medium text-violet-300">{j.name}</span>
                <button onClick={() => removeJudge(j.id)} disabled={saving}
                  className="text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40">
                  <X size={11} />
                </button>
              </div>
            ))}

            {/* Available */}
            {availableJudges.length > 0 && (
              <div className="space-y-1 mt-1">
                <p className="text-xs text-gray-600">Agregar juez:</p>
                {availableJudges.map(j => (
                  <button key={j.id} onClick={() => addJudge(j)} disabled={saving}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-dashed border-dark-500 text-xs text-gray-400 hover:border-violet-500/40 hover:text-violet-300 transition-all disabled:opacity-40">
                    <Plus size={11} />
                    <span className="flex-1 text-left">{j.name}</span>
                  </button>
                ))}
              </div>
            )}

            {fiJudges.length === 0 && (
              <p className="text-xs text-gray-600 italic py-1">No hay jueces FI para categoría {team.category}.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FITeamManagement() {
  const [teams, setTeams]               = useState([])
  const [judges, setJudges]             = useState([])
  const [institutions, setInstitutions] = useState([])
  const [filterCat, setFilterCat]       = useState('all')
  const [search, setSearch]             = useState('')
  const [showForm, setShowForm]         = useState(false)
  const [editId, setEditId]             = useState(null)
  const [form, setForm]                 = useState(emptyForm)
  const [saving, setSaving]             = useState(false)
  const [msg, setMsg]                   = useState(null)
  const [deleting, setDeleting]         = useState(null)

  useEffect(() => {
    const q = fsQuery(collection(db, 'fi_teams'), orderBy('name'))
    return onSnapshot(q, snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    const q = fsQuery(collection(db, 'users'), where('role', '==', 'judge'))
    return onSnapshot(q, snap => setJudges(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    return onSnapshot(collection(db, 'institutions'), snap =>
      setInstitutions(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)))
    )
  }, [])

  const filtered = teams.filter(t => {
    if (filterCat !== 'all' && t.category !== filterCat) return false
    if (!search) return true
    const q = search.toLowerCase()
    return t.name?.toLowerCase().includes(q) ||
      t.number?.toLowerCase().includes(q) ||
      t.school?.toLowerCase().includes(q)
  })

  const parseMembersLegacy = (t) => {
    if (t.member1 || t.member2) return { member1: t.member1 || '', member2: t.member2 || '', member3: t.member3 || '', coach: t.coach || '' }
    const lines = (t.members || '').split('\n').map(s => s.trim()).filter(Boolean)
    return { member1: lines[0] || '', member2: lines[1] || '', member3: lines[2] || '', coach: lines[3] || '' }
  }

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true) }
  const openEdit   = t => {
    setForm({ name: t.name, number: t.number || '', school: t.school || '', category: t.category || 'elementary', ...parseMembersLegacy(t) })
    setEditId(t.id)
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditId(null) }

  const showMsg = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) {
        await updateDoc(doc(db, 'fi_teams', editId), { ...form, updatedAt: serverTimestamp() })
        showMsg('success', `Equipo "${form.name}" actualizado.`)
      } else {
        await addDoc(collection(db, 'fi_teams'), { ...form, assignedJudgeUids: [], createdAt: serverTimestamp() })
        showMsg('success', `Equipo "${form.name}" registrado.`)
      }
      closeForm()
    } catch (err) {
      showMsg('error', err.message || 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async id => {
    if (!confirm('¿Eliminar este equipo y su evaluación?')) return
    setDeleting(id)
    await deleteDoc(doc(db, 'fi_teams', id))
    setDeleting(null)
  }

  const [assigning, setAssigning] = useState(false)

  const handleQuickAssign = async () => {
    // FI: teams need 2 judges each, matched by category
    const unassigned = teams.filter(t => (t.assignedJudgeUids?.length || 0) < 2)
    if (unassigned.length === 0) { showMsg('success', 'Todos los equipos ya tienen 2 jueces asignados.'); return }

    // Judges are grouped by category (judges have a `category` field matching team category)
    const byCategory = CATEGORIES.reduce((acc, cat) => {
      acc[cat] = judges.filter(j => j.modules?.includes('fi') && j.category === cat)
      return acc
    }, {})

    const missing = unassigned.filter(t => (byCategory[t.category] || []).length < 2).map(t => `${t.name} (${t.category})`)
    if (missing.length > 0 && missing.length === unassigned.length) {
      showMsg('error', `Sin suficientes jueces en: ${missing.join(', ')}`)
      return
    }

    if (!confirm(`¿Asignar 2 jueces por categoría a ${unassigned.length} equipo(s)?`)) return
    setAssigning(true)
    try {
      const assignCount = {}
      teams.forEach(t => (t.assignedJudgeUids || []).forEach(uid => {
        assignCount[uid] = (assignCount[uid] || 0) + 1
      }))

      const batch = writeBatch(db)
      for (const team of unassigned) {
        const pool = byCategory[team.category] || []
        if (pool.length === 0) continue

        const current = team.assignedJudgeUids || []
        const needed = 2 - current.length
        const available = pool.filter(j => !current.includes(j.id))

        // Pick judges with fewest assignments first
        const picked = []
        for (let i = 0; i < needed && available.length > 0; i++) {
          const min = Math.min(...available.map(j => assignCount[j.id] || 0))
          const least = available.filter(j => (assignCount[j.id] || 0) === min)
          const choice = least[Math.floor(Math.random() * least.length)]
          picked.push(choice.id)
          assignCount[choice.id] = (assignCount[choice.id] || 0) + 1
          available.splice(available.indexOf(choice), 1)
        }

        if (picked.length > 0) {
          batch.update(doc(db, 'fi_teams', team.id), { assignedJudgeUids: [...current, ...picked] })
        }
      }
      await batch.commit()
      showMsg('success', `✅ Asignación completada — 2 jueces por equipo según categoría.`)
    } catch (err) {
      showMsg('error', err.message || 'Error en asignación rápida.')
    } finally { setAssigning(false) }
  }

  const counts = { all: teams.length }
  CATEGORIES.forEach(c => { counts[c] = teams.filter(t => t.category === c).length })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Equipos · Future Innovators</h1>
          <p className="text-gray-400 mt-1">{filtered.length} de {teams.length} equipos</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={handleQuickAssign} disabled={assigning}
            className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-50"
            title="Asignar jueces al azar a equipos sin asignación">
            {assigning ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shuffle size={16} />}
            Asignación rápida
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
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
                ? val === 'all' ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
                  : catColors[val]
                : 'border-dark-500 text-gray-500 hover:border-dark-400'
            }`}
          >
            {label} ({counts[val]})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          className="input-field pl-9 py-2 text-sm"
          placeholder="Buscar por nombre, número o institución..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Message */}
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

      {/* List */}
      {teams.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={48} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No hay equipos registrados.</p>
          <button onClick={openCreate} className="btn-ghost mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> Registrar primero
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-400 text-sm">Sin resultados.</p>
          <button onClick={() => { setSearch(''); setFilterCat('all') }} className="btn-ghost mt-3 text-sm py-1.5 px-4">
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t, i) => {
            const members = [t.member1, t.member2, t.member3].filter(Boolean)
            return (
              <motion.div key={t.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="card-hover">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 text-center px-1 ${catColors[t.category] || catColors.elementary}`}>
                    {t.number || t.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-bold text-white text-base leading-tight">{t.name}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${catColors[t.category] || catColors.elementary}`}>
                          {CATEGORY_META[t.category]?.label || t.category}
                        </span>
                        <button onClick={() => openEdit(t)} className="text-gray-600 hover:text-violet-400 transition-colors p-1"><Pencil size={14} /></button>
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
                    </div>
                    {/* Judge assignment panel */}
                    <JudgeAssignment team={t} judges={judges} />
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
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={e => e.target === e.currentTarget && closeForm()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="card w-full max-w-md my-4"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{editId ? 'Editar Equipo' : 'Nuevo Equipo'}</h2>
                <button onClick={closeForm} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5 font-medium">Nombre del equipo</label>
                    <input className="input-field" placeholder="Ej: Team Alpha" value={form.name}
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
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c} type="button"
                        onClick={() => setForm(f => ({ ...f, category: c }))}
                        className={`py-2 px-3 rounded-xl text-sm font-semibold border transition-all ${
                          form.category === c ? catColors[c] : 'border-dark-500 text-gray-400 hover:border-dark-400'
                        }`}
                      >
                        {CATEGORY_META[c].label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 ml-1">
                    {CATEGORY_META[form.category]?.ages} · nacidos {CATEGORY_META[form.category]?.born}
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5 font-medium">Institución</label>
                  {institutions.length > 0 ? (
                    <select className="input-field" value={form.school}
                      onChange={e => setForm(f => ({ ...f, school: e.target.value }))}>
                      <option value="">Sin institución</option>
                      {institutions.map(i => <option key={i.id} value={i.name}>{i.name}{i.city ? ` – ${i.city}` : ''}</option>)}
                    </select>
                  ) : (
                    <input className="input-field" placeholder="Ej: Colegio San Ignacio" value={form.school}
                      onChange={e => setForm(f => ({ ...f, school: e.target.value }))} />
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-medium">Participantes</label>
                  <div className="space-y-2">
                    {[['member1','Estudiante 1',true],['member2','Estudiante 2',true],['member3','Estudiante 3',false],['coach','Coach / Entrenador',false]].map(([field, label, req]) => (
                      <div key={field} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-28 shrink-0">{label}{req && <span className="text-red-400 ml-0.5">*</span>}</span>
                        <input className="input-field flex-1 py-1.5 text-sm" placeholder={label}
                          value={form[field]}
                          required={req}
                          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeForm} className="btn-ghost flex-1">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {saving
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : editId ? <><Pencil size={16} /> Guardar</> : <><Plus size={16} /> Crear</>
                    }
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
