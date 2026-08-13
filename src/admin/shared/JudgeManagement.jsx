import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Trash2, Eye, EyeOff, X, CheckCircle, AlertCircle, Users, Pencil, Search, Check } from 'lucide-react'
import { collection, deleteDoc, doc, query, where, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { MODULE_LIST, MODULES } from '../../modules/index'

const SUBCATS = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'junior',     label: 'Junior'     },
  { value: 'senior',     label: 'Senior'     },
]

// Modules that use age-based subcategories
const MODULES_WITH_SUBCATS = new Set(['rm', 'fi', 'rs', 'rsp'])

const subcatColors = {
  elementary: 'bg-elementary/20 border-elementary text-elementary',
  junior:     'bg-junior/20 border-junior text-junior',
  senior:     'bg-senior/20 border-senior text-senior',
}

const emptyForm = { name: '', email: '', password: '', judgeId: '', module: 'rm', category: 'elementary' }

export default function JudgeManagement() {
  const { createJudge } = useAuth()
  const [judges, setJudges]       = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [msg, setMsg]             = useState(null)
  const [form, setForm]           = useState(emptyForm)
  const [showPass, setShowPass]   = useState(false)
  const [search, setSearch]       = useState('')
  const [filterModule, setFilterModule] = useState('all')
  const [filterCat, setFilterCat]       = useState('all')

  // Whether the selected module (in form or filter) uses subcategories
  const formModHasSubs   = MODULES_WITH_SUBCATS.has(form.module)
  const filterModHasSubs = filterModule !== 'all' && MODULES_WITH_SUBCATS.has(filterModule)

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'judge'))
    return onSnapshot(q, snap => setJudges(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  // Apply module + subcategory + search filters
  const filtered = judges.filter(j => {
    if (filterModule !== 'all' && !j.modules?.includes(filterModule)) return false
    if (filterModHasSubs && filterCat !== 'all' && j.category !== filterCat) return false
    if (!search) return true
    const q = search.toLowerCase()
    return j.name?.toLowerCase().includes(q) ||
      j.email?.toLowerCase().includes(q) ||
      j.judgeId?.toLowerCase().includes(q)
  })

  const openCreate = () => {
    setForm({ ...emptyForm, module: filterModule === 'all' ? 'rm' : filterModule })
    setEditingId(null); setShowPass(false); setShowForm(true)
  }

  const openEdit = (j) => {
    const primaryModule = j.modules?.[0] || 'rm'
    setForm({
      name: j.name || '', email: j.email || '', password: '',
      judgeId: j.judgeId || '',
      module: primaryModule,
      category: j.category || 'elementary',
    })
    setEditingId(j.id); setShowPass(false); setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditingId(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setMsg(null)
    try {
      const payload = {
        name: form.name,
        modules: [form.module],
        category: formModHasSubs ? form.category : null,
        judgeId: form.judgeId,
      }
      if (editingId) {
        await updateDoc(doc(db, 'users', editingId), payload)
        setMsg({ type: 'success', text: `Juez "${form.name}" actualizado.` })
      } else {
        await createJudge({ ...form, ...payload })
        setMsg({ type: 'success', text: `Juez "${form.name}" creado exitosamente.` })
      }
      closeForm()
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al guardar.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este juez?')) return
    await deleteDoc(doc(db, 'users', id))
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
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Jueces</h1>
          <p className="text-gray-400 mt-1">{filtered.length} de {judges.length} juez(ces)</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <UserPlus size={18} /> Nuevo Juez
        </button>
      </div>

      {/* Module filter */}
      <div className="flex gap-2 flex-wrap mb-3">
        <button
          onClick={() => { setFilterModule('all'); setFilterCat('all') }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            filterModule === 'all'
              ? 'bg-brand-orange/20 border-brand-orange/40 text-brand-orange'
              : 'border-dark-500 text-gray-500 hover:border-dark-400'
          }`}
        >
          Todos ({judges.length})
        </button>
        {MODULE_LIST.map(m => {
          const count = judges.filter(j => j.modules?.includes(m.id)).length
          return (
            <button key={m.id}
              onClick={() => { setFilterModule(m.id); setFilterCat('all') }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                filterModule === m.id
                  ? `${m.colorBg} ${m.colorBorder} ${m.colorText}`
                  : 'border-dark-500 text-gray-500 hover:border-dark-400'
              }`}
            >
              {m.emoji} {m.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Sub-category filter (only when filtered module has subcategories) */}
      {filterModHasSubs && (
        <div className="flex gap-2 flex-wrap mb-3">
          <button
            onClick={() => setFilterCat('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filterCat === 'all'
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
                : 'border-dark-500 text-gray-500 hover:border-dark-400'
            }`}
          >
            Todas las categorías
          </button>
          {SUBCATS.map(({ value, label }) => {
            const count = judges.filter(j => j.modules?.includes(filterModule) && j.category === value).length
            return (
              <button key={value}
                onClick={() => setFilterCat(value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  filterCat === value ? subcatColors[value] : 'border-dark-500 text-gray-500 hover:border-dark-400'
                }`}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          className="input-field pl-9 py-2 text-sm"
          placeholder="Buscar por nombre, email o ID..."
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
              msg.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {msg.text}
            <button onClick={() => setMsg(null)} className="ml-auto"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Judge list */}
      {judges.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={48} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No hay jueces registrados aún.</p>
          <button onClick={openCreate} className="btn-ghost mt-4 inline-flex items-center gap-2">
            <UserPlus size={16} /> Crear el primero
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-400 text-sm">Sin resultados.</p>
          <button onClick={() => { setSearch(''); setFilterModule('all'); setFilterCat('all') }}
            className="btn-ghost mt-3 text-sm py-1.5 px-4">Limpiar filtros</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((j, i) => {
            const mod = MODULE_LIST.find(m => j.modules?.includes(m.id))
            return (
              <motion.div
                key={j.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card-hover flex items-center gap-3 flex-wrap"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-orange/20 flex items-center justify-center font-bold text-brand-orange shrink-0">
                  {j.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{j.name}</p>
                  <p className="text-xs text-gray-400 truncate">{j.email}</p>
                </div>
                {/* Module badge */}
                {mod && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${mod.colorBg} ${mod.colorText} ${mod.colorBorder}`}>
                    {mod.emoji} {mod.label}
                  </span>
                )}
                {/* Sub-category badge */}
                {j.category && mod && MODULES_WITH_SUBCATS.has(mod.id) && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${subcatColors[j.category] || 'bg-dark-600 border-dark-500 text-gray-400'}`}>
                    {j.category}
                  </span>
                )}
                {j.judgeId && (
                  <span className="text-xs text-gray-500 font-mono bg-dark-600 px-2 py-0.5 rounded-lg shrink-0">#{j.judgeId}</span>
                )}
                <button onClick={() => openEdit(j)} className="text-gray-600 hover:text-brand-orange transition-colors p-1 shrink-0">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(j.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1 shrink-0">
                  <Trash2 size={15} />
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Modal ────────────────────────────────────────────── */}
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
                <h2 className="text-xl font-bold">{editingId ? 'Editar Juez' : 'Nuevo Juez'}</h2>
                <button onClick={closeForm} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5 font-medium">Nombre completo</label>
                  <input className="input-field" placeholder="Ej: María García" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>

                {/* ID de Juez */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5 font-medium">ID de Juez (opcional)</label>
                  <input className="input-field" placeholder="Ej: J01" value={form.judgeId}
                    onChange={e => setForm(f => ({ ...f, judgeId: e.target.value }))} />
                </div>

                {/* Módulo (single select) */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-medium">Categoría / Módulo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MODULE_LIST.map(m => (
                      <button key={m.id} type="button"
                        onClick={() => setForm(f => ({ ...f, module: m.id }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                          form.module === m.id
                            ? `${m.colorBg} ${m.colorBorder} ${m.colorText}`
                            : 'border-dark-500 text-gray-400 hover:border-dark-400'
                        }`}
                      >
                        <span>{m.emoji}</span> {m.label}
                        {form.module === m.id && <Check size={13} className="ml-auto shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-categoría (solo si el módulo la usa) */}
                {formModHasSubs && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 font-medium">Categoría de edad</label>
                    <div className="grid grid-cols-3 gap-2">
                      {SUBCATS.map(({ value, label }) => (
                        <button key={value} type="button"
                          onClick={() => setForm(f => ({ ...f, category: value }))}
                          className={`py-2 px-3 rounded-xl text-sm font-semibold border transition-all ${
                            form.category === value ? subcatColors[value] : 'border-dark-500 text-gray-400 hover:border-dark-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email + Password (solo al crear) */}
                {!editingId && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5 font-medium">Correo electrónico</label>
                      <input type="email" className="input-field" placeholder="juez@ejemplo.com"
                        value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5 font-medium">Contraseña temporal</label>
                      <div className="relative">
                        <input type={showPass ? 'text' : 'password'} className="input-field pr-12"
                          placeholder="Mínimo 6 caracteres" value={form.password}
                          onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
                        <button type="button" onClick={() => setShowPass(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {editingId && (
                  <p className="text-xs text-gray-500 bg-dark-700 rounded-xl px-3 py-2">
                    El correo y contraseña se gestionan desde la consola de Firebase.
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeForm} className="btn-ghost flex-1">Cancelar</button>
                  <button type="submit" disabled={loading}
                    className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {loading
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : editingId ? <><Pencil size={16} /> Guardar</> : <><UserPlus size={16} /> Crear</>
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
