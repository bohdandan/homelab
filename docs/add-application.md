# Adding An Application

Use this checklist whenever a new application is added to the homelab or an existing one is removed.

## 1. Decide The Application Shape

- Is it a Kubernetes workload, a dedicated VM, or an external service behind the homelab?
- Should it be LAN-only, public, or both?
- What is the canonical operator-facing hostname?
- Should it appear on Homepage?

## 2. Add The Runtime

- Add or update app-owned content and configuration under `apps/<app>/` when the application has source files, content, static assets, or tracked runtime config that belongs with the app itself.
- For Kubernetes workloads:
  - keep deployment manifests under `kubernetes/base/<app>/`
  - wire deployment into `ansible/playbooks/40-deploy-apps.yml` if needed
- For VMs:
  - update `opentofu/proxmox/`
  - update inventory generation and any Ansible configuration playbooks

## 3. Wire Networking And Exposure

- LAN-only app:
  - prefer `*.homelab.magnetic-marten.com`
  - if Traefik-hosted, make sure the ingress host exists
  - if it needs a dedicated LAN target, update `kubernetes/base/coredns/manifests.yaml.j2`
- Public app:
  - update Cloudflare/OpenTofu resources
  - decide whether it should be proxied through Cloudflare Tunnel or exposed as direct ingress / DNS-only
  - add or update Cloudflare Access policy if the app should be protected
- If the app is reachable through Traefik, prefer using the LAN hostname in Homepage.

## 4. Update The Application Catalog And Homepage

- Add or update the entry in `docs/application-catalog.json`
- If `"homepage_entry_required": true`, add or update the Homepage card in `kubernetes/base/homepage/manifests.yaml.j2`
- Add an `href` only when a direct operator-facing URL is reasonable for the app; otherwise keep the Homepage entry as a status-only card
- Keep the title and `href` in Homepage aligned with the catalog entry when an `href` is present so the regression test stays meaningful

## 5. Verification

- Run targeted tests:
  - `python3 -m unittest tests/test_homepage_required_config.py tests/test_homepage_application_catalog.py`
- For Kubernetes workloads, verify health:
  - `kubectl --kubeconfig ansible/runtime/kubeconfig.raw get pods -A`
- Verify hostnames with the intended path:
  - LAN: `curl -skI https://<internal-hostname>`
  - Public: `curl -I https://<public-hostname>`
- If the change affects operators, update `README.md`
- If the app owns source or content under `apps/<app>/`, update that app README too

## Current Pattern

- Public app hostnames use first-level names on `magnetic-marten.com` and are protected by Cloudflare Access where required.
- Internal app hostnames use `*.homelab.magnetic-marten.com` and resolve through UniFi -> CoreDNS.
- Homepage links should generally use internal hostnames when a link is appropriate so the dashboard remains useful on the LAN without depending on Cloudflare.
- App-owned source and configuration live under `apps/<app>/`; Kubernetes and infra wiring stay in their existing top-level folders.
