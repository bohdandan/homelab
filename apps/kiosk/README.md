# Kiosk

A simple fullscreen family routine dashboard for an Android tablet running Fully Kiosk Browser.

## What It Shows

- Huge 24-hour London clock
- Current routine label and instruction
- Next upcoming event from today's schedule
- Simple timeline of up to six events
- Optional Chinese learning card that rotates every five minutes
- Time-based colour theme from `config/dashboard.json`

## Configuration

Edit `config/dashboard.json`.

The app reads this file at runtime through `/config/dashboard.json`, so a Docker volume mount can update the dashboard configuration without changing the app code.

In the homelab deployment, this file is rendered into a Kubernetes ConfigMap and mounted read-only into the container. Keep schedule and task defaults here so they remain tracked in git.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Build

```bash
npm run build
npm run start
```

## Docker

```bash
docker compose up -d
```

Then open [http://localhost:3000](http://localhost:3000), or point Fully Kiosk Browser at your homelab host URL.

## Kiosk Notes

- Use landscape orientation on a 10-11 inch tablet.
- Enable fullscreen mode in Fully Kiosk Browser.
- No login, database, API server, or admin UI is required for v1.
- Future tap/click state should start in browser storage before adding a backend.
- Keep the JSON event list short; the dashboard displays a maximum of six timeline items.
