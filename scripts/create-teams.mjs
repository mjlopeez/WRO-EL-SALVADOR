// Script para crear equipos de prueba en todos los módulos
// Uso: node scripts/create-teams.mjs <admin-email> <admin-password>

import https from 'https'

const API_KEY    = 'AIzaSyDppwpi3BxHgrk_e2lLFqLdOjLlM8mJgTE'
const PROJECT_ID = 'wro-el-salvador-2026'

const ADMIN_EMAIL    = process.argv[2]
const ADMIN_PASSWORD = process.argv[3]

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌  Uso: node scripts/create-teams.mjs <admin-email> <admin-password>')
  process.exit(1)
}

// ─── Equipos por módulo ───────────────────────────────────────────────────────

const RM_TEAMS = [
  { name: 'Alpha Bots',    number: 'RM-E01', category: 'elementary', school: 'Colegio San Ignacio',     city: 'San Salvador', member1: 'Ana García',    member2: 'Luis Martínez',   member3: 'Sofía López',    coach: 'Profa. Ramírez'   },
  { name: 'Beta Builders', number: 'RM-J01', category: 'junior',     school: 'Instituto Nacional',      city: 'Santa Ana',    member1: 'Carlos Pérez',  member2: 'María Rodríguez', member3: 'Diego Hernández',coach: 'Prof. Gutiérrez'  },
  { name: 'Gamma Squad',   number: 'RM-S01', category: 'senior',     school: 'Universidad Don Bosco',   city: 'Soyapango',    member1: 'Valeria Cruz',  member2: 'Andrés Torres',   member3: 'Camila Flores',  coach: 'Ing. Morales'     },
]

const RS_TEAMS = [
  { name: 'Mini Stars',   number: 'RS-E01', category: 'elementary', school: 'Colegio Externado San José', city: 'San Salvador', member1: 'Pablo Ruiz',   member2: 'Lucia Mendez',  member3: 'Tomás Díaz',   coach: 'Profa. Aguilar' },
  { name: 'Junior Robo',  number: 'RS-J01', category: 'junior',     school: 'Colegio Champagnat',         city: 'San Miguel',   member1: 'Elena Vargas', member2: 'Mario Salinas', member3: 'Juana Reyes',  coach: 'Prof. Castillo' },
]

const RSP_TEAMS = [
  { name: 'Speed Racers',  number: 'RSP-01', category: 'open', school: 'ITCA-FEPADE',              city: 'San Salvador', member1: 'Roberto Fuentes', member2: 'Claudia Nava',  member3: 'Felipe Orellana', member4: 'Sandra Lima',   coach: 'Ing. Pérez'   },
  { name: 'Turbo Bots',    number: 'RSP-02', category: 'open', school: 'Universidad Centroamericana', city: 'Antiguo Cuscatlán', member1: 'Kevin Mora', member2: 'Patricia Lara', member3: 'Iván Portillo', member4: '', coach: 'Profa. Velásquez' },
]

const FI_TEAMS = [
  { name: 'Innovate E',   number: 'FI-E01', category: 'elementary', school: 'Colegio García Flamenco', city: 'San Salvador', member1: 'Renata Blanco', member2: 'Óscar Mendoza', member3: 'Isis Chávez',  coach: 'Profa. Fuentes', assignedJudgeUids: [] },
  { name: 'Innovate J',   number: 'FI-J01', category: 'junior',     school: 'Colegio Bautista',         city: 'Santa Tecla',  member1: 'Camilo Torres', member2: 'Laura Pineda',  member3: 'Sergio Cruz',  coach: 'Prof. Bonilla',  assignedJudgeUids: [] },
  { name: 'Innovate S',   number: 'FI-S01', category: 'senior',     school: 'UES',                      city: 'San Salvador', member1: 'Natalia Ramos', member2: 'Rodrigo Ponce', member3: 'Diana Leiva',  coach: 'Lic. Martínez',  assignedJudgeUids: [] },
]

const FE_TEAMS = [
  { name: 'AutoDrive SV', number: 'FE-01', school: 'Universidad Galileo SV',    city: 'San Salvador',      member1: 'Hugo Escobar',  member2: 'Rebeca Núñez',   member3: 'Emilio Vásquez', coach: 'Ing. Domínguez', githubUrl: 'https://github.com/example/autodrive' },
  { name: 'RoboCode SV',  number: 'FE-02', school: 'Universidad de El Salvador', city: 'Ciudad Universitaria', member1: 'Ximena Portillo', member2: 'Saúl Bonilla', member3: '',               coach: 'Ing. Serrano',   githubUrl: '' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function request(opts, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = https.request({
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(opts.headers || {}),
      },
    }, res => {
      let raw = ''
      res.on('data', d => raw += d)
      res.on('end', () => resolve(JSON.parse(raw)))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function signIn(email, password) {
  const res = await request({
    hostname: 'identitytoolkit.googleapis.com',
    path: `/v1/accounts:signInWithPassword?key=${API_KEY}`,
    method: 'POST',
  }, { email, password, returnSecureToken: true })
  if (res.error) throw new Error(`Login error: ${res.error.message}`)
  return res.idToken
}

function toField(val) {
  if (val === null || val === undefined) return { nullValue: null }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (Array.isArray(val)) return { arrayValue: { values: val.map(v => toField(v)) } }
  return { stringValue: String(val) }
}

async function createDoc(collection, fields, idToken) {
  const fsFields = {}
  for (const [k, v] of Object.entries(fields)) fsFields[k] = toField(v)
  fsFields.createdAt = { stringValue: new Date().toISOString() }

  const res = await request({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}`,
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  }, { fields: fsFields })

  return res
}

async function runModule(label, collection, teams, idToken) {
  console.log(`\n── ${label} (${collection}) ──`)
  for (const team of teams) {
    const res = await createDoc(collection, team, idToken)
    if (res.error) {
      console.error(`  ❌ ${team.name}: ${res.error.message}`)
    } else {
      const cat = team.category ? ` [${team.category}]` : ''
      console.log(`  ✅ ${team.number}${cat} ${team.name} · ${team.school}`)
    }
    await new Promise(r => setTimeout(r, 250))
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

;(async () => {
  console.log('Iniciando sesión como admin...')
  const idToken = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD)
  console.log('✅  Sesión iniciada')

  await runModule('RoboMission',       'rm_teams',  RM_TEAMS,  idToken)
  await runModule('RoboStarter',       'rs_teams',  RS_TEAMS,  idToken)
  await runModule('RoboSports',        'rsp_teams', RSP_TEAMS, idToken)
  await runModule('Future Innovators', 'fi_teams',  FI_TEAMS,  idToken)
  await runModule('Future Engineers',  'fe_teams',  FE_TEAMS,  idToken)

  console.log('\n✅  Todos los equipos creados.\n')
  console.log('Resumen:')
  console.log(`  RM  : ${RM_TEAMS.length} equipos  (elementary, junior, senior)`)
  console.log(`  RS  : ${RS_TEAMS.length} equipos  (elementary, junior)`)
  console.log(`  RSP : ${RSP_TEAMS.length} equipos  (open)`)
  console.log(`  FI  : ${FI_TEAMS.length} equipos  (elementary, junior, senior)`)
  console.log(`  FE  : ${FE_TEAMS.length} equipos  (sin categoría)`)
})()
