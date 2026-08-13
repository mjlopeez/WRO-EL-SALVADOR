import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Plus, Trash2, Pencil, Check, X, AlertCircle, Search } from 'lucide-react'
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'

export default function InstitutionManagement() {
  const [institutions, setInstitutions] = useState([])
  const [search, setSearch]   = useState('')
  const [adding, setAdding]   = useState(false)
  const [newName, setNewName] = useState('')
  const [newCity, setNewCity] = useState('')
  const [saving, setSaving]   = useState(false)
  const [editId, setEditId]   = useState(null)
  const [editName, setEditName] = useState('')
  const [editCity, setEditCity] = useState('')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'institutions'), snap => {
      setInstitutions(
        snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))
      )
    })
    return unsub
  }, [])

  const filtered = institutions.filter(i =>
    !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.city?.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    await addDoc(collection(db, 'institutions'), { name: newName.trim(), city: newCity.trim(), createdAt: new Date().toISOString() })
    setNewName(''); setNewCity(''); setAdding(false); setSaving(false)
  }

  const handleEdit = async (id) => {
    if (!editName.trim()) return
    setSaving(true)
    await updateDoc(doc(db, 'institutions', id), { name: editName.trim(), city: editCity.trim() })
    setEditId(null); setSaving(false)
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    await deleteDoc(doc(db, 'institutions', id))
    setDeleting(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Instituciones</h1>
          <p className="text-gray-400 mt-1">{institutions.length} registrada(s)</p>
        </div>
        <button
          onClick={() => { setAdding(true); setNewName(''); setNewCity('') }}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={18} /> Nueva Institución
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="card flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1 font-medium">Nombre</label>
                <input
                  className="input-field py-2"
                  placeholder="Ej: Colegio San Ignacio"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  autoFocus
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1 font-medium">Ciudad</label>
                <input
                  className="input-field py-2"
                  placeholder="Ej: San Salvador"
                  value={newCity}
                  onChange={e => setNewCity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleAdd}
                  disabled={saving || !newName.trim()}
                  className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
                >
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Check size={15} /> Guardar</>
                  }
                </button>
                <button onClick={() => setAdding(false)} className="btn-ghost py-2 px-3 text-sm">
                  <X size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      {institutions.length > 0 && (
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            className="input-field pl-9 py-2 text-sm"
            placeholder="Buscar institución..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Warning if none */}
      {institutions.length === 0 && !adding && (
        <div className="card text-center py-12">
          <Building2 size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Sin instituciones registradas.</p>
          <p className="text-gray-500 text-sm mt-1">Agrega las instituciones antes de registrar equipos.</p>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {filtered.map(inst => (
          <motion.div
            key={inst.id}
            layout
            className="card-hover flex items-center gap-4"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-orange/15 flex items-center justify-center shrink-0">
              <Building2 size={16} className="text-brand-orange" />
            </div>

            {editId === inst.id ? (
              <>
                <input
                  className="input-field py-1.5 text-sm flex-1"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  autoFocus
                />
                <input
                  className="input-field py-1.5 text-sm flex-1"
                  placeholder="Ciudad"
                  value={editCity}
                  onChange={e => setEditCity(e.target.value)}
                />
                <button onClick={() => handleEdit(inst.id)} disabled={saving} className="text-green-400 hover:text-green-300 p-1">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditId(null)} className="text-gray-500 hover:text-white p-1">
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{inst.name}</p>
                  {inst.city && <p className="text-xs text-gray-500">{inst.city}</p>}
                </div>
                <button
                  onClick={() => { setEditId(inst.id); setEditName(inst.name); setEditCity(inst.city || '') }}
                  className="text-gray-600 hover:text-brand-orange transition-colors p-1"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(inst.id)}
                  disabled={deleting === inst.id}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                >
                  {deleting === inst.id
                    ? <span className="w-4 h-4 border-2 border-gray-500 border-t-red-400 rounded-full animate-spin inline-block" />
                    : <Trash2 size={15} />
                  }
                </button>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
