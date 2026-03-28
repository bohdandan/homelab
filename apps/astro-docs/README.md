# Astro Docs

Minimal Starlight source tree for the homelab docs app.

Hostnames:

- Public: `docs.magnetic-marten.com`
- LAN: `docs.homelab.magnetic-marten.com`

This app is built into a static image and served by Nginx in K3s.
It is the reference example for the repo's `apps/<app>/` convention: app-owned source lives here, while deployment wiring stays in `kubernetes/`, `ansible/`, and `opentofu/`.

Local `npm` commands require Node `22.12.0` or newer.

- `npm run dev` for local development
- `npm run build` to produce the static site in `dist/`
- `npm run preview` to preview the built output
