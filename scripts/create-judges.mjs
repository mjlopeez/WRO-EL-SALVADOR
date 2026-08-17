// Script para crear jueces en Firebase
// Ejecutar: node scripts/create-judges.mjs

import https from 'https'

const API_KEY    = 'AIzaSyDppwpi3BxHgrk_e2lLFqLdOjLlM8mJgTE'
const PROJECT_ID = 'wro-el-salvador-2026'

const judges = [
  { email: 'Juez01@gc.sv', module: 'rm',  category: 'elementary', name: 'Juez RM Elementary',   judgeId: 'J01' },
  { email: 'Juez02@gc.sv', module: 'rm',  category: 'junior',     name: 'Juez RM Junior',        judgeId: 'J02' },
  { email: 'Juez03@gc.sv', module: 'rm',  category: 'senior',     name: 'Juez RM Senior',        judgeId: 'J03' },
  { email: 'Juez04@gc.sv', module: 'rs',  category: 'elementary', name: 'Juez RS Elementary',    judgeId: 'J04' },
  { email: 'Juez05@gc.sv', module: 'rs',  category: 'junior',     name: 'Juez RS Junior',        judgeId: 'J05' },
  { email: 'Juez06@gc.sv', module: 'rsp', category: null,         name: 'Juez RoboSports',       judgeId: 'J06' },
  { email: 'Juez07@gc.sv', module: 'fi',  category: 'elementary', name: 'Juez FI Elementary',    judgeId: 'J07' },
  { email: 'Juez08@gc.sv', module: 'fi',  category: 'junior',     name: 'Juez FI Junior',        judgeId: 'J08' },
  { email: 'Juez09@gc.sv', module: 'fi',  category: 'senior',     name: 'Juez FI Senior',        judgeId: 'J09' },
  { email: 'Juez10@gc.sv', module: 'fe',  category: null,         name: 'Juez Future Engineers', judgeId: 'J10' },
]

function request(opts, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = https.request({
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(opts.headers || {})
      }
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

async function createJudge(j) {
  // 1. Crear usuario en Firebase Auth
  const authRes = await request({
    hostname: 'identitytoolkit.googleapis.com',
    path: `/v1/accounts:signUp?key=${API_KEY}`,
    method: 'POST'
  }, { email: j.email, password: j.email, returnSecureToken: true })

  if (authRes.error) {
    const msg = authRes.error.message
    if (msg === 'EMAIL_EXISTS') {
      console.log(`⚠️  ${j.email} ya existe, omitiendo...`)
    } else {
      console.error(`❌ ${j.email}: ${msg}`)
    }
    return
  }

  const { localId: uid, idToken } = authRes

  // 2. Crear documento en Firestore /users/{uid}
  const fsBody = {
    fields: {
      uid:       { stringValue: uid },
      email:     { stringValue: j.email },
      name:      { stringValue: j.name },
      role:      { stringValue: 'judge' },
      modules:   { arrayValue: { values: [{ stringValue: j.module }] } },
      category:  j.category ? { stringValue: j.category } : { nullValue: null },
      judgeId:   { stringValue: j.judgeId },
      createdAt: { stringValue: new Date().toISOString() },
    }
  }

  const fsRes = await request({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/users?documentId=${uid}`,
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` }
  }, fsBody)

  if (fsRes.error) {
    console.error(`⚠️  ${j.email} (auth OK, Firestore): ${fsRes.error.message}`)
  } else {
    console.log(`✅ ${j.judgeId} | ${j.email} | ${j.name}`)
  }
}

;(async () => {
  console.log('Creando jueces en Firebase...\n')
  for (const j of judges) {
    await createJudge(j)
    await new Promise(r => setTimeout(r, 400))
  }
  console.log('\n✅ Proceso completado.')
})()
