// Padelhallens mock-API. Körs lokalt med `npm run api`, lyssnar på PORT (standard 4000).
//
// Inloggning: e-post + lösenord → JWT i svaret. Varje skyddad endpoint kräver
// Authorization: Bearer <token>.
const express = require('express')
const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')

try {
  process.loadEnvFile()
} catch {
  // ingen .env – helt normalt i CI och i en container
}

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------
// Hemligheten läses ur miljön – med ett standardvärde så att det funkar utan .env /byrån
const JWT_SECRET = process.env.JWT_SECRET || 'padel'
const TOKEN_TTL = process.env.TOKEN_TTL || '30m'
const PORT = Number(process.env.PORT || 4000)

// ---------------------------------------------------------------------------
// Data. Lösenorden lagras som scrypt-hash (mock-api/hash-password.js gör en ny).
// Testkonton: sara.ek@example.com / padel-sara · noel.berg@example.com / padel-noel
// ---------------------------------------------------------------------------
const members = [
  {
    id: 1,
    memberNo: 'P-3011',
    email: 'sara.ek@example.com',
    passwordHash: 'scrypt$6328517b535110e6dfda88e121cd670d$56c221f2e2f9609ea13744372bf0973930397ee8b317fc68aa86a533223cbf45aaa07f455423023459a27a7ded9db5090f7534dba8f79be2b670d883597af50d',
    name: 'Sara Ek'
  },
  {
    id: 2,
    memberNo: 'P-4127',
    email: 'noel.berg@example.com',
    passwordHash: 'scrypt$310689c05ce26797ae082f431a493ca1$a89112313e86bbeaf78af8c067fe99cea0f9fe063f210750dfb7646a21eb482cdf74589f243c24d70bc22bb669a10e546a783e2bc32b1c486a69f59a9c668880',
    name: 'Noel Berg'
  }
]

const bookingsByMember = {
  'P-3011': [
    { id: 301, court: 'Bana 2', date: '2026-10-15', time: '18:00', partner: 'Lisa Holm', cancelled: false },
    { id: 302, court: 'Bana 1', date: '2026-10-03', time: '19:30', partner: 'Lisa Holm', cancelled: false },
    { id: 303, court: 'Bana 3', date: '2026-09-28', time: '17:00', partner: 'Amir Sadiq', cancelled: true, cancelledAt: '2026-09-27' },
    { id: 304, court: 'Bana 2', date: '2026-10-22', time: '18:00', partner: 'Lisa Holm', cancelled: false }
  ],
  'P-4127': [
    { id: 401, court: 'Bana 1', date: '2026-10-11', time: '20:00', partner: 'Kim Dahl', cancelled: false },
    { id: 402, court: 'Bana 3', date: '2026-09-20', time: '09:00', partner: 'Kim Dahl', cancelled: false }
  ]
}

const historyByMember = {
  'P-3011': { months: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt'], values: [4, 3, 5, 4, 6, 5, 3, 2, 1, 4, 5, 4] },
  'P-4127': { months: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt'], values: [1, 2, 2, 1, 3, 2, 2, 0, 0, 1, 2, 1] }
}

const messagesByMember = {
  'P-3011': [
    { id: 1001, date: '2026-10-06', from: 'Padelhallen Sundby', text: 'Din bana är bokad: Bana 2, 15 oktober kl 18.' },
    { id: 1002, date: '2026-09-27', from: 'Padelhallen Sundby', text: 'Din avbokning av Bana 3 den 28 september är mottagen. Avgift: 150 kr.' }
  ],
  'P-4127': [
    { id: 2001, date: '2026-10-01', from: 'Padelhallen Sundby', text: 'Din bana är bokad: Bana 1, 11 oktober kl 20.' }
  ]
}

const publicMember = ({ id, memberNo, email, name }) => ({ id, memberNo, email, name })

// ---------------------------------------------------------------------------
// Lösenord: scrypt med salt, jämförelse i konstant tid
// ---------------------------------------------------------------------------
const verifyPassword = (password, stored) => {
  const [algo, salt, hash] = String(stored).split('$')
  if (algo !== 'scrypt' || !salt || !hash) return false
  const derived = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected)
}

// ---------------------------------------------------------------------------
// Appen
// ---------------------------------------------------------------------------
const app = express()
app.use(express.json())

app.get('/healthz', (req, res) => res.json({ ok: true }))

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {}
  const member = members.find((m) => m.email === String(email || '').toLowerCase())
  // Samma svar vare sig e-posten finns eller inte – avslöja inte vilka konton som finns.
  if (!member || !verifyPassword(String(password || ''), member.passwordHash)) {
    return res.status(401).json({ error: 'Fel e-post eller lösenord' })
  }
  const token = jwt.sign({ sub: String(member.id), memberNo: member.memberNo }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
    issuer: 'padelhallen'
  })
  res.json({ token, name: member.name })
})

// Kräver en giltig token. Sätter req.member – allt efter det här litar på token, inte på klienten.
const requireLogin = (req, res, next) => {
  const header = req.get('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Inloggning krävs' })
  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'padelhallen' })
    req.member = members.find((m) => String(m.id) === payload.sub)
    if (!req.member) return res.status(401).json({ error: 'Inloggning krävs' })
    next()
  } catch {
    res.status(401).json({ error: 'Ogiltig eller utgången token' })
  }
}

app.get('/api/user', requireLogin, (req, res) => res.json(publicMember(req.member)))

// Bokningar för en medlem. memberNo i adressen gör att receptionen kan slå upp andra sen.
app.get('/api/bookings', requireLogin, (req, res) => {
  const memberNo = req.query.memberNo || req.member.memberNo
  res.json(bookingsByMember[memberNo] || [])
})

app.get('/api/bookings/history', requireLogin, (req, res) => {
  res.json(historyByMember[req.member.memberNo])
})

app.get('/api/messages', requireLogin, (req, res) => {
  res.json(messagesByMember[req.member.memberNo] || [])
})

// Bokning: skapar ett bekräftelsemeddelande. Fälten lagras som TEXT och skickas som text –
// frontenden renderar dem med interpolation, så en tagg i namnet blir tecken, inte kod.
app.post('/api/book', requireLogin, (req, res) => {
  const court = String(req.body?.court || '').trim().slice(0, 40)
  const date = String(req.body?.date || '').trim().slice(0, 10)
  const partner = String(req.body?.partner || '').trim().slice(0, 100)
  if (!court || !date || !partner) return res.status(400).json({ error: 'Bana, datum och medspelare krävs' })
  const list = messagesByMember[req.member.memberNo] || (messagesByMember[req.member.memberNo] = [])
  const message = {
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    from: 'Padelhallen Sundby',
    text: `Din bana är bokad: ${court}, ${date}. Medspelare: ${partner}.`
  }
  list.unshift(message)
  res.status(201).json(message)
})

app.listen(PORT, () => console.log(`Padelhallens mock-API lyssnar på http://localhost:${PORT}`))
