# Copyparty

Tracked app-owned config for the staged Copyparty migration.

## Runtime

- `copyparty.conf.j2` is rendered into the `copyparty-config` Kubernetes Secret.
- `/share` maps to the permanent internal share storage mounted at `/srv/share`.
- `/ingest` maps to the removable ingest storage mounted at `/srv/ingest` when the SSD is attached.
- The removable ingest SSD is mounted read-only on Proxmox and bridged to the worker over read-only Samba/CIFS so `exfat` media can be exposed without reformatting.
- `/share` is read-write for authenticated accounts.
- `/ingest` is read-only and disappears from the rendered config when no removable ingest SSD is mounted.
- Temporary share links are enabled in Copyparty itself; Task 4 does not expose them on the live `share.*` hostnames yet.

## Validation

Task 4 keeps Copyparty off the live ingress surface. Validate it with direct service access:

```bash
kubectl --kubeconfig ansible/runtime/kubeconfig.raw -n copyparty get pods,svc
kubectl --kubeconfig ansible/runtime/kubeconfig.raw -n copyparty port-forward svc/copyparty 8088:80
curl -sI http://127.0.0.1:8088
```
