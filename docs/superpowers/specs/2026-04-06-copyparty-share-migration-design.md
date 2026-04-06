# Copyparty Share Migration Design

## Goal

Replace QuickDrop with a single `copyparty` deployment that keeps the existing share hostnames and supports both:

- normal authenticated file sharing on permanent internal storage
- read-only exposure of a removable external SSD for large video ingest/download workflows

This migration should preserve the current uploaded QuickDrop files by copying them into the new permanent share volume, but it does not need to preserve QuickDrop users, settings, or existing share links.

## Constraints

- Keep the current public and internal share hostnames:
  - `share.magnetic-marten.com`
  - `share.homelab.magnetic-marten.com`
- Keep the public hostname as direct ingress / DNS-only, not Cloudflare proxied, so large transfers are not blocked by Cloudflare upload limits.
- Keep infrastructure-as-code as the source of truth:
  - app-owned config under `apps/copyparty/`
  - deployment wiring under `kubernetes/`, `ansible/`, and `opentofu/`
- Reuse the existing dedicated second internal SSD on `k3s-worker-01` for permanent share storage.
- Treat the removable external SSD as ingest media and expose it read-only.
- Do not require QuickDrop DB migration or compatibility with existing QuickDrop share links.
- Keep Homepage updated and operator-facing through the internal hostname.

## Recommended Approach

Use one `copyparty` instance to replace QuickDrop completely.

The deployment should expose two logical volumes:

- `/share`
  - permanent internal share
  - read-write for authenticated users
  - backed by the dedicated internal SSD already attached to `k3s-worker-01`
- `/ingest`
  - removable ingest media
  - read-only
  - backed by a stable mountpoint for the external SSD when attached

This is the best fit because it collapses small-file sharing and large removable-media distribution into one service and one operator workflow.

## Why This Approach

QuickDrop is optimized for a simpler browser upload/share flow, but it is a poor fit for `150–300 GB` media workflows and currently has practical client-side limits that become awkward at that scale.

`copyparty` is a stronger fit for the actual job to be done:

- very large uploads and downloads
- resumable transfer behavior
- multiple volumes with distinct permissions
- authenticated access plus temporary share links
- WebDAV and other protocol options if needed later

Replacing QuickDrop instead of running both services also keeps the homelab simpler to operate:

- one file-sharing UI
- one auth model
- one public endpoint
- one Homepage card

## Storage Design

### Permanent internal share

Repurpose the current QuickDrop dedicated files disk path into a Copyparty-owned permanent share path on `k3s-worker-01`.

Recommended path:

- `/var/lib/copyparty/share`

This path should hold the migrated QuickDrop files and all future normal uploads intended to live on internal storage.

### Removable ingest mount

Expose the removable external SSD through a stable host path which is mounted only when the ingest disk is attached.

Recommended path:

- `/srv/ingest/current`

`copyparty` should present this path as a read-only volume. The design should not assume the disk is always attached.

If the external SSD is missing, the service should still remain healthy. The operator runbook should make it explicit that `/ingest` is only meaningful when the removable drive is mounted.

### Backup behavior

The permanent share lives on the internal SSD already excluded from Proxmox backup at the VM-disk level.

The removable ingest SSD should remain outside the normal VM backup path entirely.

Inference: this preserves the intended storage model:

- external SSD for backups
- one internal SSD for normal Proxmox / VM / K3s storage
- one internal SSD dedicated to permanent shared files

## Hostname And Access Model

### Public hostname

- `share.magnetic-marten.com`

Exposure:

- direct public ingress
- DNS-only Cloudflare record
- no Cloudflare Access in front of the service

This keeps large transfers off the Cloudflare proxy path.

### Internal hostname

- `share.homelab.magnetic-marten.com`

Exposure:

- CoreDNS internal hostname
- Traefik ingress on the existing VIP

### Homepage

Homepage should continue linking to the internal hostname, but the app title and semantics should change from QuickDrop to Copyparty.

## Copyparty Runtime Shape

Deploy Copyparty as:

- a dedicated namespace
- one Deployment
- one ClusterIP Service
- one Traefik Ingress with:
  - `share.magnetic-marten.com`
  - `share.homelab.magnetic-marten.com`

App-owned runtime configuration should live under:

- `apps/copyparty/`

That folder should contain:

- Copyparty config
- operator README
- any static bootstrap content or auth-related tracked config

## Auth And Sharing Model

Use authenticated access by default for the permanent `/share` volume.

Recommended model:

- one admin/operator account
- one or more collaborator accounts
- read-write access only where explicitly intended
- temporary share links used when unauthenticated download access is needed

For `/ingest`:

- read-only exposure
- no write access through the web UI

This protects the removable media from accidental modification while still making it easy to distribute large recordings.

## Migration Plan Shape

### Runtime cutover

Perform the migration in two phases:

1. Stand up Copyparty in parallel with QuickDrop, but not yet on the live `share.*` hostname surface. Pre-cutover verification should use a temporary internal-only validation path such as direct service access, port-forwarding, or a temporary internal hostname.
2. After storage and routing are verified, switch the `share.*` ingress surface from QuickDrop to Copyparty and remove QuickDrop from the repo.

### Data migration

Copy the current QuickDrop file contents into the new permanent Copyparty `/share` path.

Do not migrate:

- QuickDrop database state
- QuickDrop users
- QuickDrop passwords
- QuickDrop share links

This keeps the migration simple and avoids preserving behavior that is not needed.

## Repo Changes

### New app-owned folder

Add:

```text
apps/
  copyparty/
    README.md
    copyparty.conf
```

Additional app-owned files are fine if the implementation needs them, but the repo should keep the app surface small and understandable.

### Files likely to change

- `ansible/group_vars/all/main.yml`
- `ansible/playbooks/32-configure-stateful-storage.yml`
- `ansible/playbooks/40-deploy-apps.yml`
- `kubernetes/base/homepage/manifests.yaml.j2`
- `kubernetes/base/coredns/manifests.yaml.j2`
- `kubernetes/base/copyparty/manifests.yaml.j2`
- `docs/application-catalog.json`
- `README.md`
- `apps/copyparty/*`
- QuickDrop-specific manifests/tests/docs to be removed after cutover

## Testing Strategy

Implementation should verify:

- the Copyparty app-owned config exists under `apps/copyparty/`
- the permanent share host path exists on the worker and is mounted from the dedicated internal SSD
- the removable ingest mountpoint exists and is exposed read-only
- CoreDNS still resolves `share.homelab.magnetic-marten.com`
- the public share DNS/exposure wiring still points to direct ingress
- Homepage and app catalog reference Copyparty instead of QuickDrop
- Copyparty rollout succeeds in K3s
- current QuickDrop files are present under the new `/share` volume after migration
- `https://share.homelab.magnetic-marten.com` responds correctly
- `https://share.magnetic-marten.com` responds correctly

## Non-Goals

- preserving existing QuickDrop share links or passwords
- keeping QuickDrop as a parallel long-term service
- turning the removable ingest disk into permanent storage
- introducing a separate NAS appliance in this phase
- changing the current public hostname model for file sharing
