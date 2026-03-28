# Apps Layout And Astro Docs Design

## Goal

Introduce a top-level `apps/` convention for app-owned content and configuration, and use it first for a new blank Astro Starlight docs site that is:

- hosted on K3s
- public at `docs.magnetic-marten.com` without authentication
- available internally at `docs.homelab.magnetic-marten.com`
- integrated into Homepage and the existing homelab routing model

## Constraints

- Keep the existing infrastructure folders in place:
  - `ansible/`
  - `opentofu/`
  - `packer/`
  - `kubernetes/`
- Do not refactor existing apps into `apps/` in this step.
- Make `apps/` the new convention for app-owned source/content/config going forward.
- Keep Astro docs publicly reachable without Cloudflare Access.
- Keep the docs app homelab-hosted through K3s, not GitHub Pages or another external host.
- Keep git as the source of truth for:
  - Astro docs content
  - Docker build inputs
  - Kubernetes deployment configuration

## Recommended Approach

Use an incremental split of responsibilities:

- `apps/astro-docs/` contains the Starlight site source, content, static assets, and Docker build context
- existing deployment folders keep the platform wiring:
  - `kubernetes/base/astro-docs/` for the K3s manifest
  - `ansible/playbooks/40-deploy-apps.yml` for deployment orchestration
  - `opentofu/cloudflare/` for the public Cloudflare tunnel route and DNS record

The Astro docs site should be built as a static site and served from an Nginx container via a multi-stage Docker build.

## Why This Approach

This is the best fit because it creates the new `apps/` convention without forcing a repo-wide reorganization in the same change.

Astro’s official deployment model supports static output from `dist/`, which is well-suited to a simple public docs site. Starlight adds the docs UX while keeping the site content repo-native. Serving the built static output from Nginx in K3s is simpler than running Astro in SSR mode and is sufficient for a blank documentation site.

Keeping deployment wiring in the existing `kubernetes/`, `ansible/`, and `opentofu/` directories also matches how the rest of this repo is structured today, so this step improves organization without destabilizing the existing automation.

## Repo Layout

### New top-level convention

Add:

```text
apps/
  astro-docs/
    README.md
    package.json
    astro.config.mjs
    tsconfig.json
    Dockerfile
    src/
    public/
```

### Responsibility split

- `apps/<app>/`
  - app-owned source
  - content
  - static assets
  - app-local README/runbook
- `kubernetes/base/<app>/`
  - rendered runtime manifest templates
- `ansible/playbooks/40-deploy-apps.yml`
  - app deployment orchestration
- `opentofu/cloudflare/`
  - public DNS and tunnel exposure

This means future app content/config lives under `apps/`, while existing platform automation remains where it already fits.

## Astro Docs App Design

### Site shape

The first app under the new convention is:

- `apps/astro-docs/`

It starts as a blank Starlight site with a minimal initial information architecture:

- landing page
- getting started page
- placeholder operations or reference section

The content should be intentionally minimal at first. The point of this step is to establish the app pattern and the public docs surface, not to write a full documentation set.

### Build and runtime

Use a multi-stage Docker build:

1. Node build stage
   - install dependencies
   - run Astro/Starlight build
2. Nginx runtime stage
   - serve the generated static files from `dist/`

This keeps the runtime container small and avoids running Node in production for a static site.

### Image publishing model

The docs image should be built from this repo and published from GitHub Actions to GHCR.

Recommended initial policy:

- keep the repo private
- publish the docs image as a public GHCR package so K3s can pull it without adding another runtime registry secret

Inference: this is the lowest-friction way to keep the docs source private while still running a reproducible K3s deployment from a built image.

## Hostname And Access Model

### Public hostname

- `docs.magnetic-marten.com`

Exposure:

- Cloudflare tunnel route
- public DNS through Cloudflare
- no Cloudflare Access application or policy

### Internal hostname

- `docs.homelab.magnetic-marten.com`

Exposure:

- CoreDNS internal hostname
- Traefik ingress on the existing internal VIP

### Homepage

Add the docs app to Homepage using the internal hostname so the operator dashboard remains useful on the LAN even if Cloudflare is unavailable.

## K3s Deployment Shape

Deploy Astro docs as:

- dedicated namespace
- single Deployment
- ClusterIP Service
- Traefik Ingress with:
  - `docs.magnetic-marten.com`
  - `docs.homelab.magnetic-marten.com`

TLS should follow the existing Traefik/cert-manager path already used by other homelab apps.

## Cloudflare Model

Extend the existing Cloudflare tunnel config with:

- a new ingress rule for `docs.magnetic-marten.com`
- a public proxied DNS record for `docs.magnetic-marten.com`

Do not create a Cloudflare Access application or policy for docs.

## Homepage And Catalog

Add Astro docs to:

- `docs/application-catalog.json`
- `kubernetes/base/homepage/manifests.yaml.j2`

Homepage link target:

- `https://docs.homelab.magnetic-marten.com`

This follows the repo rule that Homepage prefers internal hostnames when a direct operator URL exists.

## Files Likely To Change

- `ansible/group_vars/all/main.yml`
- `ansible/playbooks/40-deploy-apps.yml`
- `kubernetes/base/coredns/manifests.yaml.j2`
- `kubernetes/base/homepage/manifests.yaml.j2`
- `kubernetes/base/astro-docs/manifests.yaml.j2`
- `docs/application-catalog.json`
- `opentofu/cloudflare/main.tf`
- `opentofu/cloudflare/variables.tf`
- `opentofu/cloudflare/terraform.tfvars.example`
- `README.md`
- `apps/astro-docs/*`
- GitHub Actions workflow for building and publishing the docs image
- regression tests for Astro docs repo wiring

## Testing Strategy

Implementation should verify:

- `apps/astro-docs/` exists and contains the expected Starlight source and Docker build files
- Cloudflare config includes a public docs hostname without an Access policy
- CoreDNS includes `docs.homelab.magnetic-marten.com`
- Homepage and app catalog include the docs app
- K3s rollout succeeds for the docs deployment
- internal hostname returns `200`
- public hostname returns `200` without an authentication redirect

## Non-Goals

- moving existing apps into `apps/` in this phase
- migrating Home Assistant to K3s in this spec
- building a full documentation library in the first pass
- introducing Astro SSR or server-side application behavior
