# Padelhallen – Mina sidor

Padelhallen Sundbys medlemsportal: se dina bokningar, boka bana och läs meddelanden från hallen.
Vue 3 + Vite + Pinia i frontenden, ett Express-API (`mock-api/`) med JWT-inloggning bakom.

## Kom igång

    cp .env.example .env     # lokala inställningar för API:t
    npm install
    npm run api              # API:t på http://localhost:4000 (egen terminal)
    npm run dev              # appen på http://localhost:5173

Testkonton: `sara.ek@example.com` / `padel-sara` och `noel.berg@example.com` / `padel-noel`.

## Kvalitet

    npm run test:run         # enhets- och komponenttester (Vitest)
    npm run build            # produktionsbygge till dist/
    npm run preview          # serverar dist/ på http://localhost:4173 (API:t måste köra)
    docker build -t padelhallen . && docker run --rm -p 8080:80 padelhallen

## Övningen inför labbprovet

Uppgiften står i `OVNING.md` (samma text som i Canvas). Rättningen kör du själv med `npm run prov`,
och den körs automatiskt av GitHub Actions vid varje push.
