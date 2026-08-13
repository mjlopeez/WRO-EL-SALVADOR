// RoboSports 2026 — WRO El Salvador
// Disciplina: WRO RoboSports (Double Tennis)
// Categoría única: Open (11–19 años)
// 2 robots por equipo
// Formato de partido: mejor de 3 sets (primero en ganar 2 sets gana el partido)

export const CATEGORY = 'open'
export const CATEGORY_META = {
  open: { label: 'Open', ages: '11–19 años', born: '2007–2015' }
}

export const SPORT = 'Double Tennis'

// Cantidad máxima de sets por partido (puede terminar antes)
export const SETS_PER_MATCH = 3
export const SETS_TO_WIN    = 2  // ganar 2 de 3 para ganar el partido

// Rondas de clasificación
export const ROUNDS = ['Fase 1', 'Fase 2', 'Semifinal', 'Final']
