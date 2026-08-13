import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, Trash2, Pencil, X, Search, AlertCircle,
  CheckCircle, UserCheck, UserX
} from 'lucide-react'
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  onSnapshot, query, where, serverTimestamp
} from 'firebase/firestore'
import { db } from '../../firebase'
import { CATEGORIES, CATEGORY_META } from './config'

const catColors = {
  elementary: 'bg-elementary/10 border-elementary/30 text-elementary',
  junior:     'bg-junior/10 border-junior/30 text-junior',
  senior:     'bg-senior/10 border-senior/30 text-senior',
}

const emptyForm = { name: '', category: 'elementary', judgeUids: [] }

export default function FIPairManagement() {
  const [pairs, setPairs]     = useState([])
  const [judges, setJudges]   = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]   = useState(null)
  const [form, setForm]       = useState(emptyForm)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'fi_pairs'), snap =>
      setPairs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    const u2 = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'judge')),
      snap => setJudges(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    return () => { u1(); u2() }
  }, [])

  // Judges available for the selected category and FI module
  const availableJudges = judges.filter(j =>
    j.modules?.includes('fi') && j.category === form.category
  )

  const filteredPairs = pairs.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.judges?.some(j => j.name?.toLowerCase().includes(search.toLowerCase()))
  )

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true) }
  const openEdit = p => {
    setForm({
      name: p.name || '',
      category: p.category || 'elementary',
      judgeUids: p.judgeUids || [],
    })
    setEditId(p.id)
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditId(null) }

  const toggleJudge = (uid) => {
    setForm(f => {
      if (f.judgeUids.includes(uid)) {
        return { ...f, judgeUids: f.judgeUids.filter(u => u !== uid) }
      }
      if (f.judgeUids.length >= 2) return f // max 2
      return { ...f, judgeUids: [...f.judgeUids, uid] }
    })
  }

  const showMsg = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.judgeUids.length !== 2) {
      showMsg('error', 'Selecciona exactamente 2 jueces para la pareja.')
      return
    }
    setSaving(true)
    try {
      const judgesData = form.judgeUids.map(uid => {
        const j = judges.find(x => x.id === uid)
        return { uid, name: j?.name || uid }
      })
      const payload = {
        name: form.name,
        category: form.category,
        judgeUids: form.judgeUids,
        judges: judgesData,
        updatedAt: serverTimestamp(),
      }
      if (editId) {
        await updateDoc(doc(db, 'fi_pairs', editId), payload)
        showMsg('success', `Pareja "${form.name}" actualizada.`)
      } else {
        await addDoc(collection(db, 'fi_pairs'), { ...payload, createdAt: serverTimestamp() })
        showMsg('success', `Pareja "${form.name}" creada.`)
      }
      closeForm()
    } catch (err) {
      showMsg('error', err.message || 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async id => {
    if (!confirm('¿Eliminar esta pareja? Los puntajes de sus jueces se mantienen.')) return
    setDeleting(id)
    await deleteDoc(doc(db, 'fi_pairs', id))
    setDeleting(null)
  }

  const countsByCategory = {}
  CATEGORIES.forEach(c => { countsByCategory[c] = pairs.filter(p => p.category === c).length })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Grupos de Jueces · FI</h1>
          <p className="text-gray-400 mt-1">{pairs.length} parejas · {judges.filter(j => j.modules?.includes('fi')).length} jueces FI</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <Plus size={18} /> Nueva Pareja
        </button>
      </div>

      {/* Category summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {CATEGORIES.map(cat => {
          const cc = catColors[cat]
          return (
            <div key={cat} className={`card ${cc.replace('text-', 'bg-').replace('bg-', 'bg-')} text-center py-3`}>
              <p className={`text-xl font-extrabold ${cc.split(' ').find(c => c.startsWith('text-'))}`}>
                {countsByCategory[cat]}
              </p>
              <p className="text-xs text-gray-500">{CATEGORY_META[cat].label}</p>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          className="input-field pl-9 py-2 text-sm"
          placeholder="Buscar pareja o juez..."
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

      {/* Pairs list */}
      {pairs.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={48} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No hay parejas creadas aún.</p>
          <button onClick={openCreate} className="btn-ghost mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> Crear primera pareja
          </button>
        </div>
      ) : filteredPairs.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-400 text-sm">Sin resultados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPairs.map((pair, i) => {
            const cc = catColors[pair.category] || catColors.elementary
            return (
              <motion.div
                key={pair.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card-hover flex items-center gap-3"
              >
                {/* Category dot */}
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${cc}`}>
                  <Users size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{pair.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border capitalize ${cc}`}>
                      {CATEGORY_META[pair.category]?.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {pair.judges?.map(j => j.name).join(' · ') || 'Sin jueces'}
                    </span>
                  </div>
                </div>

                {/* Judge count indicator */}
                <div className="flex items-center gap-1 shrink-0">
                  {[0, 1].map(idx => (
                    pair.judges?.[idx]
                      ? <UserCheck key={idx} size={16} className="text-green-400" />
                      : <UserX key={idx} size={16} className="text-gray-600" />
                  ))}
                </div>

                <button onClick={() => openEdit(pair)} className="text-gray-600 hover:text-violet-400 transition-colors p-1">
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(pair.id)}
                  disabled={deleting === pair.id}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                >
                  {deleting === pair.id
                    ? <span className="w-4 h-4 border-2 border-gray-500 border-t-red-400 rounded-full animate-spin inline-block" />
                    : <Trash2 size={15} />
                  }
                </button>
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
                <h2 className="text-xl font-bold">{editId ? 'Editar Pareja' : 'Nueva Pareja'}</h2>
                <button onClick={closeForm} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5 font-medium">Nombre de la pareja</label>
                  <input
                    className="input-field"
                    placeholder="Ej: Pareja A"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-medium">Categoría que evaluarán</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c} type="button"
                        onClick={() => setForm(f => ({ ...f, category: c, judgeUids: [] }))}
                        className={`py-2 px-3 rounded-xl text-sm font-semibold border transition-all ${
                          form.category === c ? catColors[c] : 'border-dark-500 text-gray-400 hover:border-dark-400'
                        }`}
                      >
                        {CATEGORY_META[c].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Judge picker */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-medium">
                    Jueces ({form.judgeUids.length}/2)
                    <span className="text-gray-600 ml-1 font-normal">— Selecciona exactamente 2</span>
                  </label>

                  {availableJudges.length === 0 ? (
                    <div className="card bg-dark-700 text-center py-4">
                      <p className="text-xs text-gray-500">
                        No hay jueces con módulo FI y categoría {CATEGORY_META[form.category].label}.<br />
                        <span className="text-gray-600">Ve a Jueces → asigna el módulo FI y la categoría.</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {availableJudges.map(j => {
                        const selected = form.judgeUids.includes(j.id)
                        const disabled = !selected && form.judgeUids.length >= 2
                        return (
                          <button
                            key={j.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleJudge(j.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                              selected
                                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                                : disabled
                                  ? 'border-dark-600 text-gray-600 cursor-not-allowed'
                                  : 'border-dark-500 text-gray-300 hover:border-dark-400 hover:bg-dark-600'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-dark-500 flex items-center justify-center font-bold text-xs shrink-0">
                              {j.name?.[0]?.toUpperCase()}
                            </div>
                            <span className="flex-1 text-left font-medium">{j.name}</span>
                            {j.judgeId && <span className="text-xs text-gray-500 font-mono">#{j.judgeId}</span>}
                            {selected && <CheckCircle size={14} className="text-violet-400 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeForm} className="btn-ghost flex-1">Cancelar</button>
                  <button
                    type="submit"
                    disabled={saving || form.judgeUids.length !== 2}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
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
