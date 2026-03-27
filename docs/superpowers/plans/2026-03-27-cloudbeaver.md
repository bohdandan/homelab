# CloudBeaver CE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add internal-only CloudBeaver CE at `db.homelab.magnetic-marten.com` with seeded admin credentials, a preconfigured connection entry for the in-cluster `n8n` PostgreSQL database, Homepage/CoreDNS integration, and Renovate-managed image pinning.

**Architecture:** CloudBeaver runs as a K3s workload with persistent workspace storage, a ConfigMap for `initial-data.conf` and `data-sources.json`, and Traefik ingress on the internal hostname. Admin credentials are seeded from encrypted SOPS secrets, while the preconfigured PostgreSQL datasource metadata is rendered from repo-managed config. The PostgreSQL password remains a one-time manual save inside the CloudBeaver UI because CloudBeaver CE stores saved credentials in an internal encrypted file.

**Tech Stack:** Ansible, K3s, Traefik, CoreDNS, cert-manager, SOPS, Python unittest

---

### Task 1: Lock the repo surface with failing CloudBeaver tests

**Files:**
- Create: `tests/test_cloudbeaver_configuration.py`
- Modify: `tests/test_homepage_application_catalog.py`
- Modify: `tests/test_ingress_tls_annotations.py`

- [ ] **Step 1: Write a failing CloudBeaver configuration test**

Assert:
- `db.homelab.magnetic-marten.com` is represented in repo config
- a CloudBeaver manifest file exists
- the Homepage catalog covers CloudBeaver
- the manifest includes ingress, PVC, ConfigMap, and seeded config files

- [ ] **Step 2: Run the test to verify it fails**

Run: `python3 -m unittest tests/test_cloudbeaver_configuration.py`

- [ ] **Step 3: Extend generic homepage/ingress regression coverage**

Add CloudBeaver to the existing shared regression surfaces:
- Homepage application catalog
- ingress TLS annotation coverage

- [ ] **Step 4: Re-run the focused tests to verify they still fail only for missing implementation**

Run:
`python3 -m unittest tests/test_cloudbeaver_configuration.py tests/test_homepage_application_catalog.py tests/test_ingress_tls_annotations.py`

- [ ] **Step 5: Commit**

Commit message: `test: add cloudbeaver regression coverage`

### Task 2: Add CloudBeaver config, secrets, and manifests

**Files:**
- Modify: `ansible/group_vars/all/main.yml`
- Modify: `ansible/group_vars/all/secrets.sops.yaml.example`
- Modify: `kubernetes/base/coredns/manifests.yaml.j2`
- Modify: `kubernetes/base/homepage/manifests.yaml.j2`
- Modify: `docs/application-catalog.json`
- Create: `kubernetes/base/cloudbeaver/manifests.yaml.j2`
- Modify: `ansible/playbooks/40-deploy-apps.yml`
- Modify: `README.md`

- [ ] **Step 1: Add CloudBeaver hostnames, image, namespace, and storage settings to main config**

Include:
- internal hostname `db.homelab.magnetic-marten.com`
- pinned image tag
- namespace
- PVC size

- [ ] **Step 2: Add example encrypted secret placeholders**

Add placeholders for:
- CloudBeaver admin username
- CloudBeaver admin password

- [ ] **Step 3: Implement the CloudBeaver manifest**

Manifest responsibilities:
- namespace
- secret for admin values if needed by template
- ConfigMap for `initial-data.conf`
- ConfigMap for `data-sources.json`
- PVC
- deployment
- service
- ingress with cert-manager annotation

- [ ] **Step 4: Add CoreDNS, Homepage, and app catalog entries**

Update:
- LAN DNS record for `db`
- Homepage operator link
- application catalog entry

- [ ] **Step 5: Wire CloudBeaver into the app deploy playbook**

Render/apply the manifest and wait for rollout.

- [ ] **Step 6: Update docs**

Document:
- internal hostname
- one-time manual DB password save step
- post-Renovate redeploy flow remains `40-deploy-apps.yml`

- [ ] **Step 7: Re-run the focused tests to verify they pass**

Run:
`python3 -m unittest tests/test_cloudbeaver_configuration.py tests/test_homepage_application_catalog.py tests/test_ingress_tls_annotations.py`

- [ ] **Step 8: Commit**

Commit message: `feat: add cloudbeaver config and manifests`

### Task 3: Seed real encrypted credentials and deploy

**Files:**
- Modify: `ansible/group_vars/all/secrets.sops.yaml`

- [ ] **Step 1: Generate CloudBeaver admin credentials**

Choose a stable admin username and generate a strong password.

- [ ] **Step 2: Update the encrypted secrets file**

Write the new admin credentials into `ansible/group_vars/all/secrets.sops.yaml` with SOPS, keeping plaintext out of git.

- [ ] **Step 3: Run syntax checks**

Run:
- `ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook --syntax-check ansible/playbooks/40-deploy-apps.yml`

- [ ] **Step 4: Apply the app deployment playbook**

Run:
`SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/playbooks/40-deploy-apps.yml`

- [ ] **Step 5: Verify live state**

Check:
- `kubectl` rollout/pods in the CloudBeaver namespace
- `dig +short db.homelab.magnetic-marten.com`
- `curl -skI https://db.homelab.magnetic-marten.com`

- [ ] **Step 6: Commit encrypted secret and deployment changes**

Commit message: `feat: deploy cloudbeaver`

### Task 4: Run final regression and capture the manual follow-up

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run the full relevant test set**

Run:
`python3 -m unittest tests/test_cloudbeaver_configuration.py tests/test_observability_bundle_configuration.py tests/test_observability_manifests.py tests/test_glances_configuration.py tests/test_renovate_configuration.py tests/test_ingress_tls_annotations.py tests/test_homepage_application_catalog.py tests/test_homepage_required_config.py tests/test_homepage_proxmox_card.py tests/test_quickdrop_configuration.py`

- [ ] **Step 2: Verify git state**

Run: `git status --short --branch`

- [ ] **Step 3: Document the one manual CloudBeaver step clearly**

State:
- log in with the seeded admin account
- open the preconfigured `n8n` Postgres connection
- enter and save the PostgreSQL password once

- [ ] **Step 4: Push the finished branch/state**

Run: `git push origin main`
