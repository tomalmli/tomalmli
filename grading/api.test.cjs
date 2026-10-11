// Del C · API-checks (C1–C3). Startar mock-API:t i en egen process med en egen hemlighet
// och pratar med det över HTTP – precis som en angripare skulle.
//   node --test grading/api.test.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { spawn, spawnSync } = require('node:child_process')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')

const ROOT = path.resolve(__dirname, '..')
const PORT = 4195
const BASE = `http://localhost:${PORT}`
const SECRET = crypto.randomBytes(32).toString('hex')
// Hemligheten som stod i koden när provet delades ut
const OLD_SECRET = 'padel'

const MAJA = { email: 'sara.ek@example.com', password: 'padel-sara', memberNo: 'P-3011', sub: '1' }
const OMAR = { memberNo: 'P-4127', sub: '2' }

let api

const waitForApi = async () => {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${BASE}/healthz`)
      if (r.ok) return true
    } catch {
      // inte uppe än
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

before(async () => {
  api = spawn('node', ['mock-api/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), JWT_SECRET: SECRET },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let log = ''
  api.stdout.on('data', (d) => (log += d))
  api.stderr.on('data', (d) => (log += d))
  const up = await waitForApi()
  assert.ok(up, `API:t startade inte på port ${PORT}. Utskrift:\n${log}`)
})

after(() => api?.kill())

const login = async () => {
  const r = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MAJA.email, password: MAJA.password })
  })
  assert.equal(r.status, 200, 'inloggning som Sara ska ge 200')
  const data = await r.json()
  assert.ok(data.token, 'svaret ska innehålla token')
  return data.token
}

const get = (p, token) => fetch(`${BASE}${p}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })

test('C1 Sara kan inte se Noels bokningar via ?memberNo= (IDOR)', async () => {
  const token = await login()
  const own = await (await get('/api/bookings', token)).json()
  assert.ok(Array.isArray(own) && own.length > 0, '/api/bookings ska ge Saras bokningar')
  const r = await get(`/api/bookings?memberNo=${OMAR.memberNo}`, token)
  if (r.status === 403 || r.status === 400) return // också rätt: uttryckligen nekat
  assert.equal(r.status, 200)
  const list = await r.json()
  const ids = list.map((l) => l.id).sort()
  assert.deepEqual(ids, own.map((l) => l.id).sort(), 'med ?memberNo=P-4127 kom andra bokningar än Saras egna tillbaka – memberNo ska tas ur token')
})

test('C2 en token signerad med den gamla hemligheten avvisas', async () => {
  const forged = jwt.sign({ sub: OMAR.sub, memberNo: OMAR.memberNo }, OLD_SECRET, { expiresIn: '10m', issuer: 'padelhallen' })
  const r = await get('/api/bookings', forged)
  assert.equal(r.status, 401, `förfalskad token (signerad med "${OLD_SECRET}") gav ${r.status} – ska ge 401`)
  const r2 = await get('/api/bookings', jwt.sign({ sub: OMAR.sub, memberNo: OMAR.memberNo }, OLD_SECRET))
  assert.equal(r2.status, 401, 'förfalskad token utan issuer gav inte 401')
})

test('C3 hemligheten kommer från miljön', async () => {
  // 1. En token signerad med miljöns JWT_SECRET ska godtas
  const good = jwt.sign({ sub: MAJA.sub, memberNo: MAJA.memberNo }, SECRET, { expiresIn: '10m', issuer: 'padelhallen' })
  const r = await get('/api/user', good)
  assert.equal(r.status, 200, `token signerad med miljöns JWT_SECRET gav ${r.status} – läser servern process.env.JWT_SECRET?`)
  // 2. Utan JWT_SECRET ska servern vägra starta (inget standardvärde i koden)
  const env = { ...process.env, PORT: String(PORT + 1) }
  delete env.JWT_SECRET
  // Avslutar servern med felkod är rätt. Startar den (och måste dödas efter 4 s) har den ett standardvärde.
  // Körs från en tom katalog så att en lokal .env INTE läses in – det är miljön som prövas, inte filen.
  const r2 = spawnSync('node', [path.join(ROOT, 'mock-api', 'server.js')], { cwd: os.tmpdir(), env, encoding: 'utf8', timeout: 4000 })
  assert.ok(r2.status !== null && r2.status !== 0, 'servern startade utan JWT_SECRET – den ska avsluta med felmeddelande i stället för att falla tillbaka på ett standardvärde')
})
