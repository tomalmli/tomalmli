// Rättningens alla checks. Varje check är en funktion som svarar { ok, detail }.
// Samma kod körs av GitHub Classroom (node grading/check.js <ID>) och lokalt (npm run prov),
// på macOS, Windows och Linux – bara Node, npm, docker och git behövs (inga bash-verktyg).
//
// Del A · CI (kursmål 5) · Del B · Container (kursmål 3) · Del C · Säkerhet (kursmål 8) · Del D · Prestanda (kursmål 8)
// core: true = kärncheck. Alla kärnchecks i en del måste vara gröna för G på den delen.
const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')
const { spawnSync } = require('node:child_process')

const ROOT = path.resolve(__dirname, '..')
const APP = 'padelhallen'
const SUBROUTE = '/bokningar'
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const exists = (p) => fs.existsSync(path.join(ROOT, p))

// Kör ett kommando via systemets skal (cmd.exe på Windows, sh annars) och ger stdout+stderr.
const run = (cmd, opts = {}) => {
  const r = spawnSync(cmd, { cwd: ROOT, shell: true, encoding: 'utf8', timeout: opts.timeout || 120_000, env: { ...process.env, ...opts.env }, maxBuffer: 64 * 1024 * 1024 })
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}`, signal: r.signal }
}
const lastLines = (text, n) => String(text || '').trim().split('\n').slice(-n).join('\n')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const kB = (bytes) => `${(bytes / 1024).toFixed(1)} kB`
const MB = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

// Går igenom src/ och söker regex i .js/.vue-filer – ersätter grep
const walk = (dir) => {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.(js|vue|mjs|cjs)$/.test(entry.name)) out.push(full)
  }
  return out
}
const srcGrep = (regex) => {
  const hits = []
  const srcDir = path.join(ROOT, 'src')
  if (!fs.existsSync(srcDir)) return hits
  for (const file of walk(srcDir)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (regex.test(line)) hits.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim()}`)
    })
  }
  return hits
}

// ---------------------------------------------------------------------------
// Del A · CI
// ---------------------------------------------------------------------------
const WORKFLOW = '.github/workflows/ci.yml'
const EXPECTED_TESTS = 18 // så många test finns i utgångsläget – de får inte försvinna

const loadWorkflow = () => {
  if (!exists(WORKFLOW)) throw new Error(`${WORKFLOW} saknas`)
  const yaml = require('js-yaml')
  // js-yaml tolkar nyckeln "on" som booleskt true – hämta båda varianterna
  const doc = yaml.load(read(WORKFLOW))
  const on = doc.on ?? doc[true]
  return { doc, on, jobs: doc.jobs || {} }
}

const allSteps = (jobs) => Object.values(jobs).flatMap((job) => job.steps || [])
const runLines = (jobs) => allSteps(jobs).map((s) => String(s.run || '')).join('\n')

const A = {
  A1: {
    del: 'A', points: 5, core: true,
    name: 'Workflowen är giltig (actionlint hittar inga fel)',
    run: async () => {
      if (!exists(WORKFLOW)) return { ok: false, detail: `${WORKFLOW} saknas` }
      const { createLinter } = require('actionlint')
      const lint = await createLinter()
      const errors = lint(read(WORKFLOW), WORKFLOW)
      if (errors.length === 0) return { ok: true, detail: 'inga fel' }
      return { ok: false, detail: errors.map((e) => `rad ${e.line}: ${e.message.split('. see ')[0]}`).join(' · ') }
    }
  },
  A2: {
    del: 'A', points: 3, core: true,
    name: 'Körs på pull request och på push till main',
    run: async () => {
      const { on } = loadWorkflow()
      const events = Array.isArray(on) ? on : typeof on === 'string' ? [on] : Object.keys(on || {})
      const hasPr = events.includes('pull_request')
      const push = Array.isArray(on) || typeof on === 'string' ? null : on?.push
      const branches = push?.branches
      const hasMain = Array.isArray(branches) ? branches.includes('main') : branches === 'main'
      const problems = []
      if (!hasPr) problems.push('pull_request saknas')
      if (!events.includes('push')) problems.push('push saknas')
      else if (!hasMain) problems.push('push saknar branches: [main]')
      return { ok: hasPr && hasMain, detail: problems.length ? `triggers: ${events.join(', ') || '(inga)'} · ${problems.join(' · ')}` : 'pull_request + push till main' }
    }
  },
  A3: {
    del: 'A', points: 3, core: true,
    name: 'Koden hämtas med actions/checkout innan npm körs',
    run: async () => {
      const { jobs } = loadWorkflow()
      const bad = []
      for (const [id, job] of Object.entries(jobs)) {
        const steps = job.steps || []
        const firstRun = steps.findIndex((s) => /npm/.test(String(s.run || '')))
        if (firstRun === -1) continue
        const checkoutBefore = steps.slice(0, firstRun).some((s) => String(s.uses || '').startsWith('actions/checkout'))
        if (!checkoutBefore) bad.push(id)
      }
      return bad.length === 0 ? { ok: true, detail: 'checkout först i alla jobb som kör npm' } : { ok: false, detail: `jobb utan checkout före npm: ${bad.join(', ')}` }
    }
  },
  A4: {
    del: 'A', points: 3, core: true,
    name: 'Beroenden installeras med npm ci, inte npm install',
    run: async () => {
      const lines = runLines(loadWorkflow().jobs)
      const hasCi = /\bnpm ci\b/.test(lines)
      const hasInstall = /\bnpm (install|i)\b/.test(lines)
      return { ok: hasCi && !hasInstall, detail: hasInstall ? 'npm install används' : hasCi ? 'npm ci' : 'npm ci saknas' }
    }
  },
  A5: {
    del: 'A', points: 3, core: true,
    name: 'Testerna och bygget körs (npm run test:run + npm run build)',
    run: async () => {
      const lines = runLines(loadWorkflow().jobs)
      const test = /\bnpm run test:run\b/.test(lines) || /\bnpx vitest run\b/.test(lines)
      const build = /\bnpm run build\b/.test(lines)
      return { ok: test && build, detail: `test:run: ${test ? 'ja' : 'nej'} · build: ${build ? 'ja' : 'nej'}` }
    }
  },
  A6: {
    del: 'A', points: 3, core: false,
    name: 'Bygget sparas som artefakt (upload-artifact med path: dist)',
    run: async () => {
      const step = allSteps(loadWorkflow().jobs).find((s) => String(s.uses || '').startsWith('actions/upload-artifact'))
      if (!step) return { ok: false, detail: 'inget upload-artifact-steg' }
      const p = String(step.with?.path || '').trim().replace(/\/$/, '')
      return { ok: p === 'dist', detail: `path: ${p || '(saknas)'}` }
    }
  },
  A7: {
    del: 'A', points: 5, core: true,
    name: `Enhetstesterna är gröna (npm run test:run, alla ${EXPECTED_TESTS} test kvar)`,
    run: async () => {
      const r = run('npx vitest run', { timeout: 300_000 })
      const summary = (r.out.match(/Tests\s+.*\(\d+\)/) || [''])[0].trim()
      const failed = (r.out.match(/(\d+) failed/) || [])[1]
      const total = Number((r.out.match(/Tests\s+.*\((\d+)\)/) || [])[1] || 0)
      if (r.status !== 0 || failed) return { ok: false, detail: summary || lastLines(r.out, 8) }
      if (total < EXPECTED_TESTS) return { ok: false, detail: `${summary} – utgångsläget hade ${EXPECTED_TESTS} test; laga koden, ta inte bort tester` }
      return { ok: true, detail: summary }
    }
  }
}

// ---------------------------------------------------------------------------
// Del B · Container
// ---------------------------------------------------------------------------
const IMAGE = `${APP}-prov`
const CONTAINER = `${APP}-prov-run`
const HOST_PORT = 18080
const BASE = `http://localhost:${HOST_PORT}`

const dockerOk = () => run('docker version').status === 0
const noDocker = { ok: false, detail: 'Docker körs inte här – checken görs av GitHub Actions när du pushar' }

const ensureImage = () => {
  if (run(`docker image inspect ${IMAGE}`).status === 0) return { ok: true, detail: 'imagen finns' }
  const r = run(`docker build -t ${IMAGE} .`, { timeout: 900_000 })
  if (r.status !== 0 || run(`docker image inspect ${IMAGE}`).status !== 0) {
    return { ok: false, detail: `docker build misslyckades:\n${lastLines(r.out, 8)}` }
  }
  return { ok: true, detail: 'byggd' }
}

const httpGet = async (p) => {
  try {
    const res = await fetch(BASE + p, { redirect: 'manual' })
    return { code: String(res.status), body: await res.text() }
  } catch {
    return { code: '000', body: '' }
  }
}

const ensureRunning = async () => {
  const img = ensureImage()
  if (!img.ok) return img
  run(`docker rm -f ${CONTAINER}`)
  const r = run(`docker run -d --name ${CONTAINER} -p ${HOST_PORT}:80 ${IMAGE}`)
  if (r.status !== 0) return { ok: false, detail: `docker run misslyckades: ${lastLines(r.out, 3)}` }
  // vänta tills servern svarar (max ~10 s)
  for (let i = 0; i < 20; i++) {
    if ((await httpGet('/')).code !== '000') return { ok: true, detail: 'kör' }
    await wait(500)
  }
  const logs = lastLines(run(`docker logs ${CONTAINER}`).out, 5)
  return { ok: false, detail: `containern svarar inte på port 80. Logg:\n${logs}` }
}

const stopContainer = () => run(`docker rm -f ${CONTAINER}`)

const B = {
  B1: {
    del: 'B', points: 5, core: true,
    name: 'docker build lyckas',
    run: async () => {
      if (!dockerOk()) return noDocker
      run(`docker image rm -f ${IMAGE}`)
      return ensureImage()
    }
  },
  B2: {
    del: 'B', points: 4, core: true,
    name: 'Containern serverar appen på port 80 (GET / ger 200 med appens HTML)',
    run: async () => {
      if (!dockerOk()) return noDocker
      const up = await ensureRunning()
      if (!up.ok) return up
      const { code, body } = await httpGet('/')
      const ok = code === '200' && body.includes('id="app"')
      return { ok, detail: `GET / → ${code}${ok ? ', index.html' : ''}` }
    }
  },
  B3: {
    del: 'B', points: 5, core: true,
    name: `Omladdning på en underroute fungerar (GET ${SUBROUTE} ger appen, inte 404)`,
    run: async () => {
      if (!dockerOk()) return noDocker
      const up = await ensureRunning()
      if (!up.ok) return up
      const { code, body } = await httpGet(SUBROUTE)
      const ok = code === '200' && body.includes('id="app"')
      return { ok, detail: `GET ${SUBROUTE} → ${code}${ok ? ', index.html' : ''}` }
    }
  },
  B4: {
    del: 'B', points: 4, core: true,
    name: 'Färdiga imagen innehåller ingen Node (multi-stage)',
    run: async () => {
      if (!dockerOk()) return noDocker
      const img = ensureImage()
      if (!img.ok) return img
      const r = run(`docker run --rm --entrypoint node ${IMAGE} --version`)
      return r.status === 0 ? { ok: false, detail: `node ${lastLines(r.out, 1)} finns i imagen` } : { ok: true, detail: 'ingen node i imagen' }
    }
  },
  B5: {
    del: 'B', points: 4, core: false,
    name: 'Imagen är under 100 MB (uppackat innehåll, docker image inspect)',
    run: async () => {
      if (!dockerOk()) return noDocker
      const img = ensureImage()
      if (!img.ok) return img
      const size = Number(lastLines(run(`docker image inspect -f "{{.Size}}" ${IMAGE}`).out, 1))
      return { ok: size > 0 && size < 100 * 1024 * 1024, detail: MB(size) }
    }
  },
  B6: {
    del: 'B', points: 3, core: false,
    name: '.dockerignore finns och utesluter node_modules, dist och .git',
    run: async () => {
      if (!exists('.dockerignore')) return { ok: false, detail: '.dockerignore saknas' }
      const lines = read('.dockerignore').split('\n').map((l) => l.trim().replace(/^\*\*\//, '').replace(/^\//, '').replace(/\/(\*\*)?$/, ''))
      const missing = ['node_modules', 'dist', '.git'].filter((x) => !lines.includes(x))
      return { ok: missing.length === 0, detail: missing.length ? `saknar raden: ${missing.join(', ')}` : 'ok' }
    }
  }
}

// ---------------------------------------------------------------------------
// Del C · Säkerhet
// ---------------------------------------------------------------------------
// C1–C3 körs som node:test mot en API-process (grading/api.test.cjs), C4–C5 som Vitest mot
// frontenden (grading/xss.test.js, grading/token.test.js). Varje check plockar ut sitt resultat.
let apiResults = null
const runApiTests = () => {
  if (apiResults) return apiResults
  const r = run('node --test-reporter=tap --test grading/api.test.cjs', { timeout: 120_000 })
  apiResults = { ...parseTap(r.out), _raw: r.out }
  return apiResults
}

let frontResults = null
const runFrontTests = () => {
  if (frontResults) return frontResults
  const r = run('npx vitest run --config grading/vitest.config.mjs --reporter=tap-flat', { timeout: 300_000 })
  frontResults = { ...parseTap(r.out), _raw: r.out }
  return frontResults
}

// Plockar "ok/not ok N - <namn>" ur TAP och parar med testets ID i namnet, t.ex. "C1 …".
// Felmeddelandet hämtas ur YAML-blocket efter raden: node:test skriver "error: |-" + indragna
// rader (eller "error: 'text'"), Vitest skriver "message: ...".
const parseTap = (tap) => {
  const results = {}
  const lines = String(tap).split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*(not ok|ok)\s+\d+\s+-\s+(?:.*?>\s)*([A-D]\d)\b/)
    if (!m) continue
    const id = m[2]
    const ok = m[1] === 'ok'
    let detail = ''
    if (!ok) {
      for (let j = i + 1; j < lines.length && !/^\s*(not ok|ok)\s+\d+/.test(lines[j]); j++) {
        const e = lines[j].match(/^\s*(?:error|message):\s*(.*)$/)
        if (!e || e[1].trim() === '') continue
        if (e[1].trim() === '|-' || e[1].trim() === '|') {
          const indent = (lines[j + 1] || '').match(/^\s*/)[0].length
          const block = []
          for (let k = j + 1; k < lines.length; k++) {
            if (lines[k].match(/^\s*/)[0].length < indent) break
            block.push(lines[k].trim())
          }
          detail = block.join(' ')
        } else {
          detail = e[1].trim().replace(/^['"]|['"]$/g, '')
        }
        break
      }
    }
    // node:tests diff efter meddelandet ("+ actual - expected …") tillför inget
    detail = detail.split(/\s\+ actual - expected/)[0]
    results[id] = { ok, detail: detail.replace(/\s+/g, ' ').slice(0, 300) }
  }
  return results
}

const fromTests = (runner, id, fallback) => async () => {
  const all = runner()
  const res = all[id]
  if (!res) return { ok: false, detail: `${fallback}:\n${lastLines(all._raw, 6)}` }
  return { ok: res.ok, detail: res.ok ? 'ok' : res.detail || 'testet föll' }
}

const C = {
  C1: { del: 'C', points: 6, core: true, name: 'Man kan bara se sina egna bokningar (inget IDOR-hål på /api/bookings)', run: fromTests(runApiTests, 'C1', 'API-testet kunde inte köras – startar servern?') },
  C2: { del: 'C', points: 5, core: false, name: 'En token signerad med den gamla hemligheten avvisas (401)', run: fromTests(runApiTests, 'C2', 'API-testet kunde inte köras') },
  C3: { del: 'C', points: 4, core: true, name: 'Hemligheten kommer bara från miljön: server utan JWT_SECRET startar inte, token signerad med miljöns JWT_SECRET godtas', run: fromTests(runApiTests, 'C3', 'API-testet kunde inte köras') },
  C4: { del: 'C', points: 5, core: true, name: 'Meddelanden renderas som text – HTML i ett meddelande körs inte (ingen XSS)', run: fromTests(runFrontTests, 'C4', 'Vitest-testet kunde inte köras (finns src/views/MessagesView.vue kvar?)') },
  C5: { del: 'C', points: 5, core: true, name: 'Token ligger inte i localStorage/sessionStorage efter inloggning, men skickas ändå med i anropen', run: fromTests(runFrontTests, 'C5', 'Vitest-testet kunde inte köras (finns login/fetchBookings kvar i src/services/api.js?)') }
}

// ---------------------------------------------------------------------------
// Del D · Prestanda
// ---------------------------------------------------------------------------
const DIST = path.join(ROOT, 'dist', 'assets')
let built = false
const ensureDist = () => {
  if (built || fs.existsSync(DIST)) {
    built = true
    return { ok: true, detail: 'dist finns' }
  }
  const r = run('npm run build', { timeout: 300_000 })
  built = fs.existsSync(DIST)
  return built ? { ok: true, detail: 'byggd' } : { ok: false, detail: `npm run build misslyckades:\n${lastLines(r.out, 8)}` }
}
const distFiles = () => fs.readdirSync(DIST).map((f) => ({ name: f, size: fs.statSync(path.join(DIST, f)).size }))
const gzipSize = (f) => zlib.gzipSync(fs.readFileSync(path.join(DIST, f))).length

const D = {
  D1: {
    del: 'D', points: 3, core: true,
    name: 'Produktionsbygget lyckas (npm run build)',
    run: async () => {
      fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true })
      built = false
      return ensureDist()
    }
  },
  D2: {
    del: 'D', points: 5, core: true,
    name: 'Ingen bild i bygget är över 300 kB',
    run: async () => {
      const d = ensureDist()
      if (!d.ok) return d
      const images = distFiles().filter((f) => /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(f.name)).sort((a, b) => b.size - a.size)
      if (images.length === 0) {
        // Vite lägger bilder under 4 kB direkt i JavaScript som data-URI – också godkänt
        const inlined = distFiles().some((f) => f.name.endsWith('.js') && /data:image\//.test(fs.readFileSync(path.join(DIST, f.name), 'utf8')))
        return inlined ? { ok: true, detail: 'bilden är inlinad (< 4 kB)' } : { ok: false, detail: 'ingen bild i bygget – hero-bilden ska finnas kvar' }
      }
      const biggest = images[0]
      return { ok: biggest.size < 300 * 1024, detail: `störst: ${biggest.name} ${kB(biggest.size)}` }
    }
  },
  D3: {
    del: 'D', points: 5, core: true,
    name: 'Vyerna laddas lazy – minst tre egna chunkar för vyer',
    run: async () => {
      const d = ensureDist()
      if (!d.ok) return d
      const views = distFiles().filter((f) => /View-.*\.js$/.test(f.name))
      return { ok: views.length >= 3, detail: `${views.length} vy-chunkar: ${views.map((v) => v.name.split('-')[0]).join(', ') || '(inga)'}` }
    }
  },
  D4: {
    del: 'D', points: 4, core: true,
    name: 'Startbundlen (index-*.js) är under 60 kB gzip',
    run: async () => {
      const d = ensureDist()
      if (!d.ok) return d
      const entry = distFiles().find((f) => /^index-.*\.js$/.test(f.name))
      if (!entry) return { ok: false, detail: 'index-*.js saknas' }
      const gz = gzipSize(entry.name)
      return { ok: gz < 60 * 1024, detail: `${entry.name}: ${kB(gz)} gzip` }
    }
  },
  D5: {
    del: 'D', points: 3, core: false,
    name: 'lodash är borta (inte i package.json, inte importerad i src)',
    run: async () => {
      const pkg = JSON.parse(read('package.json'))
      const inPkg = Boolean(pkg.dependencies?.lodash || pkg.devDependencies?.lodash)
      const inSrc = srcGrep(/from ['"]lodash/)
      return { ok: !inPkg && inSrc.length === 0, detail: inPkg ? 'lodash finns i package.json' : inSrc[0] || 'borta' }
    }
  },
  D6: {
    del: 'D', points: 3, core: false,
    name: 'Chart.js registrerar bara det som ritas (ingen import av chart.js/auto)',
    run: async () => {
      const hit = srcGrep(/from ['"]chart\.js\/auto['"]/)
      const registers = srcGrep(/Chart\.register\(/)
      return { ok: hit.length === 0 && registers.length > 0, detail: hit[0] || (registers.length ? 'namngivna importer + Chart.register' : 'Chart.register saknas') }
    }
  },
  D7: {
    del: 'D', points: 2, core: false,
    name: 'Hero-bilden har width och height (platsen reserveras, inget hopp)',
    run: async () => {
      const file = 'src/views/DashboardView.vue'
      if (!exists(file)) return { ok: false, detail: `${file} saknas` }
      const img = (read(file).match(/<img[^>]*hero[^>]*>/s) || [])[0]
      if (!img) return { ok: false, detail: 'ingen <img …hero…> i DashboardView.vue' }
      const ok = /\bwidth=/.test(img) && /\bheight=/.test(img) && !/loading=["']lazy/.test(img)
      return { ok, detail: ok ? 'width + height, inte lazy' : img.replace(/\s+/g, ' ').slice(0, 120) }
    }
  }
}

const CHECKS = { ...A, ...B, ...C, ...D }
const DELAR = {
  A: { name: 'CI-pipelinen', mal: 'kursmål 5' },
  B: { name: 'Containern', mal: 'kursmål 3' },
  C: { name: 'Säkerheten', mal: 'kursmål 8' },
  D: { name: 'Prestandan', mal: 'kursmål 8' }
}

module.exports = { CHECKS, DELAR, stopContainer }
