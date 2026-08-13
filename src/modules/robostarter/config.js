// RoboStarter 2026 — WRO El Salvador
// Categoría formativa (no clasifica a final internacional)
// Hardware/Software: Robo Robo

export const CATEGORIES = ['elementary', 'junior']

export const CATEGORY_META = {
  elementary: { label: 'Kids Elementary', ages: '5–7 años',  born: '2019–2021' },
  junior:     { label: 'Kids Junior',     ages: '7–10 años', born: '2016–2019' },
}

export const ROUNDS = [1, 2, 3]
export const MISSION_MAX = 200   // puntos máximos por ronda (referencia)

// Rúbrica de Documentación (según sitio WRO El Salvador)
export const DOC_RUBRIC = [
  { id: 'robot_design',  label: 'Diseño del robot',       maxPts: 20, hint: 'Descripción de cómo construyeron su robot' },
  { id: 'programming',   label: 'Programación',            maxPts: 20, hint: 'Explicación del software y la lógica utilizada' },
  { id: 'testing',       label: 'Pruebas y ajustes',       maxPts: 20, hint: 'Proceso de prueba, errores encontrados y mejoras' },
  { id: 'presentation',  label: 'Presentación',            maxPts: 20, hint: 'Claridad, orden y calidad de la presentación oral' },
  { id: 'teamwork',      label: 'Trabajo en equipo',       maxPts: 20, hint: 'Colaboración, roles y participación de todos los miembros' },
]
export const DOC_MAX = DOC_RUBRIC.reduce((s, c) => s + c.maxPts, 0) // 100
