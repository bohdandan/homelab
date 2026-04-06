# Copyparty Share Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace QuickDrop with Copyparty at the existing `share.*` hostnames, using the dedicated internal SSD for permanent shared files and a read-only removable ingest SSD for large recordings.

**Architecture:** Keep file sharing on K3s, but bridge the removable SSD from the Proxmox host into the K3s worker over a read-only NFS mount. Copyparty exposes two volumes: `/share` on the worker’s dedicated internal SSD and `/ingest` on the removable SSD, while the existing `share.magnetic-marten.com` and `share.homelab.magnetic-marten.com` hostnames move from QuickDrop to Copyparty.

**Tech Stack:** Kubernetes, Traefik, CoreDNS, Ansible, Proxmox host storage, NFS, Homepage

---

### Task 1: Replace QuickDrop-specific repo assertions with Copyparty expectations

**Files:**
- Create: `tests/test_copyparty_configuration.py`
- Modify: `docs/application-catalog.json`
- Modify: `kubernetes/base/homepage/manifests.yaml.j2`
- Delete: `tests/test_quickdrop_configuration.py`

- [ ] **Step 1: Write the failing Copyparty test**

Create a new test that asserts:
- `ansible/group_vars/all/main.yml` contains `copyparty` app config and `copyparty_share` / `copyparty_ingest` storage config
- `apps/copyparty/` contains tracked config
- `kubernetes/base/homepage/manifests.yaml.j2` references `Copyparty`
- `kubernetes/base/coredns/manifests.yaml.j2` still contains the internal `share` hostname
- `kubernetes/base/copyparty/manifests.yaml.j2` exists
- `ansible/playbooks/32-configure-stateful-storage.yml` contains read-only ingest storage setup

- [ ] **Step 2: Run the new test and verify it fails**

Run: `python3 -m unittest tests/test_copyparty_configuration.py`
Expected: FAIL because Copyparty config and manifests do not exist yet

- [ ] **Step 3: Remove QuickDrop-specific catalog assumptions from the plan target**

Plan to replace the `quickdrop` app catalog entry with `copyparty` and rename the Homepage title from `QuickDrop` to `Copyparty`.

### Task 2: Replace the share app config model

**Files:**
- Modify: `ansible/group_vars/all/main.yml`
- Modify: `ansible/group_vars/all/secrets.sops.yaml`
- Modify: `README.md`

- [ ] **Step 1: Add Copyparty app config**

Replace `homelab.apps.quickdrop` with `homelab.apps.copyparty`, including:
- namespace
- image
- permanent share host path
- ingest mount path
- admin username/password secret references

- [ ] **Step 2: Add storage config for both permanent and ingest paths**

Add storage entries for:
- the permanent internal share path on the worker
- the removable ingest SSD UUID and Proxmox-host mount/export paths
- the worker-side read-only NFS mount path for ingest

- [ ] **Step 3: Add encrypted Copyparty admin credentials**

Add secret fields to `ansible/group_vars/all/secrets.sops.yaml` for the Copyparty admin account so the deployment stays repo-managed and avoids plaintext credentials.

- [ ] **Step 4: Run the Copyparty test again**

Run: `python3 -m unittest tests/test_copyparty_configuration.py`
Expected: FAIL only on missing storage-playbook, manifest, and Homepage/Catalog wiring

### Task 3: Rework stateful storage for permanent share and removable ingest

**Files:**
- Modify: `ansible/playbooks/32-configure-stateful-storage.yml`

- [ ] **Step 1: Rename permanent storage ownership from QuickDrop to Copyparty**

Update the existing playbook so the dedicated internal SSD is mounted to a Copyparty-specific permanent path, for example:
- `/var/lib/copyparty/share`

- [ ] **Step 2: Add Proxmox-host ingest mount tasks**

Extend the Proxmox play to:
- ensure the removable ingest mount root exists
- detect the removable SSD by UUID
- mount it read-only at the configured ingest source path when present
- leave the directory present and harmless when the disk is absent

- [ ] **Step 3: Add a read-only NFS export on the Proxmox host**

Add tasks to:
- install/configure the minimal NFS server support needed on the Proxmox host
- export the ingest source path read-only to the K3s worker IP
- reload NFS exports when the export definition changes

- [ ] **Step 4: Mount the read-only ingest export on the worker**

Extend the worker play to:
- install `nfs-common`
- ensure the worker ingest mountpoint exists
- mount the Proxmox-host NFS export read-only at the worker ingest path

- [ ] **Step 5: Run syntax check for the storage playbook**

Run: `ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook --syntax-check ansible/playbooks/32-configure-stateful-storage.yml`
Expected: PASS

### Task 4: Add Copyparty app-owned config and Kubernetes manifest

**Files:**
- Create: `apps/copyparty/README.md`
- Create: `apps/copyparty/copyparty.conf.j2`
- Create: `kubernetes/base/copyparty/manifests.yaml.j2`
- Modify: `ansible/playbooks/40-deploy-apps.yml`

- [ ] **Step 1: Add app-owned Copyparty config**

Create tracked Copyparty config under `apps/copyparty/` covering:
- accounts
- volume definitions for `/share` and `/ingest`
- read-only permissions for ingest
- share-link behavior

- [ ] **Step 2: Create the Copyparty Kubernetes manifest**

Create a manifest with:
- namespace
- deployment pinned to the stateful worker
- service
- hostPath mount for permanent share
- hostPath mount for worker ingest path
- config mount from the app-owned config

- [ ] **Step 3: Wire Copyparty rendering into the app playbook**

Add render/apply steps for the Copyparty manifest in `40-deploy-apps.yml`.

- [ ] **Step 4: Keep temporary validation independent of the live share hostname**

Do not take over `share.*` in this step. Validation should be possible through a temporary service path such as `kubectl port-forward` before the ingress cutover.

- [ ] **Step 5: Run repo tests**

Run: `python3 -m unittest tests/test_copyparty_configuration.py tests/test_homepage_required_config.py tests/test_homepage_application_catalog.py`
Expected: PASS for the new Copyparty test; existing Homepage tests may still fail until the card/catalog rename is complete

### Task 5: Validate Copyparty before hostname cutover

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Apply storage changes**

Run: `SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/playbooks/32-configure-stateful-storage.yml`
Expected: permanent share path present on the worker, ingest disk mounted read-only on Proxmox and mounted read-only on the worker if attached

- [ ] **Step 2: Apply app changes without the live ingress cutover**

Run: `SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/playbooks/40-deploy-apps.yml`
Expected: Copyparty pod becomes available for temporary validation

- [ ] **Step 3: Validate the app over a temporary path**

Run:
- `kubectl --kubeconfig ansible/runtime/kubeconfig.raw -n copyparty get pods,svc`
- `kubectl --kubeconfig ansible/runtime/kubeconfig.raw -n copyparty port-forward svc/copyparty 8088:80`

Then verify:
- `curl -sI http://127.0.0.1:8088`

Expected: Copyparty responds successfully and shows the expected login or landing response

- [ ] **Step 4: Verify both storage volumes are visible**

Run:
- `kubectl --kubeconfig ansible/runtime/kubeconfig.raw -n copyparty exec deploy/copyparty -- sh -lc 'ls -la /srv/share && ls -la /srv/ingest'`

Expected:
- `/srv/share` exists and is writable
- `/srv/ingest` exists and contains the removable SSD contents when attached

### Task 6: Cut over the share surface and retire QuickDrop

**Files:**
- Modify: `kubernetes/base/homepage/manifests.yaml.j2`
- Modify: `kubernetes/base/coredns/manifests.yaml.j2`
- Modify: `docs/application-catalog.json`
- Modify: `ansible/playbooks/40-deploy-apps.yml`
- Delete: `kubernetes/base/quickdrop/manifests.yaml.j2`
- Delete: `tests/test_quickdrop_configuration.py`
- Modify: `README.md`

- [ ] **Step 1: Switch Homepage and app catalog to Copyparty**

Rename the operator-facing share app to `Copyparty` while keeping the same internal hostname.

- [ ] **Step 2: Move the live `share.*` ingress surface from QuickDrop to Copyparty**

Update the Copyparty manifest to own:
- `share.magnetic-marten.com`
- `share.homelab.magnetic-marten.com`

and remove QuickDrop from the deployment playbook.

- [ ] **Step 3: Remove QuickDrop repo surfaces**

Delete the QuickDrop manifest and obsolete test coverage, update docs to describe Copyparty as the file-sharing app, and add explicit cleanup in the deployment flow so the old QuickDrop namespace/resources are removed from the cluster during cutover.

- [ ] **Step 4: Run the full relevant test suite**

Run:
- `python3 -m unittest tests/test_copyparty_configuration.py tests/test_homepage_application_catalog.py tests/test_homepage_required_config.py`

Expected: PASS

### Task 7: Final deployment verification and cleanup

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Re-run app deployment for the final cutover**

Run: `SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/playbooks/40-deploy-apps.yml`
Expected: Copyparty rollout succeeds and QuickDrop resources are gone

- [ ] **Step 2: Verify live share endpoints**

Run:
- `curl -skI https://share.homelab.magnetic-marten.com`
- `curl -skI https://share.magnetic-marten.com`

Expected: successful HTTP response from Copyparty on both paths

- [ ] **Step 3: Verify QuickDrop is retired**

Run:
- `kubectl --kubeconfig ansible/runtime/kubeconfig.raw get ns quickdrop`
- `kubectl --kubeconfig ansible/runtime/kubeconfig.raw get ns copyparty`

Expected:
- `quickdrop` no longer contains active resources, or the namespace is absent
- `copyparty` namespace is present and healthy

- [ ] **Step 4: Verify storage paths one last time**

Run:
- `ssh root@192.168.10.100 mount | rg ingest`
- `kubectl --kubeconfig ansible/runtime/kubeconfig.raw -n copyparty exec deploy/copyparty -- sh -lc 'df -h /srv/share /srv/ingest'`

Expected:
- removable ingest is mounted read-only when attached
- permanent share path is on the dedicated internal SSD

- [ ] **Step 5: Commit**

```bash
git add ansible/group_vars/all/main.yml ansible/group_vars/all/secrets.sops.yaml ansible/playbooks/32-configure-stateful-storage.yml ansible/playbooks/40-deploy-apps.yml kubernetes/base/copyparty/manifests.yaml.j2 kubernetes/base/homepage/manifests.yaml.j2 kubernetes/base/coredns/manifests.yaml.j2 docs/application-catalog.json README.md apps/copyparty tests/test_copyparty_configuration.py
git rm kubernetes/base/quickdrop/manifests.yaml.j2 tests/test_quickdrop_configuration.py
git commit -m "Replace QuickDrop with Copyparty"
```
