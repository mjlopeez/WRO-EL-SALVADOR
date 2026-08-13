import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Pencil, Trash2, X, Save, Users, ChevronDown, UserCheck, Search
} from 'lucide-react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp, where, query as fsQuery
} from 'firebase/firestore'
import { db } from '../../firebase'
import { CATEGORY_META } from './config'

const cc = { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', solid: 'bg-sky-500' }

const EMPTY_FORM = {
  name: '', number: '', institution: '',
  member1: '', member2: '', member3: '', member4: '', coach: '',
}

// Single-judge dropdown (rsp module)
function JudgeSelector({ team, judges }) {
  const [open, setOpen] = useState(false)
  const assigned = judges.find(j => j.id === team.assignedJudgeUid)
  const assign = async (judgeId) => {
    await updateDoc(doc(db, 'rsp_teams', team.id), { assignedJudgeUid: judgeId || null })
    setOpen(false)
  }
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dark-500 bg-dark-700 text-xs text-gray-300 hover:border-sky-500/40 transition-all">
        <UserCheck size={12} className={assigned ? 'text-sky-400' : 'text-gray-600'} />
        <span className="max-w-[90px] truncate">{assigned ? assigned.name : 'Sin juez'}</span>
        <ChevronDown size={11} className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute z-30 top-full left-0 mt-1 bg-dark-700 border border-dark-500 rounded-xl shadow-2xl min-w-[160px] overflow-hidden">
            <button onClick={() => assign(null)}
              className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-dark-600 hover:text-white transition-all">
              Sin juez
            </button>
            {judges.map(j => (
              <button key={j.id} onClick={() => assign(j.id)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-dark-600 transition-all truncate ${
                  j.id === team.assignedJudgeUid ? 'text-sky-400 bg-sky-500/10' : 'text-gray-300'
                }`}>
                {j.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function RSPTeamManagement() {
  const [teams, setTeams]   = useState([])
  const [judges, setJudges] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm]     = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'rsp_teams'), snap =>
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.name||'').localeCompare(b.name||'')))
    )
    // Load rsp judges
    const q = fsQuery(collection(db, 'users'), where('role', '==', 'judge'))
    const u2 = onSnapshot(q, snap => {
      setJudges(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => Array.isArray(u.modules) && u.modules.includes('rsp'))
      )
    })
    return () => { u1(); u2() }
  }, [])

  const openCreate = () => {
    setForm(EMPTY_FORM); setEditing(null); setShowForm(true)
  }
  const openEdit = (team) => {
    setForm({
      name: team.name || '', number: team.number || '',
      institution: team.institution || '',
      member1: team.member1 || '', member2: team.member2 || '',
      member3: team.member3 || '', member4: team.member4 || '',
      coach: team.coach || '',
    })
    setEditing(team.id); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM) }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = { ...form, category: 'open', updatedAt: serverTimestamp() }
      if (editing) {
        await updateDoc(doc(db, 'rsp_teams', editing), payload)
      } else {
        await addDoc(collection(db, 'rsp_teams'), { ...payload, createdAt: serverTimestamp() })
      }
      closeForm()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este equipo?')) return
    setDeleting(id)
    await deleteDoc(doc(db, 'rsp_teams', id))
    setDeleting(null)
  }

  const filtered = teams.filter(t =>
    !search ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.number?.toLowerCase().includes(search.toLowerCase()) ||
    t.institution?.toLowerCase().includes(search.toLowerCase())
  )

  const Field = ({ label, name, placeholder }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
      <input value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        placeholder={placeholder} className="input-field py-2 text-sm" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input className="input-field pl-9 py-2 text-sm" placeholder="Buscar equipo..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 py-2 text-sm">
          <Plus size={16} /> Nuevo equipo
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <Users size={14} />
        <span>{teams.length} equipo{teams.length !== 1 ? 's' : ''} · Open (11–19 años)</span>
      </div>

      {/* Team list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="card text-center py-10">
            <Users size={36} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{teams.length === 0 ? 'Sin equipos aún.' : 'Sin resultados.'}</p>
          </div>
        )}
        {filtered.map((team, i) => (
          <motion.div key={team.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }} className="card flex items-center gap-3">
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-xl ${cc.bg} border ${cc.border} flex items-center justify-center font-bold ${cc.text} text-sm shrink-0`}>
              {team.number || team.name?.[0]?.toUpperCase()}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-white text-sm truncate">{team.name}</p>
                {team.number && <span className="text-xs text-gray-500">#{team.number}</span>}
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400">Open</span>
              </div>
              {team.institution && <p className="text-xs text-gray-500 truncate">{team.institution}</p>}
              <div className="flex flex-wrap gap-1 mt-1">
                {[team.member1, team.member2, team.member3, team.member4].filter(Boolean).map((m, j) => (
                  <span key={j} className="text-xs px-1.5 py-0.5 rounded bg-dark-600 text-gray-400">{m}</span>
                ))}
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <JudgeSelector team={team} judges={judges} />
              <button onClick={() => openEdit(team)} className="text-gray-500 hover:text-sky-400 p-1.5 transition-colors">
                <Pencil size={15} />
              </button>
              <button onClick={() => handleDelete(team.id)} disabled={deleting === team.id}
                className="text-gray-500 hover:text-red-400 p-1.5 transition-colors disabled:opacity-40">
                <Trash2 size={15} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) closeForm() }}>
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-dark-800 border-b border-dark-600 px-5 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="font-bold text-white">{editing ? 'Editar equipo' : 'Nuevo equipo'}</h2>
                <button onClick={closeForm} className="text-gray-500 hover:text-white p-1"><X size={18} /></button>
              </div>
              <form onSubmit={handleSave} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Field label="Nombre del equipo *" name="name" placeholder="Ej: RoboAces" /></div>
                  <Field label="Número" name="number" placeholder="Ej: 42" />
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Categoría</label>
                    <div className="px-3 py-2 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 text-sm font-semibold">
                      Open · 11–19 años
                    </div>
                  </div>
                  <div className="col-span-2"><Field label="Institución" name="institution" placeholder="Colegio / Club" /></div>
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Miembros (2 robots = hasta 4 pilotos)</p>
                <div className="grid grid-cols-2 gap-3">
                  {['member1','member2','member3','member4'].map((f, i) => (
                    <Field key={f} label={`Piloto ${i+1}${i < 2 ? ' *' : ''}`} name={f} placeholder={`Nombre piloto ${i+1}`} />
                  ))}
                  <div className="col-span-2"><Field label="Coach / Entrenador" name="coach" placeholder="Nombre del coach" /></div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeForm} className="btn-ghost flex-1 text-sm py-2">Cancelar</button>
                  <button type="submit" disabled={saving || !form.name.trim()}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2">
                    {saving
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <><Save size={15} /> {editing ? 'Guardar' : 'Crear equipo'}</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
