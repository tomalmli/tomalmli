// Kör hela rättningen lokalt: npm run prov          (en del: npm run prov -- B)
// Skriver resultatet i terminalen och som JSON i grading/.tmp/resultat.json.
// Samma checks som GitHub Classroom kör när du pushar.
const fs = require('node:fs')
const path = require('node:path')
const { CHECKS, DELAR, stopContainer } = require('./checks')

const only = (process.argv[2] || '').toUpperCase()
const ids = Object.keys(CHECKS).filter((id) => !only || id.startsWith(only))

const main = async () => {
  const rows = []
  for (const id of ids) {
    const c = CHECKS[id]
    process.stdout.write(`${id} ${c.name} … `)
    let r
    try {
      r = await c.run()
    } catch (e) {
      r = { ok: false, detail: e.message }
    }
    rows.push({ id, del: c.del, name: c.name, points: c.points, core: c.core, ...r })
    console.log(r.ok ? `✅ ${c.points} p` : `❌ 0 p`)
    if (r.detail) console.log(`   ${String(r.detail).replace(/\n/g, '\n   ')}`)
  }
  stopContainer()

  console.log('\n' + '─'.repeat(72))
  const summary = {}
  for (const del of Object.keys(DELAR)) {
    const mine = rows.filter((r) => r.del === del)
    if (mine.length === 0) continue
    const got = mine.filter((r) => r.ok).reduce((s, r) => s + r.points, 0)
    const max = mine.reduce((s, r) => s + r.points, 0)
    const coreMissing = mine.filter((r) => r.core && !r.ok).map((r) => r.id)
    const pass = coreMissing.length === 0
    summary[del] = { points: got, max, pass, coreMissing }
    console.log(`Del ${del} · ${DELAR[del].name} (${DELAR[del].mal}): ${got}/${max} p · ${pass ? 'G ✅' : `ej G – kärnchecks kvar: ${coreMissing.join(', ')}`}`)
  }
  const total = rows.filter((r) => r.ok).reduce((s, r) => s + r.points, 0)
  const max = rows.reduce((s, r) => s + r.points, 0)
  console.log(`Totalt: ${total}/${max} p`)
  if (!only) {
    const allPass = Object.values(summary).every((s) => s.pass)
    console.log(allPass ? 'Alla fyra delar godkända.' : 'Minst en del saknar kärnchecks – se ovan.')
  }

  const out = path.join(__dirname, '.tmp')
  fs.mkdirSync(out, { recursive: true })
  fs.writeFileSync(path.join(out, 'resultat.json'), JSON.stringify({ when: new Date().toISOString(), rows, summary, total, max }, null, 2))
}

main().catch((e) => {
  console.error(e)
  stopContainer()
  process.exit(1)
})
