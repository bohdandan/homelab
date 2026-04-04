# Uptime Kuma

Repo-owned Uptime Kuma desired state lives here.

## What lives here

- `config/desired-state.yaml.j2`
  - The monitor definitions managed by this repo.
- `requirements.txt`
  - The Python packages used by the reconciliation script.
- `reconcile.py`
  - Idempotently creates or updates the managed monitors in Uptime Kuma.

## Source of Truth

The monitors defined in `config/desired-state.yaml.j2` are the source of truth for the
repo-managed Uptime Kuma checks.

The current reconciliation behavior is intentionally conservative:

- it creates missing monitors
- it updates managed monitors when their desired fields change
- it does not delete monitors that are missing from the desired-state file

This lets operators experiment in the UI without risking destructive sync behavior.

## Operator Workflow

After changing the desired-state file, re-run:

```bash
cd /Users/bohdandanyliuk/Workspace/homelab
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/playbooks/40-deploy-apps.yml
```

That playbook:

- ensures the Uptime Kuma admin credentials match the encrypted repo secrets
- renders the desired-state file
- installs the reconciliation script dependencies in a local runtime virtualenv
- reconciles the managed monitors against the live Uptime Kuma instance
