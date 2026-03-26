# QuickDrop File Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an actively maintained, simple share-by-link service using QuickDrop with a public direct-ingress hostname and an internal LAN hostname.

**Architecture:** Deploy QuickDrop as a stateful workload on K3s behind Traefik with one public hostname (`share.magnetic-marten.com`) and one internal hostname (`share.homelab.magnetic-marten.com`). Manage the public DNS-only Cloudflare record in OpenTofu, keep the LAN hostname on CoreDNS, and add QuickDrop to Homepage using the internal hostname.

**Tech Stack:** Kubernetes, Traefik, cert-manager, CoreDNS, OpenTofu, Ansible, Homepage

---

### Task 1: Add repo-level tests for QuickDrop integration points

**Files:**
- Create: `tests/test_quickdrop_configuration.py`

- [ ] **Step 1: Write the failing test**

Create a test that asserts:
- `ansible/group_vars/all/main.yml` contains `share` and `share_internal` domain entries
- `kubernetes/base/homepage/manifests.yaml.j2` contains a QuickDrop card
- `kubernetes/base/coredns/manifests.yaml.j2` contains `share`
- `opentofu/cloudflare/main.tf` contains a `cloudflare_record` for the public share hostname

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest tests/test_quickdrop_configuration.py`
Expected: FAIL because QuickDrop config does not exist yet

### Task 2: Add config and infrastructure wiring

**Files:**
- Modify: `ansible/group_vars/all/main.yml`
- Modify: `ansible/templates/cloudflare.terraform.tfvars.json.j2`
- Modify: `opentofu/cloudflare/main.tf`
- Modify: `opentofu/cloudflare/variables.tf`
- Modify: `opentofu/cloudflare/outputs.tf`
- Modify: `opentofu/cloudflare/README.md`

- [ ] **Step 1: Add QuickDrop config**

Add:
- `homelab.domain.share`
- `homelab.domain.share_internal`
- `homelab.network.public_ipv4`
- `homelab.apps.quickdrop`

- [ ] **Step 2: Add Cloudflare direct DNS support**

Add a DNS-only record for the public share hostname pointing at `homelab.network.public_ipv4`.

- [ ] **Step 3: Verify the test is still failing only on app-manifest gaps**

Run: `python3 -m unittest tests/test_quickdrop_configuration.py`
Expected: FAIL only because Homepage/CoreDNS/manifests are not yet updated

### Task 3: Add QuickDrop workload, internal DNS, and Homepage coverage

**Files:**
- Create: `kubernetes/base/quickdrop/manifests.yaml.j2`
- Modify: `ansible/playbooks/40-deploy-apps.yml`
- Modify: `kubernetes/base/homepage/manifests.yaml.j2`
- Modify: `kubernetes/base/coredns/manifests.yaml.j2`
- Modify: `docs/application-catalog.json`
- Modify: `README.md`

- [ ] **Step 1: Add QuickDrop manifest**

Create a deployment/stateful manifest with:
- namespace
- PVC-backed storage
- service
- ingress for both hostnames
- worker-node placement for stateful storage

- [ ] **Step 2: Add Homepage card and app catalog entry**

Use the internal hostname in Homepage.

- [ ] **Step 3: Add CoreDNS entry**

Add an explicit `share` A record to the Traefik VIP even though the wildcard already covers it.

- [ ] **Step 4: Wire deployment into the app playbook**

Render and apply the QuickDrop manifest in `40-deploy-apps.yml`.

- [ ] **Step 5: Run tests to green**

Run: `python3 -m unittest tests/test_quickdrop_configuration.py tests/test_homepage_application_catalog.py tests/test_homepage_required_config.py`
Expected: PASS

### Task 4: Deploy and verify the live service

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run syntax check**

Run: `ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook --syntax-check ansible/playbooks/40-deploy-apps.yml`
Expected: PASS

- [ ] **Step 2: Deploy**

Run: `SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/playbooks/40-deploy-apps.yml`
Expected: QuickDrop resources created and rollout completes

- [ ] **Step 3: Verify cluster state**

Run:
- `kubectl --kubeconfig ansible/runtime/kubeconfig.raw get pods,svc,ingress,pvc -n quickdrop`
- `kubectl --kubeconfig ansible/runtime/kubeconfig.raw logs deployment/quickdrop -n quickdrop --tail=80`

Expected: Running pod, ready service, ingress hosts, bound PVC

- [ ] **Step 4: Verify LAN and public endpoints**

Run:
- `curl -skI https://share.homelab.magnetic-marten.com`
- `curl -skI https://share.magnetic-marten.com`

Expected: successful HTTP response from both paths

- [ ] **Step 5: Commit**

```bash
git add ansible/group_vars/all/main.yml ansible/templates/cloudflare.terraform.tfvars.json.j2 ansible/playbooks/40-deploy-apps.yml kubernetes/base/quickdrop/manifests.yaml.j2 kubernetes/base/homepage/manifests.yaml.j2 kubernetes/base/coredns/manifests.yaml.j2 opentofu/cloudflare/main.tf opentofu/cloudflare/variables.tf opentofu/cloudflare/outputs.tf opentofu/cloudflare/README.md docs/application-catalog.json README.md tests/test_quickdrop_configuration.py
git commit -m "Add QuickDrop file sharing service"
```
