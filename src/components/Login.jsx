import { useState } from 'react'
import { motion } from 'framer-motion'
import { LogIn, Bot, Eye, EyeOff, AlertCircle, Flag } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  // Acepta usuario simple (ej: FE-01) o correo completo
  const resolveEmail = (input) => {
    const trimmed = input.trim()
    return trimmed.includes('@') ? trimmed : `${trimmed}@wro.sv`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(resolveEmail(email), password)
    } catch {
      setError('Usuario o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4">
      <div className="fixed top-20 left-20 w-64 h-64 bg-brand-orange/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-20 w-80 h-80 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-dark-700 border border-brand-orange/30 mb-4 glow-orange">
            <Flag size={40} className="text-brand-orange" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            WRO <span className="text-brand-orange">El Salvador</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Sistema de Evaluación 2026</p>
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            {[
              { label: 'RoboMission',      bg: 'bg-orange-500/15',  border: 'border-orange-500/40',  text: 'text-orange-400' },
              { label: 'RoboStarter',      bg: 'bg-green-500/15',   border: 'border-green-500/40',   text: 'text-green-400'  },
              { label: 'RoboSports',       bg: 'bg-sky-500/15',     border: 'border-sky-500/40',     text: 'text-sky-400'    },
              { label: 'Future Innovators',bg: 'bg-violet-500/15',  border: 'border-violet-500/40',  text: 'text-violet-400' },
              { label: 'Future Engineers', bg: 'bg-cyan-500/15',    border: 'border-cyan-500/40',    text: 'text-cyan-400'   },
            ].map(({ label, bg, border, text }) => (
              <span key={label} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${bg} ${border} ${text}`}>
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h2 className="text-xl font-bold mb-6 text-white">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5 font-medium">Correo electrónico / Usuario</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: FE-01 o admin@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5 font-medium">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><LogIn size={18} /> Entrar</>
              )}
            </motion.button>
          </form>
        </motion.div>

        <p className="text-center text-gray-600 text-xs mt-6">
          WRO El Salvador 2026 · Sistema de Evaluación
        </p>
      </motion.div>
    </div>
  )
}
