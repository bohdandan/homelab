# Observability Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ChangeDetection, Uptime Kuma, ntfy, and Glances to the homelab, integrate them with Homepage and LAN DNS, and add hosted Renovate with pinned image versions.

**Architecture:** ChangeDetection, Uptime Kuma, and ntfy are internal K3s apps behind Traefik and CoreDNS. Glances runs as an authenticated host service on the dev/admin VM and is exposed through Traefik. Renovate updates image versions in git via PRs rather than mutating live workloads.

**Tech Stack:** Ansible, K3s, Traefik, CoreDNS, MetalLB, systemd, Python unittest, Renovate

---

### Task 1: Add failing tests for the new app surfaces

**Files:**
- Create: `tests/test_observability_bundle_configuration.py`
- Modify: `docs/application-catalog.json`
- Modify: `kubernetes/base/homepage/manifests.yaml.j2`
- Modify: `kubernetes/base/coredns/manifests.yaml.j2`

- [ ] **Step 1: Write failing tests for observability app catalog, DNS, and Homepage coverage**

Expected assertions:
- `changedetection`, `kuma`, `ntfy`, and `glances` exist in the application catalog
- required Homepage titles and hrefs are present
- CoreDNS template contains host records for the new internal hostnames

- [ ] **Step 2: Run the test to verify it fails**

Run: `python3 -m unittest tests/test_observability_bundle_configuration.py`

- [ ] **Step 3: Add the minimal catalog and template updates to satisfy the test**

Touch:
- `docs/application-catalog.json`
- `kubernetes/base/homepage/manifests.yaml.j2`
- `kubernetes/base/coredns/manifests.yaml.j2`

- [ ] **Step 4: Re-run the test to verify it passes**

Run: `python3 -m unittest tests/test_observability_bundle_configuration.py`

- [ ] **Step 5: Commit**

Commit message: `test: add observability bundle coverage`

### Task 2: Add version pinning and Renovate config

**Files:**
- Create: `renovate.json`
- Create: `tests/test_renovate_configuration.py`
- Modify: `ansible/group_vars/all/main.yml`
- Modify: `README.md`

- [ ] **Step 1: Write a failing Renovate test**

Expected assertions:
- `renovate.json` exists
- Docker image references in `main.yml` are pinned to explicit tags rather than floating `latest`
- the Renovate config enables docker image updates for the repo

- [ ] **Step 2: Run the test to verify it fails**

Run: `python3 -m unittest tests/test_renovate_configuration.py`

- [ ] **Step 3: Pin existing app images and add `renovate.json`**

Update:
- current floating images such as `n8n` and `quickdrop`
- new observability app images

- [ ] **Step 4: Re-run the test to verify it passes**

Run: `python3 -m unittest tests/test_renovate_configuration.py`

- [ ] **Step 5: Document post-merge redeploy commands**

Update `README.md` with the Ansible playbooks to run after Renovate PR merges.

- [ ] **Step 6: Commit**

Commit message: `chore: pin images and add renovate`

### Task 3: Add K3s manifests for ChangeDetection, Uptime Kuma, and ntfy

**Files:**
- Create: `kubernetes/base/changedetection/manifests.yaml.j2`
- Create: `kubernetes/base/uptime-kuma/manifests.yaml.j2`
- Create: `kubernetes/base/ntfy/manifests.yaml.j2`
- Modify: `ansible/group_vars/all/main.yml`
- Modify: `ansible/playbooks/40-deploy-apps.yml`

- [ ] **Step 1: Write a failing test for the new manifest surfaces**

Expected assertions:
- each manifest exists
- each manifest includes namespace, service, ingress, and persistent storage where needed
- each ingress targets the correct internal hostname and includes cert-manager annotation

- [ ] **Step 2: Run the test to verify it fails**

Run: `python3 -m unittest tests/test_observability_manifests.py`

- [ ] **Step 3: Add the three app manifests and playbook wiring**

Implementation details:
- use dedicated namespaces
- use local-path PVCs
- keep stateful apps on the worker node where needed
- expose each through Traefik using internal hostnames only

- [ ] **Step 4: Re-run the test to verify it passes**

Run: `python3 -m unittest tests/test_observability_manifests.py`

- [ ] **Step 5: Commit**

Commit message: `feat: add observability workloads`

### Task 4: Extend the dev/admin VM configuration for Glances with MCP

**Files:**
- Create: `ansible/templates/glances.conf.j2`
- Create: `ansible/templates/glances.service.j2`
- Modify: `ansible/playbooks/35-configure-dev-admin.yml`
- Modify: `ansible/group_vars/all/main.yml`
- Modify: `kubernetes/base/home-assistant-proxy/manifests.yaml.j2` or create a new internal proxy manifest if needed

- [ ] **Step 1: Write a failing test for Glances VM config and routing**

Expected assertions:
- dev VM playbook installs and configures Glances
- a systemd unit is defined
- the internal hostname is represented in repo config

- [ ] **Step 2: Run the test to verify it fails**

Run: `python3 -m unittest tests/test_glances_configuration.py`

- [ ] **Step 3: Implement Glances installation and service management**

Implementation details:
- install Glances in an isolated Python environment
- enable web UI and MCP
- enable auth
- render a systemd unit
- ensure the service is enabled and started

- [ ] **Step 4: Add Traefik routing for the internal Glances hostname**

Use the existing ingress pattern to proxy to the dev VM backend.

- [ ] **Step 5: Re-run the test to verify it passes**

Run: `python3 -m unittest tests/test_glances_configuration.py`

- [ ] **Step 6: Commit**

Commit message: `feat: add glances on dev vm`

### Task 5: Deploy and verify the observability bundle

**Files:**
- Modify: `README.md`
- Modify: `docs/add-application.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Re-run the full repo test subset**

Run:
`python3 -m unittest tests/test_observability_bundle_configuration.py tests/test_renovate_configuration.py tests/test_observability_manifests.py tests/test_glances_configuration.py tests/test_homepage_application_catalog.py tests/test_homepage_required_config.py tests/test_ingress_tls_annotations.py tests/test_quickdrop_configuration.py tests/test_homepage_proxmox_card.py`

- [ ] **Step 2: Run syntax validation**

Run:
- `ansible-playbook --syntax-check ansible/playbooks/35-configure-dev-admin.yml`
- `ansible-playbook --syntax-check ansible/playbooks/40-deploy-apps.yml`

- [ ] **Step 3: Apply dev VM configuration**

Run:
`SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/playbooks/35-configure-dev-admin.yml`

- [ ] **Step 4: Apply K3s workloads**

Run:
`SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/playbooks/40-deploy-apps.yml`

- [ ] **Step 5: Verify live services**

Check:
- `kubectl get pods` in the new namespaces
- internal DNS resolution for all new hostnames
- HTTPS responses through Traefik for all new services
- Glances MCP endpoint response from the dev VM path

- [ ] **Step 6: Update docs for manual app bootstrap steps**

Document:
- hosted Renovate app enablement
- post-merge redeploy commands
- optional app-level ntfy integration steps if they remain UI-driven

- [ ] **Step 7: Commit**

Commit message: `feat: deploy observability bundle`
