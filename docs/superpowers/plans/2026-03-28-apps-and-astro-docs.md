# Apps Layout And Astro Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the new `apps/` convention and ship a blank public Astro Starlight docs site on K3s at `docs.magnetic-marten.com`, with an internal operator URL at `docs.homelab.magnetic-marten.com`.

**Architecture:** Keep app-owned source under `apps/astro-docs/`, but leave deployment wiring in the existing `kubernetes/`, `ansible/`, and `opentofu/` folders. Build the Starlight site into static assets, publish a versioned GHCR image from GitHub Actions, and deploy it behind Traefik with one public Cloudflare Tunnel hostname and one internal CoreDNS hostname.

**Tech Stack:** Astro, Starlight, Nginx, GitHub Actions, GHCR, Kubernetes, Traefik, CoreDNS, OpenTofu, Ansible, Homepage

---

## File Map

- `apps/astro-docs/README.md`
  - operator-facing notes for the docs app source tree
- `apps/astro-docs/package.json`
  - pinned Astro/Starlight dependencies and build scripts
- `apps/astro-docs/package-lock.json`
  - locked Node dependency graph for reproducible image builds
- `apps/astro-docs/astro.config.mjs`
  - Astro/Starlight site config and canonical URL
- `apps/astro-docs/tsconfig.json`
  - TypeScript config referenced by Astro
- `apps/astro-docs/Dockerfile`
  - multi-stage build from Node to Nginx runtime
- `apps/astro-docs/nginx.conf`
  - static site serving rules for the built `dist/` output
- `apps/astro-docs/src/content.config.ts`
  - Astro content collection config for docs pages
- `apps/astro-docs/src/content/docs/index.mdx`
  - landing page
- `apps/astro-docs/src/content/docs/getting-started.mdx`
  - first placeholder page
- `apps/astro-docs/src/content/docs/reference/index.mdx`
  - placeholder reference section
- `.github/workflows/astro-docs-image.yml`
  - builds and publishes the docs image to GHCR on pushes affecting the docs app
- `ansible/group_vars/all/main.yml`
  - domain names and image tag for the docs app
- `ansible/templates/cloudflare.terraform.tfvars.json.j2`
  - render docs hostname/origin settings into OpenTofu runtime vars
- `ansible/playbooks/40-deploy-apps.yml`
  - render/apply/wait orchestration for the docs manifest
- `kubernetes/base/astro-docs/manifests.yaml.j2`
  - namespace, Deployment, Service, and Ingress for the docs site
- `kubernetes/base/coredns/manifests.yaml.j2`
  - internal `docs.homelab.magnetic-marten.com` LAN record
- `kubernetes/base/homepage/manifests.yaml.j2`
  - Homepage card for the docs site using the internal hostname
- `docs/application-catalog.json`
  - source-of-truth app entry so Homepage coverage stays enforced
- `opentofu/cloudflare/variables.tf`
  - new docs hostname/origin variables
- `opentofu/cloudflare/main.tf`
  - tunnel ingress rule and public DNS record for `docs.magnetic-marten.com`
- `opentofu/cloudflare/outputs.tf`
  - include the public docs hostname in the output list
- `README.md`
  - repo layout, apps convention, hostname inventory, and deploy notes
- `tests/test_astro_docs_configuration.py`
  - regression coverage for the new app convention and docs wiring

### Task 1: Add failing repo-level tests for the new app convention and Astro docs wiring

**Files:**
- Create: `tests/test_astro_docs_configuration.py`

- [ ] **Step 1: Write the failing test**

Create a unittest module that asserts:
- `apps/astro-docs/` exists
- `apps/astro-docs/package.json`, `astro.config.mjs`, `Dockerfile`, and `src/content/docs/index.mdx` exist
- `ansible/group_vars/all/main.yml` contains `docs` and `docs_internal` hostnames plus an `astro_docs` app image entry
- `opentofu/cloudflare/main.tf` contains a tunnel ingress rule and public DNS record for `docs.magnetic-marten.com`
- `kubernetes/base/coredns/manifests.yaml.j2` contains `docs.homelab.magnetic-marten.com`
- `kubernetes/base/homepage/manifests.yaml.j2` and `docs/application-catalog.json` contain the docs app
- `opentofu/cloudflare/main.tf` does **not** create a Cloudflare Access application or policy for docs

Use assertions in the same style as the existing repo tests, for example:

```python
main_yml = Path("ansible/group_vars/all/main.yml").read_text()
self.assertIn("docs: docs.magnetic-marten.com", main_yml)
self.assertNotIn("cloudflare_access_application\" \"docs\"", cloudflare_tf)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest tests/test_astro_docs_configuration.py`
Expected: FAIL because the `apps/astro-docs` tree and docs infrastructure wiring do not exist yet

- [ ] **Step 3: Commit the failing test scaffold**

```bash
git add tests/test_astro_docs_configuration.py
git commit -m "test: cover astro docs repo wiring"
```

### Task 2: Scaffold the first app-owned source tree under `apps/astro-docs`

**Files:**
- Create: `apps/astro-docs/README.md`
- Create: `apps/astro-docs/package.json`
- Create: `apps/astro-docs/package-lock.json`
- Create: `apps/astro-docs/astro.config.mjs`
- Create: `apps/astro-docs/tsconfig.json`
- Create: `apps/astro-docs/Dockerfile`
- Create: `apps/astro-docs/nginx.conf`
- Create: `apps/astro-docs/src/content.config.ts`
- Create: `apps/astro-docs/src/content/docs/index.mdx`
- Create: `apps/astro-docs/src/content/docs/getting-started.mdx`
- Create: `apps/astro-docs/src/content/docs/reference/index.mdx`

- [ ] **Step 1: Create the app source tree**

Create the `apps/astro-docs/` directory structure exactly as described in the spec. Keep the content intentionally minimal: one landing page, one getting-started page, and one placeholder reference page.

- [ ] **Step 2: Add pinned Astro/Starlight dependencies**

Create `package.json` with pinned dependencies and scripts:

```json
{
  "name": "astro-docs",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  }
}
```

Pin:
- `astro`
- `@astrojs/starlight`
- `typescript`

Then generate and commit `package-lock.json`.

- [ ] **Step 3: Add Astro and content configuration**

Create `astro.config.mjs` and `src/content.config.ts` with the canonical public site URL `https://docs.magnetic-marten.com` and a standard Starlight docs collection.

- [ ] **Step 4: Add the multi-stage container build**

Create `Dockerfile` and `nginx.conf` so the final runtime serves the static `dist/` output from Nginx:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
```

- [ ] **Step 5: Run the repo-level test to narrow the remaining gaps**

Run: `python3 -m unittest tests/test_astro_docs_configuration.py`
Expected: FAIL only on infrastructure wiring assertions, not on the app source tree assertions

- [ ] **Step 6: Commit the app scaffold**

```bash
git add apps/astro-docs tests/test_astro_docs_configuration.py
git commit -m "feat: scaffold astro docs app source"
```

### Task 3: Add reproducible image publishing for the docs site

**Files:**
- Create: `.github/workflows/astro-docs-image.yml`
- Modify: `ansible/group_vars/all/main.yml`
- Modify: `README.md`

- [ ] **Step 1: Add a pinned image reference in homelab config**

Add a new app entry in `ansible/group_vars/all/main.yml`:

```yaml
apps:
  astro_docs:
    namespace: astro-docs
    image: ghcr.io/bohdandan/homelab/astro-docs:0.1.0
```

Also add:
- `homelab.domain.docs`
- `homelab.domain.docs_internal`

- [ ] **Step 2: Add the GitHub Actions build-and-publish workflow**

Create `.github/workflows/astro-docs-image.yml` that:
- triggers on pushes touching `apps/astro-docs/**` or the workflow file itself
- logs in to GHCR using `GITHUB_TOKEN`
- builds from `apps/astro-docs/Dockerfile`
- publishes `ghcr.io/bohdandan/homelab/astro-docs:0.1.0`
- also tags `ghcr.io/bohdandan/homelab/astro-docs:sha-${{ github.sha }}`

Use `docker/build-push-action` and `docker/metadata-action` rather than shelling out manually.

- [ ] **Step 3: Document the one-time package visibility check**

Update `README.md` with a short note that after the first successful GHCR publish, the package should be confirmed as public so K3s can pull it without a registry secret.

- [ ] **Step 4: Run the test again**

Run: `python3 -m unittest tests/test_astro_docs_configuration.py`
Expected: FAIL only because Cloudflare/CoreDNS/Homepage/Kubernetes manifest wiring is still missing

- [ ] **Step 5: Commit the image publishing setup**

```bash
git add .github/workflows/astro-docs-image.yml ansible/group_vars/all/main.yml README.md tests/test_astro_docs_configuration.py
git commit -m "build: publish astro docs image to ghcr"
```

### Task 4: Wire Astro docs into Cloudflare, K3s, CoreDNS, and Homepage

**Files:**
- Create: `kubernetes/base/astro-docs/manifests.yaml.j2`
- Modify: `ansible/templates/cloudflare.terraform.tfvars.json.j2`
- Modify: `ansible/playbooks/40-deploy-apps.yml`
- Modify: `kubernetes/base/coredns/manifests.yaml.j2`
- Modify: `kubernetes/base/homepage/manifests.yaml.j2`
- Modify: `docs/application-catalog.json`
- Modify: `opentofu/cloudflare/variables.tf`
- Modify: `opentofu/cloudflare/main.tf`
- Modify: `opentofu/cloudflare/outputs.tf`
- Modify: `README.md`

- [ ] **Step 1: Extend Cloudflare variable rendering**

Add `docs_hostname` and `docs_origin_service` to `ansible/templates/cloudflare.terraform.tfvars.json.j2`, using the same origin service as Homepage and n8n:

```json
"docs_hostname": "{{ homelab_effective.domain.docs }}",
"docs_origin_service": "http://traefik.kube-system.svc.cluster.local:80"
```

- [ ] **Step 2: Extend OpenTofu Cloudflare config**

Update:
- `opentofu/cloudflare/variables.tf`
- `opentofu/cloudflare/main.tf`
- `opentofu/cloudflare/outputs.tf`

Add:
- a new tunnel ingress rule for `docs.magnetic-marten.com`
- a proxied `cloudflare_record` for the docs hostname
- `docs.magnetic-marten.com` in `public_hostnames`

Do **not** add a `cloudflare_access_application` or policy for docs.

- [ ] **Step 3: Create the Astro docs Kubernetes manifest**

Create `kubernetes/base/astro-docs/manifests.yaml.j2` with:
- namespace `astro-docs`
- Deployment using `homelab_effective.apps.astro_docs.image`
- ClusterIP Service on port `80`
- Traefik Ingress for:
  - `docs.magnetic-marten.com`
  - `docs.homelab.magnetic-marten.com`
- cert-manager cluster issuer annotation matching the existing app pattern

- [ ] **Step 4: Wire the deployment into the Ansible app playbook**

Add render/apply/wait tasks for `astro-docs` in `ansible/playbooks/40-deploy-apps.yml`, following the same structure already used for Homepage and QuickDrop.

- [ ] **Step 5: Add LAN DNS, Homepage, and app catalog coverage**

Update:
- `kubernetes/base/coredns/manifests.yaml.j2`
- `kubernetes/base/homepage/manifests.yaml.j2`
- `docs/application-catalog.json`

Requirements:
- explicit internal record: `docs.homelab.magnetic-marten.com -> 192.168.10.120`
- Homepage card uses `https://docs.homelab.magnetic-marten.com`
- catalog entry has `homepage_entry_required: true`

- [ ] **Step 6: Run tests to green**

Run:

```bash
python3 -m unittest \
  tests/test_astro_docs_configuration.py \
  tests/test_homepage_application_catalog.py \
  tests/test_ingress_tls_annotations.py
```

Expected: PASS

- [ ] **Step 7: Commit the infrastructure wiring**

```bash
git add ansible/templates/cloudflare.terraform.tfvars.json.j2 ansible/playbooks/40-deploy-apps.yml kubernetes/base/astro-docs/manifests.yaml.j2 kubernetes/base/coredns/manifests.yaml.j2 kubernetes/base/homepage/manifests.yaml.j2 docs/application-catalog.json opentofu/cloudflare/variables.tf opentofu/cloudflare/main.tf opentofu/cloudflare/outputs.tf README.md tests/test_astro_docs_configuration.py
git commit -m "feat: wire astro docs into homelab routing"
```

### Task 5: Publish the image, deploy the app, and verify both hostnames

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Push the workflow and wait for the GHCR image**

Run:

```bash
git push origin main
gh run watch --workflow astro-docs-image.yml
```

Expected:
- workflow succeeds
- `ghcr.io/bohdandan/homelab/astro-docs:0.1.0` exists

- [ ] **Step 2: Apply Cloudflare and K3s changes**

Run:

```bash
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/playbooks/20-provision-infra.yml
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/playbooks/40-deploy-apps.yml
```

Expected:
- Cloudflare tunnel route and public DNS record are updated
- K3s rollout creates the docs namespace, deployment, service, and ingress

- [ ] **Step 3: Verify cluster state**

Run:

```bash
kubectl --kubeconfig ansible/runtime/kubeconfig.raw get pods,svc,ingress -n astro-docs
kubectl --kubeconfig ansible/runtime/kubeconfig.raw logs deployment/astro-docs -n astro-docs --tail=80
```

Expected:
- pod `Running`
- service has port `80`
- ingress includes both docs hostnames
- container logs are clean Nginx startup, not crashloop output

- [ ] **Step 4: Verify internal and public endpoints**

Run:

```bash
dig +short docs.homelab.magnetic-marten.com
curl -skI https://docs.homelab.magnetic-marten.com
curl -skI https://docs.magnetic-marten.com
```

Expected:
- internal DNS returns `192.168.10.120`
- both HTTP checks return `200`
- public hostname does **not** redirect to Cloudflare Access

- [ ] **Step 5: Verify Homepage coverage**

Run:

```bash
curl -sk https://homepage.homelab.magnetic-marten.com/api/services | rg "Astro Docs|docs.homelab.magnetic-marten.com"
```

Expected: the docs card appears in Homepage service data

- [ ] **Step 6: Commit the deployment verification note**

Update `README.md` with any final operator note discovered during rollout, then commit:

```bash
git add README.md
git commit -m "docs: record astro docs rollout notes"
```
