# CloudBeaver CE Design

## Goal

Add CloudBeaver Community Edition to the homelab as an internal-only database UI, available at `db.homelab.magnetic-marten.com`, with:

- a seeded CloudBeaver admin user from encrypted repo secrets
- a preconfigured connection entry for the existing in-cluster `n8n` PostgreSQL database
- Homepage integration
- Renovate-managed image pinning

## Constraints

- Keep CloudBeaver internal-only on `*.homelab.magnetic-marten.com`
- Follow the existing repo patterns:
  - K3s workload
  - Traefik ingress
  - CoreDNS internal hostname
  - Ansible-rendered manifests
  - Homepage application catalog coverage
- Keep git as the source of truth for deployment config
- Avoid relying on undocumented CloudBeaver internal workspace formats

## Recommended Approach

Deploy CloudBeaver CE in K3s with its documented initial configuration surfaces:

- `initial-data.conf` for the first admin account
- `data-sources.json` for the preconfigured `n8n` PostgreSQL connection

This cleanly seeds the admin login and the connection metadata, but not the saved database password. The password will need one manual save in the CloudBeaver UI after first login.

## Why This Approach

This is the best fit because it stays on CloudBeaver’s supported configuration model. CloudBeaver documents:

- initial admin/bootstrap data configuration
- declarative preconfigured data sources

But saved credentials are stored in `credentials-config.json` using CloudBeaver’s encrypted credential store. There is no clean, documented, stable way to seed a reusable plaintext DB password directly into CE configuration.

Inference: trying to fully automate saved DB credentials would require generating or mutating internal encrypted workspace files, which is brittle and upgrade-hostile.

## Hostname and Access Model

CloudBeaver will be exposed only on:

- `db.homelab.magnetic-marten.com`

Access model:

- internal-only through Traefik and CoreDNS
- no Cloudflare public exposure
- no Cloudflare Access policy
- TLS terminated by Traefik using the existing cert-manager path

## Deployment Shape

### Kubernetes

Deploy CloudBeaver CE as a dedicated K3s workload with:

- its own namespace
- persistent storage for workspace/config data
- service and ingress
- internal hostname only

### CoreDNS

Add:

- `db.homelab.magnetic-marten.com -> 192.168.10.120`

### Homepage

Add a Homepage entry for CloudBeaver so operators can reach it from the dashboard.

## Configuration Data

### Seeded from SOPS secrets

Store these in encrypted secrets:

- CloudBeaver admin username
- CloudBeaver admin password

### Seeded from repo config

Store these in repo-managed config/templates:

- hostname
- namespace
- image version
- persistent storage size
- preconfigured Postgres connection name and metadata
- PostgreSQL host/service name, port, database name, username

### Manual step that remains

After first login to CloudBeaver:

1. open the seeded PostgreSQL connection
2. enter the PostgreSQL password once
3. save credentials in CloudBeaver

This is the only expected manual step in this design.

## PostgreSQL Connection Model

The preconfigured connection should target the existing in-cluster PostgreSQL used by `n8n`:

- host: Kubernetes service `postgres`
- namespace: `n8n`
- database: `n8n`
- username: `n8n`
- port: `5432`

Because CloudBeaver will run in-cluster, it can reach the service over the cluster network.

## Renovate and Versioning

Pin the CloudBeaver CE image version in `ansible/group_vars/all/main.yml` and let Renovate raise PRs for future updates.

Operational update flow remains unchanged:

- merge Renovate PR
- re-run `ansible/playbooks/40-deploy-apps.yml`

## Files Likely to Change

- `ansible/group_vars/all/main.yml`
- `ansible/group_vars/all/secrets.sops.yaml.example`
- `kubernetes/base/cloudbeaver/manifests.yaml.j2`
- `kubernetes/base/coredns/manifests.yaml.j2`
- `kubernetes/base/homepage/manifests.yaml.j2`
- `ansible/playbooks/40-deploy-apps.yml`
- `docs/application-catalog.json`
- `README.md`
- new regression tests for CloudBeaver presence and configuration

## Testing Strategy

The implementation should verify:

- CloudBeaver manifest exists and includes namespace, PVC, service, ingress, and config
- internal DNS includes `db.homelab.magnetic-marten.com`
- Homepage includes CloudBeaver
- app catalog includes CloudBeaver
- live ingress returns the CloudBeaver login/setup page
- Kubernetes rollout succeeds

## Non-Goals

- Public exposure of CloudBeaver
- Fully automated seeding of saved PostgreSQL credentials inside CloudBeaver CE
- Managing multiple database backends in this phase
