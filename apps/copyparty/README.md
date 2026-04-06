# Copyparty

Tracked app-owned config for the staged Copyparty migration.

## Runtime

- `copyparty.conf.j2` is rendered into the `copyparty-config` Kubernetes Secret.
- `/share` maps to the permanent internal share storage mounted at `/srv/share`.
- `/ingest` maps to the removable ingest storage mounted at `/srv/ingest` when the SSD is attached.
- The removable ingest SSD is mounted read-only on Proxmox and bridged to the worker over read-only Samba/CIFS so `exfat` media can be exposed without reformatting.
- `/share` is read-write for authenticated accounts.
- `/ingest` is read-only and disappears from the rendered config when no removable ingest SSD is mounted.
- `admin` can read/write `/share` and read `/ingest`.
- `guest` can read `/share` only.
- `manager` can read/write `/share` only.
- Temporary share links are enabled in Copyparty itself; Task 4 does not expose them on the live `share.*` hostnames yet.

## Validation

Task 4 keeps Copyparty off the live ingress surface. Validate it with direct service access:

```bash
kubectl --kubeconfig ansible/runtime/kubeconfig.raw -n copyparty get pods,svc
kubectl --kubeconfig ansible/runtime/kubeconfig.raw -n copyparty port-forward svc/copyparty 8088:80
curl -sI http://127.0.0.1:8088
```

## Automatic Ingest Reconciliation

- `apps/copyparty/bin/reconcile-ingest.sh` is the repo-managed reconcile entrypoint for ingest attach/remove events on `dev-admin-01`.
- `copyparty-ingest-reconcile.timer` runs the reconcile service every one minute and also one minute after boot.
- In normal operation, `/ingest` is eventual-consistency driven: after the removable SSD is attached or removed, Copyparty should reflect the change within about one minute.
- If the dev-admin checkout, kubeconfig, or age key is not ready yet, the reconcile pass safely no-ops and waits for the next one-minute timer tick instead of forcing a failing loop.
- A manual debug run on `dev-admin-01` is:

```bash
~/workspace/homelab/apps/copyparty/bin/reconcile-ingest.sh
```

- Timer status commands on `dev-admin-01`:

```bash
systemctl status copyparty-ingest-reconcile.timer --no-pager
systemctl list-timers copyparty-ingest-reconcile.timer --no-pager
journalctl -u copyparty-ingest-reconcile.service -n 50 --no-pager
```
