import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Write an entry to the audit_logs Firestore collection.
 *
 * @param {object} params
 * @param {string} params.action      - 'save_draft' | 'finalize' | 'admin_unlock' | 'admin_delete'
 * @param {string} params.module      - 'rm' | 'fi' | 'rs' | 'fe' | 'rsp'
 * @param {object} params.actor       - { uid, name, role }
 * @param {object} [params.team]      - { id, name, number } — the affected team
 * @param {string} [params.round]     - round/phase label if applicable
 * @param {number} [params.totalBefore]
 * @param {number} [params.totalAfter]
 * @param {object} [params.fieldDiff] - map of changed field keys to { before, after }
 * @param {object} [params.extra]     - any additional context to store
 */
export async function writeAuditLog({
  action,
  module,
  actor,
  team = null,
  round = null,
  totalBefore = null,
  totalAfter = null,
  fieldDiff = null,
  extra = null,
}) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      action:      action || 'unknown',
      module:      module || '',
      actor: {
        uid:  actor?.uid  || '',
        name: actor?.name || '',
        role: actor?.role || '',
      },
      team: team ? {
        id:     team.id     || '',
        name:   team.name   || '',
        number: team.number || '',
      } : null,
      round:       round       ?? null,
      totalBefore: totalBefore ?? null,
      totalAfter:  totalAfter  ?? null,
      fieldDiff:   fieldDiff   ?? null,
      extra:       extra        ?? null,
      timestamp:   serverTimestamp(),
    })
  } catch (err) {
    // Audit log failures are silent — never block the main action
    console.warn('auditLog: failed to write', err)
  }
}

/**
 * Human-readable label per action type.
 */
export const ACTION_LABELS = {
  save_draft:    'Borrador guardado',
  finalize:      'Evaluación finalizada',
  admin_unlock:  'Reabierto por admin',
  admin_delete:  'Eliminado por admin',
  publish:       'Resultados publicados',
}

/**
 * Tailwind classes (text + bg) per action type.
 */
export const ACTION_COLORS = {
  save_draft:   { text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  finalize:     { text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
  admin_unlock: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  admin_delete: { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
  publish:      { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
}
