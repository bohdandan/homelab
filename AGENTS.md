# Homelab Agent Notes

Use this file for durable repo rules that every agent should follow.

## Core Rules

- Keep this repository infrastructure-as-code first. Prefer changing tracked source files over making live-only changes.
- Never commit plaintext secrets. Store secrets only in `sops`-encrypted files.
- Put app-owned source, content, and tracked runtime configuration under `apps/<app>/` when an app needs it.
- When adding or removing a user-facing application, update:
  - `docs/application-catalog.json`
  - `kubernetes/base/homepage/manifests.yaml.j2`
  - DNS and exposure config if the hostname surface changes
- When adding a LAN hostname, update CoreDNS config.
- When adding a public hostname, update Cloudflare/OpenTofu config and Access policy if needed.
- When operator workflow changes, update `README.md`.
- When app-owned content or configuration changes, update that app's `README.md` if the operator workflow or local development flow changed.

## Homepage Rule

- Homepage is the operator landing page for homelab apps.
- Every user-facing application that should appear there must be recorded in `docs/application-catalog.json`.
- Add a Homepage link only when a direct operator-facing URL is reasonable for the app. Infrastructure or support components may appear as status-only cards without an `href`.
- The Homepage regression tests enforce that each catalog entry marked with `"homepage_entry_required": true` exists in the Homepage manifest.
- Prefer LAN hostnames for Homepage links when a link exists so the dashboard works even when Cloudflare or Tunnel is unavailable.

## Done Criteria For New Applications

- Application runtime is defined in code and deployed successfully.
- Required secrets are stored only in encrypted files.
- LAN and/or public hostname behavior matches the intended design.
- Homepage was updated if the app is operator-facing.
- Verification commands were run and documented in the commit or handoff.

## Runbook

- Use [docs/add-application.md](/Users/bohdandanyliuk/Workspace/homelab/docs/add-application.md) when introducing a new application or removing one.
