// RoboStarter 2026 — WRO El Salvador
// Disciplina: RoboStarter (Kids Elementary 5–7 años / Kids Junior 7–10 años)
// Hardware/Software: Robo Robo
// Puntuación: solo misiones de tapete (sin documentación)

export const CATEGORIES = ['elementary', 'junior']

export const CATEGORY_META = {
  elementary: { label: 'Kids Elementary', ages: '5–7 años',  born: '2019–2021' },
  junior:     { label: 'Kids Junior',     ages: '7–10 años', born: '2016–2019' },
}

export const ROUNDS = [1, 2, 3]
export const MISSION_MAX = 200   // Elementary: puntaje libre (referencia)

// ── Junior — WRO 2026 "Robots Meet Culture" ───────────────────────────────────
// Puntaje máximo de misión: 170 pts
// 4.1 Micrófono: 20 | Instrumentos ×3: 45 | 4.2 Cables ×2: 30
// 4.3 Bocinas ×2: 40 | 4.4 Notas ×2: 20 | 4.5 Clave: 15
export const JUNIOR_MISSION_MAX = 170

/** Estado inicial de todas las misiones Junior */
export const JUNIOR_MISSION_DEFAULTS = {
  microfono:    0,  // 0 | 10 | 20
  instrumento1: 0,  // 0 | 15
  instrumento2: 0,  // 0 | 15
  instrumento3: 0,  // 0 | 15
  cable1:       0,  // 0 | 5  | 15
  cable2:       0,  // 0 | 5  | 15
  bocina1:      0,  // 0 | 5  | 20
  bocina2:      0,  // 0 | 5  | 20
  nota_verde:   0,  // 0 | 5  | 10
  nota_roja:    0,  // 0 | 5  | 10
  clave:        0,  // 0 | 5  | 15
}

/** Suma todos los campos de la misión Junior */
// Compatibilidad con imports existentes — documentación eliminada del reglamento
export const DOC_RUBRIC = []
export const DOC_MAX = 0

export function calcJuniorMissionScore(m = {}) {
  return (
    (m.microfono    || 0) +
    (m.instrumento1 || 0) + (m.instrumento2 || 0) + (m.instrumento3 || 0) +
    (m.cable1       || 0) + (m.cable2       || 0) +
    (m.bocina1      || 0) + (m.bocina2      || 0) +
    (m.nota_verde   || 0) + (m.nota_roja    || 0) +
    (m.clave        || 0)
  )
}
