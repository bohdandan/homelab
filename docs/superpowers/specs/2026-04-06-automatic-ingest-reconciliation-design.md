# Automatic Ingest Reconciliation Design

## Goal

Make Copyparty's `/ingest` volume appear and disappear automatically when the removable recording SSD is plugged into or removed from the server.

The automation should:

- detect the SSD presence by filesystem UUID
- mount and export the disk on Proxmox when present
- mount or remove the corresponding worker-side ingest path
- redeploy Copyparty only when the ingest state changed
- keep the system healthy when the disk is absent

## Current State

Today `/ingest` appears only after an operator runs both:

- `ansible/playbooks/32-configure-stateful-storage.yml`
- `ansible/playbooks/40-deploy-apps.yml`

The current ingest path is:

- removable SSD mounted read-only on Proxmox
- exposed from Proxmox to `k3s-worker-01` via read-only Samba
- mounted on `k3s-worker-01` via CIFS
- rendered into Copyparty only when the worker-side mount is present

This works, but it is manual.

## Constraints

- Keep infrastructure-as-code as the source of truth.
- Reuse the existing Ansible storage and app deploy playbooks rather than introducing a second provisioning path.
- Avoid brittle USB hotplug chains unless there is a strong reason to do so.
- Keep the removable ingest SSD read-only.
- Do not break normal Copyparty `/share` availability when the ingest disk is absent.
- Make the automation safe to run repeatedly.
- Prefer execution from a machine that already has repo access, SOPS keys, and working operator tooling.

## Approaches Considered

### 1. Recommended: periodic reconcile timer

Run a small repo-managed reconciliation script every minute from `dev-admin-01`.

The script checks current ingest state and only runs the heavy Ansible reconciliation when the desired ingest state changed.

Pros:

- simple
- robust
- easy to reason about
- preserves the existing IaC flow
- easy to debug from logs

Cons:

- not instantaneous
- appearance/disappearance can lag by up to one minute

### 2. Event-driven hotplug automation with `udev`

Trigger the reconcile flow directly from Proxmox USB add/remove events.

Pros:

- near-immediate reaction

Cons:

- much more fragile
- harder to debug
- more likely to race before the filesystem is actually ready
- pushes more logic into host event handling instead of repo-managed operator automation

### 3. Long-running watcher daemon

Run a continuously looping custom daemon that polls device state and triggers reconciliation.

Pros:

- flexible
- can debounce aggressively

Cons:

- more moving parts than needed
- harder to operate than a systemd timer
- duplicates capabilities systemd timers already provide

## Recommended Approach

Use a `systemd` timer on `dev-admin-01` with a one-minute cadence.

The timer runs a small reconcile script located in the repo-owned operator surface for the dev/admin VM. That script:

1. checks whether the removable ingest SSD UUID is currently present on Proxmox
2. checks whether the worker has the CIFS ingest mount
3. checks whether the live Copyparty pod currently renders `/ingest`
4. determines whether the current live state already matches desired state
5. runs the existing storage and app playbooks only when the desired state changed

This keeps the behavior automatic without making the setup event-driven and fragile.

## Execution Location

Run the automation from `dev-admin-01`.

Why this is the best fit:

- it already has the repo checked out
- it already has `ansible`, `sops`, SSH access, and the operator toolchain
- it is the existing admin box for homelab operations
- it avoids embedding repo automation directly inside Proxmox host-local cron or ad-hoc scripts

## Automation Shape

### Script

Add a small script under the app/operator-owned repo surface, for example:

```text
apps/copyparty/bin/reconcile-ingest.sh
```

The script should:

- `cd` into the repo root
- load the standard Ansible/SOPS environment
- detect whether the ingest SSD UUID is present on Proxmox
- detect whether `/srv/ingest/current` is mounted on `k3s-worker-01`
- detect whether the live Copyparty config contains `[/ingest]`
- compare the desired target state against the current live state
- if state already matches, log and exit `0`
- if state changed:
  - run `32-configure-stateful-storage.yml`
  - then run `40-deploy-apps.yml`

### Locking

The script should use a lock file to avoid overlapping timer runs.

Recommended:

- `flock` on a file under `/home/dev/workspace/homelab/ansible/runtime/`

If a previous run is still active, the next run should log and exit cleanly.

### Logging

The script should log concise, operator-friendly states such as:

- `ingest present, no change`
- `ingest absent, no change`
- `ingest attached, reconciling`
- `ingest removed, reconciling`
- `reconcile failed`

The script should be usable both:

- under systemd timer execution
- manually from a shell for debugging

## State Model

Desired state is binary:

- `attached`
- `absent`

The script should treat the SSD as `attached` only when the disk UUID is visible on Proxmox.

The script should treat live ingestion as `ready` only when:

- the worker-side mount is present as `cifs`
- the Copyparty runtime contains the `[/ingest]` volume

This prevents false positives where the disk is visible but the full path is not actually usable yet.

## Failure Handling

If a reconcile run fails:

- leave the previous successful state in place
- exit non-zero
- rely on the next timer run to retry

The script should not attempt rollback logic beyond that. The existing playbooks are already the source of truth and should remain the only mutation path.

This means:

- if attach reconciliation fails, `/ingest` may remain absent until the next run succeeds
- if detach reconciliation fails, `/ingest` may remain visible until the next run succeeds

That is acceptable for a one-minute eventual-consistency model.

## Systemd Units

Add repo-managed templates for:

- `copyparty-ingest-reconcile.service`
- `copyparty-ingest-reconcile.timer`

The timer should run every minute.

Recommended behavior:

- start one minute after boot
- continue on a one-minute cadence
- remain enabled on `dev-admin-01`

## Verification Strategy

Implementation should verify:

- the timer and service files are installed on `dev-admin-01`
- the reconcile script is executable
- a manual run exits cleanly when no state change is needed
- attaching the SSD results in:
  - Proxmox mount present
  - worker CIFS mount present
  - Copyparty rendered with `[/ingest]`
- removing the SSD results in:
  - Proxmox mount removed
  - worker CIFS mount removed
  - Copyparty rendered without `[/ingest]`

## Repo Impact

Likely files to change:

- `apps/copyparty/bin/reconcile-ingest.sh`
- `apps/copyparty/README.md`
- `ansible/playbooks/35-configure-dev-admin.yml`
- `ansible/templates/` for the systemd unit and timer
- `tests/test_copyparty_configuration.py`
- `README.md`

## Out of Scope

- USB hotplug `udev` automation
- desktop notifications for ingest attach/remove
- multiple simultaneous ingest disks
- auto-importing ingest content into `/share`
- exposing `/ingest` to non-admin users
