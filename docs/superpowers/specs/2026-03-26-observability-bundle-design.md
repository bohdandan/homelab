# Observability Bundle Design

## Goal

Add an internal-only observability bundle to the homelab consisting of ChangeDetection, Uptime Kuma, ntfy, and Glances, while keeping image updates managed through Git via Renovate instead of runtime auto-updaters.

## Constraints

- Preserve the current infrastructure-as-code model.
- Keep the new observability services on `*.homelab.magnetic-marten.com`.
- Do not expose the new services publicly.
- Fit the current architecture:
  - K3s apps behind Traefik and CoreDNS
  - LAN DNS via UniFi forwarding to CoreDNS
  - Dev/admin VM used for operator tooling
- Avoid automatic in-place container updates outside git.

## Recommended Architecture

### K3s workloads

Deploy these applications in K3s as internal services with Traefik ingress and TLS:

- `changedetection.homelab.magnetic-marten.com`
- `kuma.homelab.magnetic-marten.com`
- `ntfy.homelab.magnetic-marten.com`

Each application gets its own namespace and persistent storage. They follow the same repo pattern as Homepage, n8n, and QuickDrop: rendered manifests in `kubernetes/base/<app>/manifests.yaml.j2`, applied by `ansible/playbooks/40-deploy-apps.yml`.

### Glances placement

Run Glances on `dev-admin-01` as a host service, not as a Kubernetes pod.

Rationale:

- It should observe the machine that runs Codex and admin tooling.
- Its MCP endpoint is most useful on the host where operators and agents connect.
- Running it on the VM avoids the compromises of containerized host monitoring.

Expose Glances through Traefik on:

- `glances.homelab.magnetic-marten.com`

The service will run on the dev VM web port, with MCP enabled from the same web server.

### DNS and ingress

CoreDNS will get explicit internal records for:

- `changedetection`
- `kuma`
- `ntfy`
- `glances`

All internal web hostnames route to the Traefik VIP `192.168.10.120`, except any hostnames that intentionally point to a host IP. Glances will still use Traefik as the public LAN entrypoint; Traefik will forward to the dev VM backend.

### Homepage integration

Homepage remains the operator landing page. The new services will appear there:

- ChangeDetection
- Uptime Kuma
- ntfy
- Glances

Glances should appear as an operator-facing card, and the dashboard should also include a Glances widget or monitor entry where practical.

The application catalog in `docs/application-catalog.json` remains the durable source of truth for operator-facing apps.

### Notifications

`ntfy` acts as the internal notification bus for the bundle:

- Uptime Kuma sends alerts to ntfy
- ChangeDetection sends change notifications to ntfy

Initial deployment only needs the applications available and reachable. App-level notification destinations can be completed in each app’s UI after deployment if there is no clean declarative path in the current repo.

### Authentication

- All new services remain LAN-only.
- Uptime Kuma uses its built-in application login.
- Glances must run with authentication because its MCP endpoint inherits web authentication.
- ntfy starts LAN-only; explicit ntfy user and ACL hardening can be added later if needed.
- ChangeDetection can start LAN-only unless a clean app-native auth path is added in the same implementation.

## Version Management

Do not use Watchtower.

Instead:

- Pin image versions explicitly in `ansible/group_vars/all/main.yml`
- Add a hosted Renovate configuration so upgrades arrive as git PRs
- Continue applying merged updates through Ansible and Kubernetes manifests

This keeps git as the source of truth and avoids live drift between running workloads and committed config.

## Data and Storage

Stateful workloads should prefer the worker node using the existing `homelab.io/stateful=true` placement pattern when they require persistent storage:

- ChangeDetection data
- Uptime Kuma data
- ntfy data

Glances is stateless enough to live on the dev VM as a service without K3s storage.

## Operational Flow

1. Merge Renovate PRs that update pinned versions.
2. Re-run `ansible/playbooks/40-deploy-apps.yml` to reconcile K3s workloads.
3. Re-run `ansible/playbooks/35-configure-dev-admin.yml` if a version bump affects dev VM tooling such as Glances.

## Testing Strategy

The implementation should verify:

- rendered manifests include the new internal hostnames
- CoreDNS resolves the new LAN names
- Homepage includes all required new app entries
- Renovate config exists and targets the repo’s pinned image references
- K3s workloads become healthy
- Glances web UI and MCP endpoint respond from the dev VM path

## Non-Goals

- Full metrics/logging stack such as Prometheus, Loki, or Grafana
- Public exposure of observability tools
- Automatic runtime image updates outside git
- Multi-host Glances rollout in this phase
