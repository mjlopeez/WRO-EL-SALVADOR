import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Trash2, Pencil, X, Search, AlertCircle, CheckCircle, Github, ExternalLink, UserCheck, ChevronDown, ChevronUp } from 'lucide-react'
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  onSnapshot, orderBy, query as fsQuery, serverTimestamp, where
} from 'firebase/firestore'
import { db } from '../../firebase'

const emptyForm = { name: '', number: '', school: '', githubUrl: '', member1: '', member2: '', member3: '', coach: '' }

// ── Judge assignment panel per team ──────────────────────────────────────────
function JudgeAssignment({ team, judges }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const assignedJudge = judges.find(j => j.id === team.assignedJudgeUid)

  const assign = async (judge) => {
    setSaving(true)
    await updateDoc(doc(db, 'fe_teams', team.id), {
      assignedJudgeUid: judge.id,
      assignedJudgeName: judge.name,
    })
    setSaving(false)
    setOpen(false)
  }

  const unassign = async () => {
    if (!confirm('¿Quitar juez asignado?')) return
    setSaving(true)
    await updateDoc(doc(db, 'fe_teams', team.id), {
      assignedJudgeUid: null,
      assignedJudgeName: null,
    })
    setSaving(false)
  }

  return (
    <div className="border-t border-dark-600 mt-2 pt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-teal-400 transition-colors w-full"
      >
        <UserCheck size={13} />
        {assignedJudge
          ? <span className="text-teal-400 font-medium">{assignedJudge.name}</span>
          : <span>Sin juez asignado</span>
        }
        <span className="ml-auto">{open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
            className="overflow-hidden mt-2"
          >
            {judges.length === 0 ? (
              <p className="text-xs text-gray-600 px-1">No hay jueces de FE registrados.</p>
            ) : (
              <div className="space-y-1">
                {judges.map(j => (
                  <button
                    key={j.id}
                    onClick={() => assign(j)}
                    disabled={saving}
                    className={`w-full text-left text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${
                      team.assignedJudgeUid === j.id
                        ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                        : 'border-dark-500 text-gray-400 hover:border-teal-500/40 hover:text-teal-300'
                    }`}
                  >
                    <span className="flex-1 font-medium">{j.name}</span>
                    {team.assignedJudgeUid === j.id && <span className="text-teal-500">✓</span>}
                  </button>
                ))}
                {assignedJudge && (
                  <button onClick={unassign} disabled={saving}
                    className="w-full text-xs text-red-400 hover:text-red-300 px-3 py-1 transition-colors text-left">
                    Quitar asignación
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FETeamManagement() {
  const [teams, setTeams]               = useState([])
  const [institutions, setInstitutions] = useState([])
  const [feJudges, setFeJudges]         = useState([])
  const [search, setSearch]             = useState('')
  const [showForm, setShowForm]         = useState(false)
  const [editId, setEditId]             = useState(null)
  const [form, setForm]                 = useState(emptyForm)
  const [saving, setSaving]             = useState(false)
  const [msg, setMsg]                   = useState(null)
  const [deleting, setDeleting]         = useState(null)

  useEffect(() => {
    return onSnapshot(fsQuery(collection(db, 'fe_teams'), orderBy('name')),
      snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    return onSnapshot(collection(db, 'institutions'), snap =>
      setInstitutions(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)))
    )
  }, [])

  // Load judges assigned to FE module
  useEffect(() => {
    const q = fsQuery(collection(db, 'users'), where('role', '==', 'judge'))
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setFeJudges(all.filter(j => j.modules?.includes('fe')))
    })
  }, [])

  const filtered = teams.filter(t => {
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
    setForm({ name: t.name, number: t.number || '', school: t.school || '', githubUrl: t.githubUrl || '', ...parseMembersLegacy(t) })
    setEditId(t.id); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditId(null) }

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000) }

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) {
        await updateDoc(doc(db, 'fe_teams', editId), { ...form, updatedAt: serverTimestamp() })
        showMsg('success', `Equipo "${form.name}" actualizado.`)
      } else {
        await addDoc(collection(db, 'fe_teams'), { ...form, createdAt: serverTimestamp() })
        showMsg('success', `Equipo "${form.name}" registrado.`)
      }
      closeForm()
    } catch (err) {
      showMsg('error', err.message || 'Error al guardar.')
    } finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('¿Eliminar este equipo?')) return
    setDeleting(id)
    await deleteDoc(doc(db, 'fe_teams', id))
    setDeleting(null)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Equipos · Future Engineers</h1>
          <p className="text-gray-400 mt-1">{filtered.length} de {teams.length} equipos · 14–22 años</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <Plus size={18} /> Nuevo Equipo
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input className="input-field pl-9 py-2 text-sm" placeholder="Buscar equipo..."
          value={search} onChange={e => setSearch(e.target.value)} />
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
            }`}>
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
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center font-bold text-teal-400 shrink-0">
                  {t.number || t.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{t.name}</p>
                  <div className="flex items-center gap-2">
                    {t.school && <p className="text-xs text-gray-500 truncate">{t.school}</p>}
                    {(t.member1 || t.members) && <p className="text-xs text-gray-600 truncate">{[t.member1, t.member2, t.member3].filter(Boolean).join(' · ') || t.members}</p>}
                    {t.githubUrl && (
                      <a href={t.githubUrl} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-gray-600 hover:text-teal-400 transition-colors shrink-0">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
                <button onClick={() => openEdit(t)} className="text-gray-600 hover:text-teal-400 transition-colors p-1">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1 disabled:opacity-40">
                  {deleting === t.id
                    ? <span className="w-4 h-4 border-2 border-gray-500 border-t-red-400 rounded-full animate-spin inline-block" />
                    : <Trash2 size={15} />}
                </button>
              </div>
              <JudgeAssignment team={t} judges={feJudges} />
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
                    <input className="input-field" placeholder="Ej: AutoBot SV" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5 font-medium">N° de equipo</label>
                    <input className="input-field" placeholder="Ej: FE01" value={form.number}
                      onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
                  </div>
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
                    <input className="input-field" placeholder="Ej: Universidad Don Bosco" value={form.school}
                      onChange={e => setForm(f => ({ ...f, school: e.target.value }))} />
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5 font-medium flex items-center gap-1.5">
                    <Github size={14} /> URL de GitHub
                  </label>
                  <input className="input-field" placeholder="https://github.com/equipo/repo"
                    value={form.githubUrl} onChange={e => setForm(f => ({ ...f, githubUrl: e.target.value }))}
                    type="url" />
                  <p className="text-xs text-gray-600 mt-1">Requerido para evaluar el criterio de reproducibilidad</p>
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
                      : editId ? <><Pencil size={16} /> Guardar</> : <><Plus size={16} /> Crear</>}
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
