# Automatic Ingest Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Copyparty `/ingest` appear or disappear automatically within one minute when the removable recording SSD is attached or removed.

**Architecture:** Keep the existing Ansible playbooks as the only mutation path. A small repo-managed reconcile script runs on `dev-admin-01` under a `systemd` timer every minute, detects whether ingest should be attached or absent, and only runs the storage and app playbooks when the live state changed.

**Tech Stack:** Bash, systemd, Ansible, SOPS, SSH, Proxmox, CIFS, Kubernetes, Copyparty

---

### Task 1: Add repo assertions for automatic ingest reconciliation

**Files:**
- Modify: `tests/test_copyparty_configuration.py`
- Create: `apps/copyparty/bin/reconcile-ingest.sh`
- Create: `ansible/templates/copyparty-ingest-reconcile.service.j2`
- Create: `ansible/templates/copyparty-ingest-reconcile.timer.j2`

- [ ] **Step 1: Write the failing test**

Add assertions covering:
- `apps/copyparty/bin/reconcile-ingest.sh`
- `ansible/templates/copyparty-ingest-reconcile.service.j2`
- `ansible/templates/copyparty-ingest-reconcile.timer.j2`
- the one-minute cadence in the timer
- `flock`-based locking in the script
- calls to `32-configure-stateful-storage.yml` and `40-deploy-apps.yml`

- [ ] **Step 2: Run the test and verify it fails**

Run: `python3 -m unittest tests/test_copyparty_configuration.py`

Expected: FAIL because the script and timer templates do not exist yet.

- [ ] **Step 3: Keep the new assertions narrow**

Assert behavior-critical strings only:
- timer cadence
- lock file path
- state-change gating
- playbook commands

Do not overfit the tests to incidental shell formatting.

### Task 2: Add the reconcile script

**Files:**
- Create: `apps/copyparty/bin/reconcile-ingest.sh`
- Modify: `apps/copyparty/README.md`

- [ ] **Step 1: Create the script scaffold**

Create a Bash script that:
- runs with `set -eu`
- `cd`s to the repo root
- sets `ANSIBLE_CONFIG`
- points `SOPS_AGE_KEY_FILE` at the standard dev-admin key path
- defines a lock file under `ansible/runtime/`

- [ ] **Step 2: Add state detection helpers**

Implement shell checks for:
- SSD UUID visibility on Proxmox over SSH
- worker-side `findmnt` result for `/srv/ingest/current`
- live Copyparty config containing `[/ingest]`

- [ ] **Step 3: Add desired-vs-current gating**

Encode:
- `desired=attached` when the disk UUID exists on Proxmox
- `desired=absent` otherwise
- `current=ready` only when worker mount is `cifs` and Copyparty renders `[/ingest]`

If the current state already matches the desired state, log and exit `0`.

- [ ] **Step 4: Add reconciliation path**

If a state change is required, run:
- `ansible-playbook ansible/playbooks/32-configure-stateful-storage.yml`
- then `ansible-playbook ansible/playbooks/40-deploy-apps.yml`

Log:
- `ingest attached, reconciling`
- `ingest removed, reconciling`
- `ingest present, no change`
- `ingest absent, no change`
- `reconcile failed`

- [ ] **Step 5: Document the script behavior**

Update `apps/copyparty/README.md` with:
- where the script lives
- how to run it manually
- what the timer does
- the one-minute eventual-consistency behavior

### Task 3: Install the systemd service and timer on dev-admin

**Files:**
- Create: `ansible/templates/copyparty-ingest-reconcile.service.j2`
- Create: `ansible/templates/copyparty-ingest-reconcile.timer.j2`
- Modify: `ansible/playbooks/35-configure-dev-admin.yml`

- [ ] **Step 1: Create the service unit template**

The service should:
- run as the `dev` user
- execute the repo script from the dev workspace
- use `Type=oneshot`
- rely on the script for locking and logging

- [ ] **Step 2: Create the timer unit template**

The timer should:
- start shortly after boot
- run every minute
- remain enabled

Recommended timer shape:
- `OnBootSec=1min`
- `OnUnitActiveSec=1min`

- [ ] **Step 3: Wire units into the dev-admin playbook**

In `ansible/playbooks/35-configure-dev-admin.yml`:
- ensure the target directory for the script exists
- template the script into the checked-out repo workspace
- template the service and timer into `/etc/systemd/system/`
- run `systemctl daemon-reload`
- enable and start the timer

- [ ] **Step 4: Syntax-check the dev-admin playbook**

Run: `ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook --syntax-check ansible/playbooks/35-configure-dev-admin.yml`

Expected: PASS

### Task 4: Make the tests pass

**Files:**
- Modify: `tests/test_copyparty_configuration.py`
- Modify: `apps/copyparty/bin/reconcile-ingest.sh`
- Modify: `ansible/templates/copyparty-ingest-reconcile.service.j2`
- Modify: `ansible/templates/copyparty-ingest-reconcile.timer.j2`
- Modify: `ansible/playbooks/35-configure-dev-admin.yml`

- [ ] **Step 1: Run the focused test again**

Run: `python3 -m unittest tests/test_copyparty_configuration.py`

Expected: FAIL only on remaining missing or mismatched automation details.

- [ ] **Step 2: Adjust the implementation minimally**

Fix only the specific mismatches surfaced by the test:
- missing paths
- wrong cadence
- missing lock behavior
- missing service or timer installation steps

- [ ] **Step 3: Re-run the focused test until green**

Run: `python3 -m unittest tests/test_copyparty_configuration.py`

Expected: PASS

### Task 5: Deploy the automation to dev-admin

**Files:**
- Modify: `README.md`
- Modify: `apps/copyparty/README.md`

- [ ] **Step 1: Apply the dev-admin playbook**

Run:

```bash
cd /Users/bohdandanyliuk/Workspace/homelab
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt \
ANSIBLE_CONFIG=ansible/ansible.cfg \
ansible-playbook ansible/playbooks/35-configure-dev-admin.yml
```

Expected:
- script installed
- service installed
- timer installed and active

- [ ] **Step 2: Verify the units on dev-admin**

Run:

```bash
ssh dev@192.168.10.113 'systemctl status copyparty-ingest-reconcile.timer --no-pager'
ssh dev@192.168.10.113 'systemctl list-timers copyparty-ingest-reconcile.timer --no-pager'
```

Expected:
- timer is active
- next run is within about one minute

- [ ] **Step 3: Test the manual script path**

Run:

```bash
ssh dev@192.168.10.113 '~/workspace/homelab/apps/copyparty/bin/reconcile-ingest.sh'
```

Expected:
- exits `0`
- logs either `no change` or a successful reconciliation message

- [ ] **Step 4: Document the operator workflow**

Update `README.md` and `apps/copyparty/README.md` with:
- manual debug command
- timer status commands
- expected one-minute delay

### Task 6: Verify automatic attach behavior

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Start from a clean detached state**

Confirm:
- SSD absent on Proxmox
- `/srv/ingest/current` absent or unmounted on worker
- live Copyparty config does not contain `[/ingest]`

- [ ] **Step 2: Attach the SSD and wait for the timer**

Attach the recording SSD and wait up to two timer intervals.

- [ ] **Step 3: Verify automatic attach**

Run:

```bash
ssh root@192.168.10.100 'blkid -U 651F-B1B5 && mount | grep /srv/ingest/current'
ssh root@192.168.10.111 'findmnt -n -M /srv/ingest/current -o FSTYPE,SOURCE,TARGET'
kubectl --kubeconfig ansible/runtime/kubeconfig.raw -n copyparty exec deploy/copyparty -- sh -lc 'grep -n \"\\[/ingest\\]\" /etc/copyparty/copyparty.conf && ls -la /srv/ingest | sed -n \"1,12p\"'
```

Expected:
- Proxmox sees the SSD and mounts it
- worker mount is `cifs`
- Copyparty renders `[/ingest]`
- files are visible inside `/srv/ingest`

- [ ] **Step 4: Check timer/service logs**

Run:

```bash
ssh dev@192.168.10.113 'journalctl -u copyparty-ingest-reconcile.service -n 50 --no-pager'
```

Expected:
- attach event logged
- reconciliation completed without repeated thrashing

### Task 7: Verify automatic detach behavior

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Remove the SSD and wait for the timer**

Detach the recording SSD and wait up to two timer intervals.

- [ ] **Step 2: Verify automatic detach**

Run:

```bash
ssh root@192.168.10.100 'blkid -U 651F-B1B5 || true; mount | grep /srv/ingest/current || true'
ssh root@192.168.10.111 'findmnt -n -M /srv/ingest/current -o FSTYPE,SOURCE,TARGET || true'
kubectl --kubeconfig ansible/runtime/kubeconfig.raw -n copyparty exec deploy/copyparty -- sh -lc 'grep -n \"\\[/ingest\\]\" /etc/copyparty/copyparty.conf || true'
```

Expected:
- Proxmox no longer sees the UUID
- worker ingest mount is gone
- live Copyparty config no longer contains `[/ingest]`

- [ ] **Step 3: Confirm `/share` stayed healthy**

Run:

```bash
curl -sk https://share.homelab.magnetic-marten.com | sed -n '1,5p'
```

Expected:
- normal Copyparty login text still served

### Task 8: Final verification and commit

**Files:**
- Modify: `apps/copyparty/README.md`
- Modify: `README.md`
- Modify: `tests/test_copyparty_configuration.py`
- Modify: `ansible/playbooks/35-configure-dev-admin.yml`
- Create: `apps/copyparty/bin/reconcile-ingest.sh`
- Create: `ansible/templates/copyparty-ingest-reconcile.service.j2`
- Create: `ansible/templates/copyparty-ingest-reconcile.timer.j2`

- [ ] **Step 1: Run the full relevant checks**

Run:

```bash
python3 -m unittest tests/test_copyparty_configuration.py
ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook --syntax-check ansible/playbooks/35-configure-dev-admin.yml
ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook --syntax-check ansible/playbooks/32-configure-stateful-storage.yml
ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook --syntax-check ansible/playbooks/40-deploy-apps.yml
kubectl --kubeconfig ansible/runtime/kubeconfig.raw -n copyparty rollout status deployment/copyparty --timeout=120s
```

Expected:
- all checks pass

- [ ] **Step 2: Stage the completed changes**

Run:

```bash
git add apps/copyparty/bin/reconcile-ingest.sh \
  apps/copyparty/README.md \
  ansible/playbooks/35-configure-dev-admin.yml \
  ansible/templates/copyparty-ingest-reconcile.service.j2 \
  ansible/templates/copyparty-ingest-reconcile.timer.j2 \
  tests/test_copyparty_configuration.py \
  README.md
```

- [ ] **Step 3: Commit**

Run:

```bash
git commit -m "Automate Copyparty ingest reconciliation"
```
