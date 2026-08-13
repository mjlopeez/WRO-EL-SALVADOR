import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Trash2, Pencil, X, Check, Search, AlertCircle, CheckCircle, UserCheck, ChevronDown } from 'lucide-react'
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  onSnapshot, orderBy, query as fsQuery, where, serverTimestamp
} from 'firebase/firestore'
import { db } from '../../firebase'

const CATEGORIES = ['elementary', 'junior', 'senior']

// ── Judge assignment dropdown (single judge per RM team) ──────────────────────
function JudgeSelector({ team, judges }) {
  const [open, setOpen] = useState(false)
  const assigned = judges.find(j => j.id === team.assignedJudgeUid)

  const assign = async (judgeId) => {
    await updateDoc(doc(db, 'rm_teams', team.id), {
      assignedJudgeUid: judgeId || null,
    })
    setOpen(false)
  }

  // Filter judges matching this team's category
  const eligible = judges.filter(j => j.category === team.category)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border transition-all ${
          assigned
            ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
            : 'border-dark-500 text-gray-500 hover:border-dark-400 hover:text-gray-300'
        }`}
      >
        <UserCheck size={12} />
        {assigned ? assigned.name.split(' ')[0] : 'Asignar juez'}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1 bg-dark-700 border border-dark-500 rounded-xl shadow-xl z-40 min-w-[180px] overflow-hidden"
            >
              {assigned && (
                <button
                  onClick={() => assign(null)}
                  className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-dark-600 transition-colors border-b border-dark-600"
                >
                  ✕ Quitar asignación
                </button>
              )}
              {eligible.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-500">Sin jueces en {team.category}</p>
              ) : eligible.map(j => (
                <button
                  key={j.id}
                  onClick={() => assign(j.id)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                    j.id === team.assignedJudgeUid
                      ? 'bg-orange-500/10 text-orange-400'
                      : 'text-gray-300 hover:bg-dark-600'
                  }`}
                >
                  {j.id === team.assignedJudgeUid && <Check size={11} />}
                  {j.name}
                  {j.judgeId && <span className="text-gray-600 ml-auto">#{j.judgeId}</span>}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

const emptyForm = { name: '', number: '', school: '', category: 'elementary', member1: '', member2: '', member3: '', coach: '' }

export default function TeamManagement() {
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

  useEffect(() => {
    const q = fsQuery(collection(db, 'rm_teams'), orderBy('name'))
    const unsub = onSnapshot(q, snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return unsub
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'institutions'), snap =>
      setInstitutions(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)))
    )
    return unsub
  }, [])

  // Load RM judges from users collection
  useEffect(() => {
    const q = fsQuery(collection(db, 'users'), where('role', '==', 'judge'))
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Keep only judges assigned to 'rm' module
      setJudges(all.filter(j => Array.isArray(j.modules) ? j.modules.includes('rm') : j.module === 'rm'))
    })
    return unsub
  }, [])

  const filtered = teams.filter(t => {
    if (filterCat !== 'all' && t.category !== filterCat) return false
    if (!search) return true
    const q = search.toLowerCase()
    return t.name?.toLowerCase().includes(q) ||
      t.number?.toLowerCase().includes(q) ||
      t.school?.toLowerCase().includes(q)
  })

  const catColors = {
    elementary: 'bg-elementary/10 border-elementary/30 text-elementary',
    junior:     'bg-junior/10 border-junior/30 text-junior',
    senior:     'bg-senior/10 border-senior/30 text-senior',
  }

  // Parse legacy 'members' string to individual fields if needed
  const parseMembersLegacy = (t) => {
    if (t.member1 || t.member2) return { member1: t.member1 || '', member2: t.member2 || '', member3: t.member3 || '', coach: t.coach || '' }
    const lines = (t.members || '').split('\n').map(s => s.trim()).filter(Boolean)
    return { member1: lines[0] || '', member2: lines[1] || '', member3: lines[2] || '', coach: lines[3] || '' }
  }

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true) }
  const openEdit   = t => { setForm({ name: t.name, number: t.number || '', school: t.school || '', category: t.category || 'elementary', ...parseMembersLegacy(t) }); setEditId(t.id); setShowForm(true) }
  const closeForm  = () => { setShowForm(false); setEditId(null) }

  const showMsg = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) {
        await updateDoc(doc(db, 'rm_teams', editId), { ...form, updatedAt: serverTimestamp() })
        showMsg('success', `Equipo "${form.name}" actualizado.`)
      } else {
        await addDoc(collection(db, 'rm_teams'), { ...form, createdAt: serverTimestamp() })
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
    if (!confirm('¿Eliminar este equipo y todos sus puntajes?')) return
    setDeleting(id)
    await deleteDoc(doc(db, 'rm_teams', id))
    setDeleting(null)
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
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Equipos · RoboMission</h1>
          <p className="text-gray-400 mt-1">{filtered.length} de {teams.length} equipos</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <Plus size={18} /> Nuevo Equipo
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[['all', 'Todos'], ...CATEGORIES.map(c => [c, c.charAt(0).toUpperCase() + c.slice(1)])].map(([val, label]) => (
          <button key={val} onClick={() => setFilterCat(val)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filterCat === val
                ? val === 'all' ? 'bg-brand-orange/20 border-brand-orange/40 text-brand-orange'
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
          <button onClick={() => { setSearch(''); setFilterCat('all') }} className="btn-ghost mt-3 text-sm py-1.5 px-4">Limpiar filtros</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="card-hover flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 ${catColors[t.category] || catColors.elementary}`}>
                {t.number || t.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{t.name}</p>
                {t.school && <p className="text-xs text-gray-500 truncate">{t.school}</p>}
                {(t.member1 || t.members) && <p className="text-xs text-gray-600 truncate">{[t.member1, t.member2, t.member3].filter(Boolean).join(' · ') || t.members}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border capitalize shrink-0 hidden sm:inline ${catColors[t.category] || catColors.elementary}`}>
                {t.category}
              </span>
              <JudgeSelector team={t} judges={judges} />
              <button onClick={() => openEdit(t)} className="text-gray-600 hover:text-brand-orange transition-colors p-1">
                <Pencil size={15} />
              </button>
              <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id} className="text-gray-600 hover:text-red-400 transition-colors p-1 disabled:opacity-40">
                {deleting === t.id
                  ? <span className="w-4 h-4 border-2 border-gray-500 border-t-red-400 rounded-full animate-spin inline-block" />
                  : <Trash2 size={15} />
                }
              </button>
            </motion.div>
          ))}
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

                {/* Category */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-medium">Categoría</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c} type="button"
                        onClick={() => setForm(f => ({ ...f, category: c }))}
                        className={`py-2 px-3 rounded-xl text-sm font-semibold border transition-all capitalize ${
                          form.category === c
                            ? catColors[c]
                            : 'border-dark-500 text-gray-400 hover:border-dark-400'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Institution */}
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
