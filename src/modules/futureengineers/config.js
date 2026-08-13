// Future Engineers 2026 — Self-Driving Cars
// Single age group: 14-22 years
// Scoring: Documentation Rubric — 5 criteria × max 6 pts = 30 pts total
// Score options per criterion: 0 | 2 | 4 | 6

export const MAX_SCORE = 30
export const SCORE_OPTIONS = [6, 4, 2, 0] // descending for UI display

export const RUBRIC = [
  {
    id: 'mobility',
    label: 'Movilidad y diseño mecánico',
    shortLabel: 'Mecánica',
    description: 'Diseño del chasis, mecanismo de dirección, transmisión, par motor/velocidad, estabilidad.',
    levels: {
      6: 'Incluye razonamientos sobre par/velocidad, compensaciones de diseño, por qué se eligieron ciertos componentes, pruebas e iteraciones que afectan al rendimiento.',
      4: 'Explicación clara del chasis, transmisión y dirección; incluye diagramas; reproducible.',
      2: 'Describe el aspecto del robot; sin razonamientos ni diagramas.',
      0: 'No se proporcionó información o el contenido era irrelevante.',
    },
  },
  {
    id: 'power',
    label: 'Arquitectura de energía y sensores',
    shortLabel: 'Energía/Sensores',
    description: 'Sistema de alimentación, consumo de corriente, selección y ubicación de sensores, calibración, diagramas de cableado.',
    levels: {
      6: 'Incluye presupuesto energético, compensaciones de sensores, ubicación justificada por geometría del campo, método de calibración, puntos de fallo e iteración.',
      4: 'Diagrama de cableado; explicación de ubicación y selección de sensores; reproducible.',
      2: 'Enumera baterías/sensores; sin diagramas; explicación mínima.',
      0: 'No se proporciona información sobre alimentación ni sensores.',
    },
  },
  {
    id: 'software',
    label: 'Arquitectura de software y estrategia',
    shortLabel: 'Software',
    description: 'Modularidad del código, máquinas de estado, seguimiento de carril, lógica de obstáculos, algoritmos, documentación.',
    levels: {
      6: 'Máquina de estados con justificación; algoritmo explicado (PID, CV, IMU, etc.); manejo de casos extremos; proceso de prueba/ajuste; métricas de validación.',
      4: 'Diagrama de flujo; explicaciones de módulos/funciones; descripción de lógica de obstáculos; reproducible.',
      2: 'Descripción básica del software; detalles limitados sobre la estrategia.',
      0: 'Código pegado sin explicación.',
    },
  },
  {
    id: 'systems',
    label: 'Pensamiento sistémico y decisiones de ingeniería',
    shortLabel: 'Ing. de sistemas',
    description: 'Interacción de subsistemas, restricciones, compensaciones, ciclos de iteración, análisis de riesgos.',
    levels: {
      6: 'Restricciones explícitas, compensaciones, ciclos de iteración, análisis de riesgos/fallos, razonamiento "por qué X en lugar de Y" basado en datos.',
      4: 'Asignación clara de subsistemas; explicación de interacciones y restricciones.',
      2: 'Algunos razonamientos o descripciones; incompleto.',
      0: 'No se aprecia ningún proceso de toma de decisiones.',
    },
  },
  {
    id: 'github',
    label: 'Reproducibilidad y calidad de GitHub',
    shortLabel: 'GitHub',
    description: 'Estructura del repositorio, historial de commits (mín. 3), README ≥5000 chars, organización de archivos, CAD/cableado/código incluidos.',
    levels: {
      6: 'Sistema totalmente reproducible; estructura clara del proyecto; commits significativos; flujo de pruebas documentado; control de versiones o notas de lanzamiento.',
      4: 'README ≥5000 caracteres; commits correctos; CAD/código/cableado incluidos; reproducible.',
      2: 'El repositorio existe, pero mal estructurado; archivos parciales; poco claro.',
      0: 'GitHub falta, está dañado o incompleto.',
    },
  },
]

export function computeTotal(scores = {}) {
  return RUBRIC.reduce((acc, c) => acc + (scores[c.id] ?? 0), 0)
}

export const RESOURCES = [
  {
    url: 'https://fundesteam.nyc3.cdn.digitaloceanspaces.com/WRO2026-Reglas/FuturosIngenieros/ESPA%C3%91OL%20WRO-2026-Future-Engineers-Self-Driving-Cars-General-Rules-Final.pdf',
    label: 'Reglamento General FE 2026',
    icon: '📋',
    description: 'Reglas oficiales de Future Engineers Self-Driving Cars 2026',
  },
  {
    url: 'https://fundesteam.nyc3.cdn.digitaloceanspaces.com/WRO2026-Reglas/FuturosIngenieros/Espa%C3%B1ol-WRO-2026-Future-Engineers-Documentation-Rubric.pdf',
    label: 'Rúbrica de Documentación',
    icon: '📊',
    description: '5 criterios de evaluación — máx. 30 pts',
  },
  {
    url: 'https://fundesteam.nyc3.cdn.digitaloceanspaces.com/WRO2026-Reglas/FuturosIngenieros/WRO-2026_FutureEngineers_Playfield.pdf',
    label: 'Tapete Future Engineers',
    icon: '🗺️',
    description: 'Diseño oficial de la pista 2026',
  },
  {
    url: 'https://www.wroelsalvador.org/temporada-2026/categorías/future-engineers',
    label: 'WRO El Salvador — FE',
    icon: '🌐',
    description: 'Página oficial de la categoría en WRO El Salvador',
  },
  {
    url: 'https://drive.google.com/file/d/1IJEXWpP0N-TZuE2kj__HQJZUOQY-1Yf7/view',
    label: 'Material de apoyo',
    icon: '📁',
    description: 'Documento de referencia para jueces — Google Drive',
  },
]
