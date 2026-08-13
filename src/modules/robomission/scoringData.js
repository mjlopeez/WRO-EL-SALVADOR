// WRO 2026 RoboMission — Misiones extraídas de los PDFs oficiales

export const ELEMENTARY_MISSIONS = [
  { id: 'm1', title: '1. Conectar el amplificador con los altavoces', description: 'Colocar los cables en las zonas grises entre los altavoces y el amplificador.', items: [
    { id: 'm1_a', label: 'Cable completamente en zona gris y en posición vertical', count: true, max: 2, perItem: 15, totalMax: 30 },
    { id: 'm1_b', label: 'Cable solo parcialmente en zona gris o no vertical', count: true, max: 2, perItem: 5, totalMax: null, mutualWith: 'm1_a', note: 'Los cables no puntúan en ambas filas' },
  ]},
  { id: 'm2', title: '2. Preparar el espectáculo', description: 'Asegurarse de tener instrumentos y micrófono listos para el espectáculo.', items: [
    { id: 'm2_a', label: 'Micrófono completamente en área objetivo y en posición vertical', count: false, max: 1, perItem: 20, totalMax: 20 },
    { id: 'm2_b', label: 'Micrófono solo parcialmente dentro o no en posición vertical', count: false, max: 1, perItem: 10, totalMax: null, mutualWith: 'm2_a' },
    { id: 'm2_c', label: 'Instrumento completamente en la zona detrás del escenario', count: true, max: 3, perItem: 15, totalMax: 45 },
  ]},
  { id: 'm3', title: '3. Reproducir la canción', description: 'Colocar las notas en los pentagramas (6 notas: roja, azul, verde, amarilla, blanca, negra).', items: [
    { id: 'm3_a', label: 'Nota completamente en zona del color correspondiente y vertical', count: true, max: 6, perItem: 20, totalMax: 120 },
    { id: 'm3_b', label: 'Nota parcialmente en zona correcta o no vertical', count: true, max: 6, perItem: 10, totalMax: null, mutualWith: 'm3_a', note: 'Por nota: se aplica solo una puntuación' },
  ]},
  { id: 'm4', title: '4. Puntos extra', description: 'Objetos no movidos ni dañados durante la carrera.', items: [
    { id: 'm4_a', label: 'La clave no está dañada ni movida', count: false, max: 1, perItem: 10, totalMax: 10 },
    { id: 'm4_b', label: 'Cada altavoz no está dañado ni movido', count: true, max: 2, perItem: 10, totalMax: 20 },
    { id: 'm4_c', label: 'El amplificador no está dañado ni movido', count: false, max: 1, perItem: 10, totalMax: 10 },
  ]},
]
export const ELEMENTARY_MAX = 255

export const JUNIOR_MISSIONS = [
  { id: 'm1', title: '1. Mostrar a los visitantes', description: 'Colocar los 4 visitantes en la zona del color correspondiente.', items: [
    { id: 'm1_a', label: 'Visitante completamente en zona del color correspondiente y vertical', count: true, max: 4, perItem: 10, totalMax: 40 },
    { id: 'm1_b', label: 'Visitante parcialmente en zona del color o no de pie', count: true, max: 4, perItem: 5, totalMax: null, mutualWith: 'm1_a' },
  ]},
  { id: 'm2', title: '2. Reconstruir las torres', description: 'Reconstruir las torres rojas y amarillas en sus zonas objetivo.', items: [
    { id: 'm2_a', label: 'Torre roja completamente en área objetivo roja y vertical', count: true, max: 2, perItem: 15, totalMax: 30 },
    { id: 'm2_b', label: 'Torre roja parcialmente en área objetivo roja y vertical', count: true, max: 2, perItem: 10, totalMax: null, mutualWith: 'm2_a' },
    { id: 'm2_c', label: 'Torre amarilla correctamente colocada (base completamente en área amarilla)', count: true, max: 2, perItem: 25, totalMax: 50 },
    { id: 'm2_d', label: 'Torre amarilla correctamente colocada (base solo parcialmente en área amarilla)', count: true, max: 2, perItem: 15, totalMax: null, mutualWith: 'm2_c' },
  ]},
  { id: 'm3', title: '3. Traer los artefactos al museo', description: 'Colocar artefactos en los lugares de exposición del color correspondiente.', items: [
    { id: 'm3_a', label: 'Artefacto completamente en lugar de exposición del color correspondiente y vertical', count: true, max: 4, perItem: 15, totalMax: 60 },
    { id: 'm3_b', label: 'Artefacto parcialmente en lugar de exposición o no vertical', count: true, max: 4, perItem: 5, totalMax: null, mutualWith: 'm3_a' },
  ]},
  { id: 'm4', title: '4. Limpiar los adoquines', description: '10 partículas de suciedad colocadas aleatoriamente en los adoquines.', items: [
    { id: 'm4_a', label: 'Partícula de suciedad que NO toca la zona de adoquines', count: true, max: 10, perItem: 2, totalMax: 20 },
  ]},
  { id: 'm5', title: '5. Puntos extra', description: 'Objetos no movidos ni dañados durante la carrera.', items: [
    { id: 'm5_a', label: 'Barrera no dañada ni movida', count: true, max: 2, perItem: 10, totalMax: 20 },
    { id: 'm5_b', label: 'Loro no dañado ni movido', count: false, max: 1, perItem: 10, totalMax: 10 },
  ]},
]
export const JUNIOR_MAX = 230

export const SENIOR_MISSIONS = [
  { id: 'm1', title: '1. Proporcionar las herramientas', description: 'Colocar las herramientas de construcción en las áreas correctas.', items: [
    { id: 'm1_a', label: 'Llana rectangular completamente en el área de patrocinadores', count: false, max: 1, perItem: 15, totalMax: 15 },
    { id: 'm1_b', label: 'Llana rectangular parcialmente en el área de patrocinadores', count: false, max: 1, perItem: 5, totalMax: null, mutualWith: 'm1_a' },
    { id: 'm1_c', label: 'Cuenco de cemento completamente en el espacio de estacionamiento', count: false, max: 1, perItem: 15, totalMax: 15 },
    { id: 'm1_d', label: 'Cuenco de cemento parcialmente en el espacio de estacionamiento', count: false, max: 1, perItem: 5, totalMax: null, mutualWith: 'm1_c' },
    { id: 'm1_e', label: 'Paleta de albañilería completamente en el área de inicio', count: false, max: 1, perItem: 15, totalMax: 15 },
    { id: 'm1_f', label: 'Paleta de albañilería parcialmente en el área de inicio', count: false, max: 1, perItem: 5, totalMax: null, mutualWith: 'm1_e' },
  ]},
  { id: 'm2', title: '2. Colocar el mosaico en su lugar', description: 'Colocar los 12 mosaicos correctamente en los marcos correspondientes.', items: [
    { id: 'm2_a', label: 'Mosaico colocado correctamente en el marco', count: true, max: 12, perItem: 10, totalMax: 120 },
    { id: 'm2_b', label: 'Mosaico colocado incorrectamente en el marco', count: true, max: 12, perItem: 5, totalMax: null, mutualWith: 'm2_a' },
  ]},
  { id: 'm3', title: '3. Entregar el cemento', description: '40 elementos de cemento de colores en sus áreas objetivo correspondientes.', items: [
    { id: 'm3_a', label: 'Elemento de cemento completamente en área objetivo del color correspondiente', count: true, max: 40, perItem: 1, totalMax: 40 },
  ]},
  { id: 'm4', title: '4. Bonificación por barreras', description: 'Las 4 barreras no deben ser dañadas ni movidas durante la carrera.', items: [
    { id: 'm4_a', label: 'Barrera no dañada ni movida', count: true, max: 4, perItem: 7, totalMax: 28 },
  ]},
]
export const SENIOR_MAX = 233
