// Kör EN check: node grading/check.js B3
// Avslutar med 0 om checken är grön, annars 1. Används av GitHub Classroom.
const { CHECKS, stopContainer } = require('./checks')

const id = String(process.argv[2] || '').toUpperCase()
const check = CHECKS[id]
if (!check) {
  console.error(`Okänd check: ${id}. Finns: ${Object.keys(CHECKS).join(', ')}`)
  process.exit(2)
}

Promise.resolve()
  .then(() => check.run())
  .then((r) => {
    console.log(`${r.ok ? 'OK ' : 'FEL'} ${id} · ${check.name}`)
    if (r.detail) console.log(`    ${String(r.detail).replace(/\n/g, '\n    ')}`)
    process.exit(r.ok ? 0 : 1)
  })
  .catch((e) => {
    console.log(`FEL ${id} · ${check.name}`)
    console.log(`    ${e.message}`)
    process.exit(1)
  })
  .finally(() => {
    if (id.startsWith('B')) stopContainer()
  })
