/**
 * setup-real-data.mjs
 * Borra todos los equipos/jueces de prueba y crea los datos reales del PDF.
 * Pre-asigna jueces a equipos para que cada juez vea sus equipos desde el inicio.
 * Uso: node scripts/setup-real-data.mjs <admin-email> <admin-password>
 */

import https from 'https'

const API_KEY    = 'AIzaSyDppwpi3BxHgrk_e2lLFqLdOjLlM8mJgTE'
const PROJECT_ID = 'wro-el-salvador-2026'

const ADMIN_EMAIL    = process.argv[2]
const ADMIN_PASSWORD = process.argv[3]

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Uso: node scripts/setup-real-data.mjs <admin-email> <admin-password>')
  process.exit(1)
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
    req.end()
  })
}

function authPost(path, body) {
  const payload = JSON.stringify(body)
  return request({
    hostname: 'identitytoolkit.googleapis.com',
    path: `/v1/${path}?key=${API_KEY}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  }, payload)
}

function fsGet(path, idToken) {
  return request({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  })
}

function fsDelete(path, idToken) {
  return request({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${idToken}` },
  })
}

function fsCreate(collection, body, idToken) {
  const payload = JSON.stringify(body)
  return request({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}`,
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  }, payload)
}

function fsSet(docPath, body, idToken) {
  const payload = JSON.stringify(body)
  return request({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  }, payload)
}

function toFs(val) {
  if (typeof val === 'string')  return { stringValue: val }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (typeof val === 'number')  return { integerValue: String(val) }
  if (Array.isArray(val))       return { arrayValue: { values: val.map(toFs) } }
  if (val === null)             return { nullValue: null }
  return { stringValue: String(val) }
}

function fields(obj) {
  const f = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) f[k] = toFs(v)
  return { fields: f }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Auth ──────────────────────────────────────────────────────────────────────

async function signIn(email, password) {
  const res = await authPost('accounts:signInWithPassword', { email, password, returnSecureToken: true })
  if (res.body.error) throw new Error(`SignIn failed: ${res.body.error.message}`)
  return res.body.idToken
}

async function createAuthUser(email, password) {
  const res = await authPost('accounts:signUp', { email, password, returnSecureToken: true })
  if (res.body.error) {
    if (res.body.error.message === 'EMAIL_EXISTS') return null
    throw new Error(`createUser ${email}: ${res.body.error.message}`)
  }
  return res.body.localId
}

// ── Firestore: list & delete collection ──────────────────────────────────────

async function deleteCollection(col, idToken) {
  const res = await fsGet(`${col}?pageSize=300`, idToken)
  const docs = res.body.documents || []
  for (const doc of docs) {
    const name = doc.name.split('/documents/')[1]
    await fsDelete(name, idToken)
    process.stdout.write('.')
  }
  console.log(` ✓ ${docs.length} docs eliminados de ${col}`)
}

async function deleteJudgeUsers(idToken) {
  const res = await fsGet('users?pageSize=200', idToken)
  const docs = res.body.documents || []
  let count = 0
  for (const doc of docs) {
    if (doc.fields?.role?.stringValue === 'judge') {
      const name = doc.name.split('/documents/')[1]
      await fsDelete(name, idToken)
      count++
      process.stdout.write('.')
    }
  }
  console.log(` ✓ ${count} jueces eliminados de Firestore`)
}

// ── Datos de jueces ───────────────────────────────────────────────────────────

const JUDGES = [
  { id: 'FE-01',  modules: ['fe'],  category: null },
  { id: 'FIE-01', modules: ['fi'],  category: 'elementary' },
  { id: 'FIJ-02', modules: ['fi'],  category: 'junior' },
  { id: 'FIJ-03', modules: ['fi'],  category: 'junior' },
  { id: 'FIS-01', modules: ['fi'],  category: 'senior' },
  { id: 'FIS-02', modules: ['fi'],  category: 'senior' },
  { id: 'FIS-03', modules: ['fi'],  category: 'senior' },
  { id: 'FIS-04', modules: ['fi'],  category: 'senior' },
  { id: 'RME-01', modules: ['rm'],  category: 'elementary' },
  { id: 'RME-02', modules: ['rm'],  category: 'elementary' },
  { id: 'RMJ-01', modules: ['rm'],  category: 'junior' },
  { id: 'RMJ-02', modules: ['rm'],  category: 'junior' },
  { id: 'RMJ-03', modules: ['rm'],  category: 'junior' },
  { id: 'RMS-01', modules: ['rm'],  category: 'senior' },
  { id: 'RMS-02', modules: ['rm'],  category: 'senior' },
  { id: 'RMS-03', modules: ['rm'],  category: 'senior' },
  { id: 'RSP-01', modules: ['rsp'], category: 'open' },
  { id: 'RSJ-01', modules: ['rs'],  category: 'junior' },
]

// ── Equipos con asignación de juez (judgeId → resuelto a uid al crear) ────────
// Distribución equitativa por categoría/módulo

const FE_TEAMS = [
  // FE-01 cubre todos los equipos FE (único juez)
  { name: 'Autonova',          number: '1-5', category: 'unica', coach: 'Alexandra Amas',                   member1: 'Ricardo Pérez',                         member2: 'Diego Huezo',                       judgeId: 'FE-01' },
  { name: 'Compañefísicas',    number: '2-5', category: 'unica', coach: 'Ana Cristina Brito Navarro',        member1: 'Daniela Alejandra Padilla Cruz',         member2: 'Andrea Xiuhang Brito Siu',          member3: 'Linda Valeria Rodríguez Blanco',  judgeId: 'FE-01' },
  { name: 'Lifers & Flowers',  number: '3-5', category: 'unica', coach: 'Douglas Antonio Portillo Vega',    member1: 'Amelia González Pinzón',                member2: 'Rebeca María Ibáñez Arana',         member3: 'Paulina Jiménez Iriarte',        judgeId: 'FE-01' },
  { name: 'MAD Engineering',   number: '4-5', category: 'unica', coach: 'Carlos España',                    member1: 'Daniel Salazar',                        member2: 'Antonio Borst-Fortin',              member3: 'Manuel Vásquez',                 judgeId: 'FE-01' },
  { name: 'UDB Team',          number: '5-5', category: 'unica', coach: 'Fernando Antonio Portal Chamorro', member1: 'Roberto Benjamín Segovia Evora',         member2: 'Paola Alejandra Portillo Fernández', member3: 'Douglas Nicolás Pérez Alvarado', judgeId: 'FE-01' },
]

const FI_TEAMS = [
  // Elementary: FIE-01 (único juez)
  { name: 'Mini Llort',     number: 'E1-3', category: 'elementary', coach: 'Sara López de Mena', member1: 'Valentina Denis',   member2: 'Antonella Benítez',                           judgeId: 'FIE-01' },
  { name: 'Robo Guide 503', number: 'E2-3', category: 'elementary', coach: 'Sara López de Mena', member1: 'Ascher Tidwell',    member2: 'Jaime Lartategui',  member3: 'Felipe Rodríguez', judgeId: 'FIE-01' },
  { name: 'Team el Mágico', number: 'E3-3', category: 'elementary', coach: 'Sara López de Mena', member1: 'Gabriel Melara',    member2: 'Jacobo Handal',     member3: 'Santiago Betancourt', judgeId: 'FIE-01' },
  // Junior: FIJ-02 (J1–J5), FIJ-03 (J6–J10)
  { name: 'AJM Innovators',    number: 'J1-10',  category: 'junior', coach: 'Sergio Manolo Padilla Funes',   member1: 'Alfonso Andrés Quiñónez Samayoa',  member2: 'Ricardo Andrés Morán Amaya',      member3: 'Juan Fernando Márquez',              judgeId: 'FIJ-02' },
  { name: 'Anglo Kids',        number: 'J2-10',  category: 'junior', coach: 'Saul Rivera',                   member1: 'Oscar Sánchez',                    member2: 'Christopher Lopez',               member3: 'Gael Turcios',                       judgeId: 'FIJ-02' },
  { name: 'Code Breakers',     number: 'J3-10',  category: 'junior', coach: 'Mario Ortiz',                   member1: 'Betsua Madai Cortes Sanchez',      member2: 'Bryan Adrian Nerio Rodríguez',    member3: 'Nahomy Alejandra Cruz Martínez',     judgeId: 'FIJ-02' },
  { name: 'Cuscabotcs',        number: 'J4-10',  category: 'junior', coach: 'Eva Maria Menjivar',            member1: 'Jose Alonso Castro Rivas',         member2: 'Natalia Abigail Elias Mazariego',  member3: 'Cesar Daniel Vanegas Rivas',         judgeId: 'FIJ-02' },
  { name: 'Eco Sismo Team',    number: 'J5-10',  category: 'junior', coach: 'Josué Ismael Rivas Elías',      member1: 'Roberto Antonio Medina Rosales',   member2: 'Dylan Alejandro Campos',          member3: 'Mario Fernando Jaco González',       judgeId: 'FIJ-02' },
  { name: 'Heritage Guardian', number: 'J6-10',  category: 'junior', coach: 'Sergio Manolo Padilla Funes',   member1: 'Jacobo Jorge Simon Gutiérrez',     member2: 'René Rafael Denis Ibarra',        member3: 'José Andrés Sandoval',               judgeId: 'FIJ-03' },
  { name: 'RoboLegends',       number: 'J7-10',  category: 'junior', coach: 'Allison Andrea Ventura Avila',  member1: 'Andrés de Jesús Candray Guevara',  member2: 'Daniel Asael González Alvarenga', member3: 'Carlos Steven Membreño Crespín',     judgeId: 'FIJ-03' },
  { name: 'Salvatech',         number: 'J8-10',  category: 'junior', coach: 'Sergio Manolo Padilla Funes',   member1: 'Nicolás Urías',                    member2: 'Juan Pablo Catani',                                                              judgeId: 'FIJ-03' },
  { name: 'SIPC',              number: 'J9-10',  category: 'junior', coach: 'Carolina Mejía',                member1: 'Uriel Antonio Martínez Henríquez', member2: 'Karen Noemy Díaz Núñez',          member3: 'Ezequiel Eliseo Cruz Merino',        judgeId: 'FIJ-03' },
  { name: "B'aax Dance",       number: 'J10-10', category: 'junior', coach: 'Douglas Antonio Portillo Vega', member1: 'Samuel Alejandro Arguera Turcios',  member2: 'Diego Sebastián Solórzano Caballero', member3: 'Pablo Salcedo Cardenal',         judgeId: 'FIJ-03' },
  // Senior: FIS-01 (S1–S4), FIS-02 (S5–S8), FIS-03 (S9–S12), FIS-04 (S13–S15)
  { name: 'Fenix Robotics',      number: 'S1-15',  category: 'senior', coach: 'Saul Rivera',                    member1: 'Josue Calderon',                        member2: 'Oscar Dominguez',                                                             judgeId: 'FIS-01' },
  { name: 'Gear Masters',        number: 'S2-15',  category: 'senior', coach: 'Edwin Eduardo Hernández Lopez',   member1: 'Tanimi Janel Reyes Carballo',            member2: 'Aisha Rebecca Reyes Carballo',         member3: 'María Guadalupe Castillo López',  judgeId: 'FIS-01' },
  { name: 'Guardianes',          number: 'S3-15',  category: 'senior', coach: 'Douglas Antonio Portillo Vega',  member1: 'Emilio José Medina Melhado',             member2: 'Francisco Javier Escobar Arévalo',    member3: 'Ligia Andrea Arguera Turcios',   judgeId: 'FIS-01' },
  { name: 'HelioBus',            number: 'S4-15',  category: 'senior', coach: 'Douglas Antonio Portillo Vega',  member1: 'Roberto Andrés Herrera Colato',          member2: 'Emanuel Enrique Sánchez Alvarenga',   member3: 'Gabriel Da Silva Vairo',         judgeId: 'FIS-01' },
  { name: 'Los Inges',           number: 'S5-15',  category: 'senior', coach: 'Sergio Manolo Padilla Funes',    member1: 'Moisés Yakob Mejía Serrano',             member2: 'Fernando José Velasco Melgar',         member3: 'Daniel José Chévez Córdova',     judgeId: 'FIS-02' },
  { name: 'Mangrover',           number: 'S6-15',  category: 'senior', coach: 'Douglas Antonio Portillo Vega',  member1: 'José Ángel Cortez Cruz',                 member2: 'Alicia María Martínez Machuca',        member3: 'Roberto Andrés Herrera Colato',  judgeId: 'FIS-02' },
  { name: 'Medi bot team',       number: 'S7-15',  category: 'senior', coach: 'Johanna Alejandra López Pérez',  member1: 'Rodrigo Adonay Lemus Sosa',              member2: 'Ashley Abigail García Alvarez',        member3: 'Douglas Alberto Barrientos Cerón', judgeId: 'FIS-02' },
  { name: 'Museo Vivo',          number: 'S8-15',  category: 'senior', coach: 'Edwin Italmir Rivas',             member1: 'Gabriela Abigail Calderón Rodríguez',   member2: 'Abraham Emanuel Alvarenga Escobar',   member3: 'Ricardo David Martínez Granados', judgeId: 'FIS-02' },
  { name: 'My AIS',              number: 'S9-15',  category: 'senior', coach: 'Edwin Italmir Rivas',             member1: 'Dustin Alejandro Avalos Torres',         member2: 'Ricardo Salvador Carías Vargas',       member3: 'César Andrés Retana Meléndez',   judgeId: 'FIS-03' },
  { name: 'Nova Tech',           number: 'S10-15', category: 'senior', coach: 'Gabriela Martínez Álvarez',       member1: 'Fatima Vanessa Gonzáles Ramírez',        member2: 'Magaly Daniela Rodríguez López',       member3: 'Melanie Giselle',                judgeId: 'FIS-03' },
  { name: 'Ohtli',               number: 'S11-15', category: 'senior', coach: 'Douglas Antonio Portillo Vega',  member1: 'Anabella Barrientos Mac Cormack',        member2: 'Andrés Enrique Yurrita Emerson',       member3: 'Mariana José Portillo Bonilla',  judgeId: 'FIS-03' },
  { name: 'SmartCoffeeCrop',     number: 'S12-15', category: 'senior', coach: 'Josué Ismael Rivas Elías',        member1: 'Maryis Sofía Noguerol Gonzales',         member2: 'Camila Raquel Alvarado Murga',         member3: 'Josette Serrano',                judgeId: 'FIS-03' },
  { name: 'TechBots',            number: 'S13-15', category: 'senior', coach: 'Carlos Alberto Martínez Alonso', member1: 'Diego Steven Rivera Vega',               member2: 'Gustavo Benjamín Vega Cruz',           member3: 'Rene Mateo Acosta Montoya',      judgeId: 'FIS-04' },
  { name: 'The Engineering Bros', number: 'S14-15', category: 'senior', coach: 'Sergio Manolo Padilla Funes',   member1: 'Kahlil Badi Martin',                     member2: 'Daniel Benjamín Narváez',                                                     judgeId: 'FIS-04' },
  { name: 'VELLUM',              number: 'S15-15', category: 'senior', coach: 'Nataly Elias',                   member1: 'Gabriela Michelle Alvarado Lemus',       member2: 'Rebeca Saraí Gómez Cortez',           member3: 'Josué Elias Pérez Santos',       judgeId: 'FIS-04' },
]

const RM_TEAMS = [
  // Elementary: RME-01 (E1–E6), RME-02 (E7–E12)
  { name: 'Alphabots',     number: 'E1-12',  category: 'elementary', coach: 'Mélida López',                   member1: 'Juan Pablo Torres',               member2: 'Andrés Mauricio García',          member3: 'Daniel Pineda',                 judgeId: 'RME-01' },
  { name: 'Inventamundos', number: 'E2-12',  category: 'elementary', coach: 'Katia Brigitte',                 member1: 'Matthew David Martinez Rivas',    member2: 'Kaleb Santiago Peña Nuñez',       member3: 'Alessandra Valentina Galdamez', judgeId: 'RME-01' },
  { name: 'Los Chafufus',  number: 'E3-12',  category: 'elementary', coach: 'Mélida López',                   member1: 'Julio Gutiérrez',                 member2: 'Rodrigo Rivera',                  member3: 'Mateo Cambara',                  judgeId: 'RME-01' },
  { name: 'Los Iguasters', number: 'E4-12',  category: 'elementary', coach: 'Mélida López',                   member1: 'Aarón Sánchez',                   member2: 'Sergio Contreras',                member3: 'Luis Cañas',                     judgeId: 'RME-01' },
  { name: 'Music Liders',  number: 'E5-12',  category: 'elementary', coach: 'Mélida López',                   member1: 'Mia Hasbún',                      member2: 'Mateo Hasbún',                    member3: 'Lucia Salazar',                  judgeId: 'RME-01' },
  { name: 'Nada',          number: 'E6-12',  category: 'elementary', coach: 'Mélida López',                   member1: 'Isabella Cerritos',               member2: 'Matías Pineda',                   member3: 'Santiago Martínez',             judgeId: 'RME-01' },
  { name: 'No se',         number: 'E7-12',  category: 'elementary', coach: 'Mélida López',                   member1: 'Francisco Ortez',                 member2: 'Lucia Ventura',                   member3: 'Ambar Vásquez',                  judgeId: 'RME-02' },
  { name: 'Patito Bots',   number: 'E8-12',  category: 'elementary', coach: 'Jorge Alberto Del Cid Carranza',  member1: 'Juandiego Jorge Daboub Silhy',    member2: 'Hector Eduardo Ayala Torres',     member3: 'Rodrigo Alejandro Flores Mejía', judgeId: 'RME-02' },
  { name: 'Pato asado',    number: 'E9-12',  category: 'elementary', coach: 'Walter Israel González Guardado', member1: 'Arturo Ernesto Rodríguez Roque',  member2: 'José Andrés Robles Girón',                                                   judgeId: 'RME-02' },
  { name: 'Pollo asado',   number: 'E10-12', category: 'elementary', coach: 'Walter Israel González Guardado', member1: 'Carlos Sebastián Córdova Melgar', member2: 'Juan José Flores Hernández',      member3: 'Fernando Joan Escobar Arévalo',  judgeId: 'RME-02' },
  { name: 'Spider Bots',   number: 'E11-12', category: 'elementary', coach: 'Jorge Alberto Del Cid Carranza',  member1: 'Sebastián Iraheta Ferreiro',      member2: 'Sebastián André Rivas Novoa',     member3: 'Marcelo Figueroa Munguia',       judgeId: 'RME-02' },
  { name: 'TiTans Robotic',number: 'E12-12', category: 'elementary', coach: 'Saul Rivera',                    member1: 'Josue Martinez',                  member2: 'Dagoberto Quintanilla',                                                      judgeId: 'RME-02' },
  // Junior: RMJ-01 (J1–J7), RMJ-02 (J8–J14), RMJ-03 (J15–J20)
  { name: '8-bit',           number: 'J1-20',  category: 'junior', coach: 'Rodrigo Alberto Vanegas Santamaría', member1: 'Axel Santiago Alvarenga Guevara',   member2: 'Elias Geovanni Rojas Flores',      member3: 'José Luis Abarca Medina',             judgeId: 'RMJ-01' },
  { name: 'Bright Bots',     number: 'J2-20',  category: 'junior', coach: 'Gustavo Cardona',                   member1: 'Levi Karsten Chavez Ortega',        member2: 'Juan Carlos Lopes Martinez',       member3: 'Anderson Nehemias Rodriguez Rivera',  judgeId: 'RMJ-01' },
  { name: 'ByteMasters',     number: 'J3-20',  category: 'junior', coach: 'Brandon Rivera',                    member1: 'Xavier Alexander Amaya Montes',     member2: 'Caleb Sebastian Flores Villalta',  member3: 'Ever Alexander Pineda Escobar',       judgeId: 'RMJ-01' },
  { name: 'Codigo 404',      number: 'J4-20',  category: 'junior', coach: 'Lili Flores',                       member1: 'Cristian Daniel Granados Orellana', member2: 'Kimberly Angelie López Cruz',                                                      judgeId: 'RMJ-01' },
  { name: 'Cyber Odissey',   number: 'J5-20',  category: 'junior', coach: 'Mario Morales',                     member1: 'Marlon Contreras',                  member2: 'Ferran Rodriguez',                 member3: 'Carlos Espinoza',                     judgeId: 'RMJ-01' },
  { name: 'Dadiema',         number: 'J6-20',  category: 'junior', coach: 'Adriel Alejandro Peréz Flores',     member1: 'Daniela Nicole Alvarado Lemus',     member2: 'Diego Alejandro Mendez Ponce',     member3: 'Maria Isabel Serrano Martínez',       judgeId: 'RMJ-01' },
  { name: 'IDK',             number: 'J7-20',  category: 'junior', coach: 'Mario Morales',                     member1: 'María Fernanda Medrano',            member2: 'Paola Rossi',                      member3: 'Carlos Cruz',                         judgeId: 'RMJ-01' },
  { name: 'Iron CEWAS',      number: 'J8-20',  category: 'junior', coach: 'Reinaldo Guedes',                   member1: 'Josué Alexander Valle Preza',       member2: 'Abdiel Vladimir Henriquez Aguilar', member3: 'Génesis Sofía Salazar Araujo',        judgeId: 'RMJ-02' },
  { name: 'Kebin-Bot Team',  number: 'J9-20',  category: 'junior', coach: 'Kevin Elías Luna Palacios',         member1: 'Jacobo Benjamín Orantes Cortez',    member2: 'Andrea Gabriela Reyes Hernández',  member3: 'Marco Isaac Barraza Beltrán',         judgeId: 'RMJ-02' },
  { name: 'Las ingenieras',  number: 'J10-20', category: 'junior', coach: 'Anderson Grande',                   member1: 'Adriana Esmeralda Galeas Flores',   member2: 'Dayana Crishell Ascencio Lucero',  member3: 'Keila Julissa Ramirez Rodriguez',     judgeId: 'RMJ-02' },
  { name: 'MGM',             number: 'J11-20', category: 'junior', coach: 'Rodrigo Alfaro',                    member1: 'Matteo Francesconi Montes',         member2: 'Gabriel Hurst',                    member3: 'Mateo Geraldo Cruz Guzmán',           judgeId: 'RMJ-02' },
  { name: 'NovaBots',        number: 'J12-20', category: 'junior', coach: 'Sara Isabel Gutiérrez Alfaro',      member1: 'Carlos Alexander de la O Grande',   member2: 'Daniel Isaías Lemus Espiniza',     member3: 'Josué Daniel Crespo Erazo',          judgeId: 'RMJ-02' },
  { name: 'Robonautas',      number: 'J13-20', category: 'junior', coach: 'Stephany Campos',                   member1: 'Andrés Josué Cruz Granado',         member2: 'Anderson Alexandre Guillen Ferman', member3: 'Sara Eunice Torres Ramos',           judgeId: 'RMJ-02' },
  { name: 'Robotasticos',    number: 'J14-20', category: 'junior', coach: 'Gracia Rivera y Tomas Ruiz',        member1: 'Lucas Mateo Gonzales Hernandez',    member2: 'Elsa Lindsay Escobar Santos',      member3: 'Edwin Daniel Martinez Rodriguez',     judgeId: 'RMJ-02' },
  { name: 'Spinjitzu',       number: 'J15-20', category: 'junior', coach: 'Josué Ismael Rivas Elías',          member1: 'María Fernanda Carballo Torres',    member2: 'Matthew René Revelo Nativi',       member3: 'Denis Josué Navas Hernández',         judgeId: 'RMJ-03' },
  { name: 'SSJ Tech',        number: 'J16-20', category: 'junior', coach: 'Mario Morales',                     member1: 'Santiago Castellón',                member2: 'Sebastian Prado',                  member3: 'Javier Arriaza',                      judgeId: 'RMJ-03' },
  { name: 'Tech Titans',     number: 'J17-20', category: 'junior', coach: 'Paulo Espinoza Hesse',              member1: 'Alexander Mejia Torres',            member2: 'Andrés Marcelo Meléndez Flores',   member3: 'Stephannie Alexandra Valiente Cruz',  judgeId: 'RMJ-03' },
  { name: 'Terrenaitors',    number: 'J18-20', category: 'junior', coach: 'Mario Morales',                     member1: 'Celeste Samayoa',                   member2: 'Daniela Orrego',                   member3: 'Ilan Davidovich',                     judgeId: 'RMJ-03' },
  { name: 'The BeES',        number: 'J19-20', category: 'junior', coach: 'Josué Ismael Rivas Elías',          member1: 'Sebastián Alejandro Flores',        member2: 'Santiago Bernal Moreira',          member3: 'María Elida Ortiz Cortez',            judgeId: 'RMJ-03' },
  { name: 'Y si sí?',        number: 'J20-20', category: 'junior', coach: 'Beatríz Torres',                   member1: 'Juan Diego Soto Díaz',              member2: 'Leonardo Da Silva',                member3: 'Santiago Abarca Martínez',            judgeId: 'RMJ-03' },
  // Senior: RMS-01 (S2–S8), RMS-02 (S9–S15), RMS-03 (S16–S22)
  { name: 'Astrobot Team',    number: 'S2-22',  category: 'senior', coach: 'Angel Gabriel Ramírez Hernández',  member1: 'Hector Alessandro Aquino Olivares',  member2: 'Alejandra Gabriela Coto Hernández',   member3: 'Samuel Ernesto Pérez Rosales',    judgeId: 'RMS-01' },
  { name: 'Auras',            number: 'S3-22',  category: 'senior', coach: 'Sergio Cuellar',                   member1: 'Raquel Alvarenga',                   member2: 'Kenneth Bolaños',                     member3: 'Verónica Pérez',                  judgeId: 'RMS-01' },
  { name: 'Bastard Muchen',   number: 'S4-22',  category: 'senior', coach: 'Jose David Flores Flamenco',       member1: 'Iker Cornejo González',              member2: 'Hercules Méndez Jefferson',           member3: 'Starla Jamileth Martinez Jorge',   judgeId: 'RMS-01' },
  { name: 'Botzilla',         number: 'S5-22',  category: 'senior', coach: 'Sergio Cuellar',                   member1: 'Santiago Villacorta',                member2: 'Daniel Videz',                        member3: 'Liang Yu Wu',                     judgeId: 'RMS-01' },
  { name: 'C.E ARCE SUÁREZ',  number: 'S6-22',  category: 'senior', coach: 'Dimas Hernández',                  member1: 'Gerson Abisai Hernández Martínez',   member2: 'Génesis Abigail Vega Barahona',       member3: 'Michael Xavier Pérez Menjivar',   judgeId: 'RMS-01' },
  { name: 'C.E ARCE SUÁREZ 2',number: 'S7-22',  category: 'senior', coach: 'Dimas Hernández',                  member1: 'Albin Osael Martínez Tobar',         member2: 'José Vinicio Valdéz Arce',            member3: 'Cristian Alexis Torres Ramos',    judgeId: 'RMS-01' },
  { name: 'Chorypanes',        number: 'S8-22',  category: 'senior', coach: 'Yasser José Fernádez Campos',      member1: 'Xochitl Marbella Martinez Melgar',   member2: 'Katherine Elizabeth Flores Herrera',  member3: 'Karla María Ruiz Soliz',          judgeId: 'RMS-01' },
  { name: 'Codex',             number: 'S9-22',  category: 'senior', coach: 'Angel Coreas',                     member1: 'Diego Alessandro Montoya Amaya',     member2: 'Harold Nehemías Chávez Castaneda',    member3: 'Elizabeth Magdalena Martínez Miranda', judgeId: 'RMS-02' },
  { name: 'Funky',             number: 'S10-22', category: 'senior', coach: 'Gabriela Abigail López Alvarado',  member1: 'Rafael Alejandro Rosales Alfaro',    member2: 'Keyli Alejandra Arévalo Paz',         member3: 'Nely Alessandra Gómez Gonzales',  judgeId: 'RMS-02' },
  { name: 'I.D.R.A',          number: 'S11-22', category: 'senior', coach: 'Yasser José Fernádez Campos',      member1: 'Daniel Eduardo Muñoz Ayala',         member2: 'Lenny Alexander Henriquez Russull',   member3: 'Fatima Abigail Quintanilla Martínez', judgeId: 'RMS-02' },
  { name: 'M.E.C.A',          number: 'S12-22', category: 'senior', coach: 'Yasser José Fernádez Campos',      member1: 'Edsson Alessandro Urquilla Ortega',  member2: 'Genesis Michelle Flores Ayala',       member3: 'Natalia Lisseth Montoya Rivera',  judgeId: 'RMS-02' },
  { name: 'Mecha Gidora',      number: 'S13-22', category: 'senior', coach: 'Sergio Cuellar',                   member1: 'Andrés Reyes',                       member2: 'Arthur Falkenstein',                  member3: 'Hugo Quan',                       judgeId: 'RMS-02' },
  { name: "MPC's",             number: 'S14-22', category: 'senior', coach: 'Kemio O. Couto',                   member1: 'Pietro Reis Couto',                  member2: 'Mateo Reis Couto',                    member3: 'Carlos Salvador Saca Moschini',   judgeId: 'RMS-02' },
  { name: 'Nexus Robotics',    number: 'S15-22', category: 'senior', coach: 'Carlos Eduardo Revolorio Lara',    member1: 'Diego Enrique Velasco Rangel',       member2: 'Sebastián Alejandro Díaz Martínez',   member3: 'Oscar Fernando Figueroa Hernández', judgeId: 'RMS-02' },
  { name: 'ROBO TITANS',       number: 'S16-22', category: 'senior', coach: 'Ever Henry Palacios',              member1: 'Armando Javier Guevara',             member2: 'Diego Serpas Escobar',                member3: 'Alvaro Patricio Daura',           judgeId: 'RMS-03' },
  { name: 'ROBO TRILOBITES',   number: 'S17-22', category: 'senior', coach: 'Ever Henry Palacios',              member1: 'Jamil Vinicio Comandari Carcamo',    member2: 'Mateo Miguel Saca Dada',              member3: 'Mateo Alexander Ferrufino Diaz',  judgeId: 'RMS-03' },
  { name: 'Robomasters',       number: 'S18-22', category: 'senior', coach: 'Domenick Coto Carreño',            member1: 'Cristopher Alessandro Cortez Rivas', member2: 'Kerim Emmanuel Martínez Pineda',       member3: 'Helen Fabiola',                   judgeId: 'RMS-03' },
  { name: 'Robostorm',         number: 'S19-22', category: 'senior', coach: 'Domenick Romero Mejía',            member1: 'Kevin Eduardo Meléndez Pineda',      member2: 'Ángel Antonio Morales Roque',         member3: 'Ariela Abigail',                  judgeId: 'RMS-03' },
  { name: 'Robotecno',         number: 'S20-22', category: 'senior', coach: 'Alejandra Marisol Prieto Ortiz',   member1: 'José Carlos Jiménez Linares',        member2: 'Valeria Alejandra Ávelar Ortiz',      member3: 'Daniela Alejandra Argujo Mendez', judgeId: 'RMS-03' },
  { name: 'Titan Robotics',    number: 'S21-22', category: 'senior', coach: 'Rodrigo Rivas',                    member1: 'Jose Luis Abarca Siguenza',          member2: 'Diego Ezequiel Chavez Pacheco',       member3: 'Gerardo Adonay Rosales Cubias',   judgeId: 'RMS-03' },
  { name: 'Wallie Team',       number: 'S22-22', category: 'senior', coach: 'Guillermo Eduardo Quijada',        member1: 'Christian Alexander Zaldivar Mendoza', member2: 'Jefferson Eduardo Mojica Aguirre',   member3: 'Esteban Isai Zepeda Vásquez',    judgeId: 'RMS-03' },
]

const RSP_TEAMS = [
  // RSP-01 cubre todos (único juez)
  { name: '¿Y si sí?',         number: '1-6', category: 'open', coach: 'Walter Israel González Guardado', member1: 'Diego Alejandro Valencia Rodezno',    member2: 'Oscar Antonio Ayala Rodríguez',                                        judgeId: 'RSP-01' },
  { name: 'Hikerbot',          number: '2-6', category: 'open', coach: 'Walter Israel González Guardado', member1: 'Mateo Quintanilla Mixco',             member2: 'Rodrigo Sebastián Jarquín López',                                      judgeId: 'RSP-01' },
  { name: 'Hikers',            number: '3-6', category: 'open', coach: 'Walter Israel González Guardado', member1: 'Julián Arriaza Chávez',               member2: 'Santiago André Moreno Regalado',  member3: 'María Rebeca Lovo Beltrami',  judgeId: 'RSP-01' },
  { name: 'Monkeybots',        number: '4-6', category: 'open', coach: 'Walter Israel González Guardado', member1: 'Mateo Esteban Artiga Valdivieso',     member2: 'Alejandro José Dada Saca',        member3: 'Oscar André Guerra Calderón', judgeId: 'RSP-01' },
  { name: 'NaVi',              number: '5-6', category: 'open', coach: 'Walter Israel González Guardado', member1: 'Natalia Lourdes Novoa Fiallos',       member2: 'Victoria Sofía Jarquín López',                                         judgeId: 'RSP-01' },
  { name: 'Octava generación', number: '6-6', category: 'open', coach: 'José David Bayona Martínez',      member1: 'Oscar Ian Aguilar Romero',            member2: 'Carlos Adrián Aparicio Grande',   member3: 'Killen Daniel Hou Wu',        judgeId: 'RSP-01' },
]

const RS_TEAMS = [
  // RSJ-01 cubre ambos (único juez)
  { name: 'Capi-Chamoy', number: '1-2', category: 'junior', coach: 'Jorge Alberto Del Cid Carranza', member1: 'Diego Antonio Ayala Torres',   member2: 'Francisco Daniel Orellana Taylor', judgeId: 'RSJ-01' },
  { name: 'Minibots',    number: '2-2', category: 'junior', coach: 'Marcela Rosales',                member1: 'Mario Osiris Navarro',         member2: 'Manuel Gutiérrez',                 judgeId: 'RSJ-01' },
]

// ── Main ──────────────────────────────────────────────────────────────────────

;(async () => {
  console.log('🔐 Iniciando sesión como admin...')
  const idToken = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD)
  console.log('✅ Sesión iniciada\n')

  // ── 1. Borrar colecciones de equipos ────────────────────────────────────────
  console.log('🗑️  Eliminando equipos existentes...')
  for (const col of ['rm_teams', 'rs_teams', 'rsp_teams', 'fi_teams', 'fe_teams']) {
    await deleteCollection(col, idToken)
  }

  // ── 2. Borrar jueces de Firestore ───────────────────────────────────────────
  console.log('\n🗑️  Eliminando jueces de Firestore...')
  await deleteJudgeUsers(idToken)

  // ── 3. Crear cuentas de jueces (guardando map judgeId → uid) ────────────────
  console.log('\n👤 Creando cuentas de jueces...')
  const judgeUids = {} // judgeId → uid

  for (const judge of JUDGES) {
    const email    = `${judge.id}@wro.sv`
    const password = `${judge.id}_WRO26`

    let uid = await createAuthUser(email, password)

    if (uid === null) {
      // Ya existe — obtener UID via signIn
      const tmpToken = await signIn(email, password).catch(() => null)
      if (!tmpToken) { console.log(`  ⚠️  ${judge.id}: ya existe, no se pudo obtener UID`); continue }
      const info = await authPost('accounts:lookup', { idToken: tmpToken })
      uid = info.body.users?.[0]?.localId
      if (!uid) { console.log(`  ⚠️  ${judge.id}: UID no encontrado`); continue }
    }

    judgeUids[judge.id] = uid

    const doc = fields({
      uid,
      name: judge.id,
      judgeId: judge.id,
      role: 'judge',
      email,
      modules: judge.modules,
      ...(judge.category ? { category: judge.category } : {}),
    })
    await fsSet(`users/${uid}`, doc, idToken)
    console.log(`  ✅ ${judge.id} → ${email} (uid: ${uid.slice(0,8)}...)`)
    await sleep(150)
  }

  // ── 4. Crear equipos con juez pre-asignado ──────────────────────────────────
  const teamSets = [
    ['fe_teams',  FE_TEAMS,  false],
    ['fi_teams',  FI_TEAMS,  true ],  // usa assignedJudgeUids (array)
    ['rm_teams',  RM_TEAMS,  false],
    ['rsp_teams', RSP_TEAMS, false],
    ['rs_teams',  RS_TEAMS,  false],
  ]

  for (const [col, teams, isFI] of teamSets) {
    console.log(`\n📋 Creando equipos en ${col} (${teams.length})...`)
    for (const { judgeId, ...team } of teams) {
      const uid = judgeId ? judgeUids[judgeId] : undefined
      const assignFields = uid
        ? (isFI ? { assignedJudgeUids: [uid] } : { assignedJudgeUid: uid })
        : (isFI ? { assignedJudgeUids: [] }    : {})
      await fsCreate(col, fields({ ...team, ...assignFields, createdAt: new Date().toISOString() }), idToken)
      process.stdout.write('.')
      await sleep(80)
    }
    console.log(` ✓ ${teams.length} equipos`)
  }

  console.log('\n🎉 ¡Proceso completado!')
  console.log(`   • ${JUDGES.length} jueces`)
  const total = teamSets.reduce((s, [, t]) => s + t.length, 0)
  console.log(`   • ${total} equipos (todos pre-asignados)`)
  console.log('\n📌 Distribución de jueces:')
  console.log('   FE-01  → 5 equipos FE')
  console.log('   FIE-01 → 3 equipos FI Elementary')
  console.log('   FIJ-02 → 5 equipos FI Junior | FIJ-03 → 5 equipos FI Junior')
  console.log('   FIS-01..04 → 4/4/4/3 equipos FI Senior')
  console.log('   RME-01 → 6 equipos RM Elementary | RME-02 → 6 equipos RM Elementary')
  console.log('   RMJ-01 → 7 | RMJ-02 → 7 | RMJ-03 → 6 equipos RM Junior')
  console.log('   RMS-01 → 7 | RMS-02 → 7 | RMS-03 → 7 equipos RM Senior')
  console.log('   RSP-01 → 6 equipos RSP')
  console.log('   RSJ-01 → 2 equipos RS')
})().catch(err => { console.error('❌', err.message); process.exit(1) })
