# Övning inför labbprovet · Padelhallen – laga fyra saker
*Släpps onsdag 7/10 · görs på egen hand före torsdag 15/10 · Kursmål 1, 3, 5 och 8*

**Läs så här:** det här är **samma format som labbprovet**, med en annan app och andra fel. Gör den innan provet, gärna på tid, så vet du hur rättningen ser ut och var du är långsam. Allt du behöver för varje del står under delen. Sist står när du är klar. Ingen inlämning – övningen är för dig.

Padelhallen Sundby har fått en ny medlemsportal, *Padelhallen – Mina sidor*, levererad av en byrå. Pipelinen är röd, containern startar inte, API:t läcker andras bokningar och startsidan är seg. Du tar över.

## Sätt igång

1. Öppna mallrepot **`fux25-labbprov-ovning`** (länk i Canvas). **Use this template → Create a new repository**, namn `provovning-<ditt användarnamn>`, Public.
2. Klona, installera, starta:

```bash
git clone <din repo-url> && cd provovning-<användarnamn>
npm install
npm run api        # API:t på :4000 – egen terminal
npm run dev        # appen på http://localhost:5173
```

Logga in med `sara.ek@example.com` / `padel-sara`. Det finns ett konto till: `noel.berg@example.com` / `padel-noel`.

3. Kör rättningen:

```bash
npm run prov
```

Den skriver ut 25 checks, vad som är rött och varför. Samma checks körs av GitHub Actions vid varje push (workflowen *Autograding Tests* under **Actions**). En del i taget: `npm run prov -- C`.

## Så fungerar provet – och därmed den här övningen

- Fyra delar, en per kursmål. **Checks märkta ★ är kärnchecks: alla ★ i en del måste vara gröna för godkänt på den delen.** De andra ger poäng men avgör inte godkänt.
- På provet är AI, internet och egna anteckningar tillåtna, samarbete inte. Alla får ett stickprov: tre minuter där du förklarar något du lagat. Öva på det nu: säg högt, för varje fix, *vad felet var, varför ändringen lagar det, och vilken princip från kursen det är*.
- Rör inte `grading/` och `.github/workflows/classroom.yml`.
- **Behåll filnamn, funktionsnamn och routes.** Rättningen letar efter `src/views/MessagesView.vue`, `src/views/DashboardView.vue`, `login` och `fetchBookings` i `src/services/api.js`, `/api/bookings` och `/api/login` i API:t, samt de 18 testerna. Laga koden – döp inte om och ta inte bort.

## De fyra delarna

### Del A · Pipelinen (kursmål 5)

Byrån har en workflow-fil, men den har aldrig kört. Var måste en workflow ligga för att GitHub ska se den? Läs den sedan rad för rad mot vecka 3. Ett test är dessutom rött: `npm run test:run`, läs felet, laga **koden**.

| Check | Vad som ska stämma | p |
|---|---|---|
| A1 ★ | `.github/workflows/ci.yml` finns och `actionlint` hittar inga fel (samma kontroll som när GitHub säger *Invalid workflow file*) | 5 |
| A2 ★ | Körs på varje pull request och på push till `main` | 3 |
| A3 ★ | `actions/checkout` körs innan något `npm`-kommando | 3 |
| A4 ★ | `npm ci`, inte `npm install` | 3 |
| A5 ★ | `npm run test:run` och `npm run build` körs | 3 |
| A6 | `actions/upload-artifact` med `path: dist` | 3 |
| A7 ★ | Alla 18 enhetstester är gröna (laga koden, ta inte bort tester) | 5 |

### Del B · Containern (kursmål 3)

Den här gången är Dockerfilen redan multi-stage, men containern startar inte, och när den startar visar den fel sak. Läs byggloggen och `docker logs`. Fråga dig: vad heter mappen Vite bygger till? Var ska en `server { … }`-fil ligga i nginx-imagen?

| Check | Vad som ska stämma | p |
|---|---|---|
| B1 ★ | `docker build -t padelhallen .` lyckas | 5 |
| B2 ★ | `docker run -p 8080:80 padelhallen` → `http://localhost:8080/` ger appen | 4 |
| B3 ★ | `http://localhost:8080/bokningar` ger appen, inte 404 | 5 |
| B4 ★ | Ingen Node i den färdiga imagen (`docker run --rm --entrypoint node padelhallen --version` ska misslyckas – `--entrypoint node` kör `node` i stället för nginx) | 4 |
| B5 | Imagen under 100 MB enligt `docker image inspect -f '{{.Size}}' padelhallen` (uppackat innehåll; `docker image ls` kan visa mer i DISK USAGE) | 4 |
| B6 | `.dockerignore` har raderna `node_modules`, `dist` och `.git` (exakt så, en per rad) | 3 |

### Del C · Säkerheten (kursmål 8)

Samma sorts hål som i hackerlabbet. Bevisa dem med `curl` innan du lagar dem.

| Check | Vad som ska stämma | p |
|---|---|---|
| C1 ★ | Inloggad som Sara kan man **inte** få Noels bokningar via `/api/bookings` – vems bokningar avgörs av token | 6 |
| C2 | En token signerad med hemligheten som stod i koden avvisas (401) | 5 |
| C3 ★ | Servern **vägrar starta** utan `JWT_SECRET` (inget standardvärde i koden), och en token signerad med miljöns `JWT_SECRET` godtas. Din egen hemlighet lägger du i `.env` (`cp .env.example .env`, minst 32 tecken) – `npm run api` läser den, rättningen sätter sin egen | 4 |
| C4 ★ | Ett meddelande med HTML visas som text (ingen XSS) | 5 |
| C5 ★ | Token ligger inte i `localStorage` **eller `sessionStorage`** efter inloggning (ett skript på sidan läser båda lika lätt), men skickas med som `Authorization: Bearer` | 5 |

### Del D · Prestandan (kursmål 8)

Mät före och efter som i prestandajakten (`npm run build && npm run preview`, DevTools → Performance, enhetsläge, Fast 4G, cache av).

| Check | Vad som ska stämma | p |
|---|---|---|
| D1 ★ | `npm run build` lyckas | 3 |
| D2 ★ | Ingen bild i `dist/` över 300 kB – hero-bilden kvar, i rätt storlek och format | 5 |
| D3 ★ | Minst tre egna chunkar för vyer (lazy routes) | 5 |
| D4 ★ | `index-*.js` under 60 kB gzip | 4 |
| D5 | lodash borta ur `package.json` och `src/` | 3 |
| D6 | Chart.js med namngivna importer + `Chart.register(…)`, inte `chart.js/auto` (och mocken i testet) | 3 |
| D7 | Hero-bilden har `width` och `height`, inte `loading="lazy"` | 2 |

## Om något strular

| Problem | Gör så här |
|---|---|
| Docker Desktop startar inte | Pusha – Actions bygger imagen och visar resultatet under *Autograding Tests* |
| `npm run prov` säger att en check inte kunde köras | Läs raderna under: slutet av testets utskrift. Oftast kraschar API:t vid start (kör `npm run api` och läs felet), eller så är en fil/funktion omdöpt |
| Actions visar inget efter push | Vänta en minut, ladda om. `npm run prov` lokalt så länge |
| Något annat | Ta med frågan till onsdagspasset 14/10 |

## Du är klar när

`npm run prov` visar **G ✅ på alla fyra delar** och du kan förklara varje ändring högt. Skriv upp hur lång tid varje del tog – provet är tre timmar. Fastnade du någonstans? Ta med frågan till onsdagspasset 14/10, det är sista tillfället före provet.
