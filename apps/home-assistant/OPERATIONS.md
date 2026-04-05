# Home Assistant Operations

## Prerequisites

Before running the Home Assistant sync playbook:

1. Install and start the Home Assistant Community `SSH & Web Terminal` add-on on
   `haos-01`.
2. Configure the add-on to listen on SSH port `22`.
3. Add your public key to the add-on's `authorized_keys`.
4. Confirm you can log in manually:

```bash
ssh -i ~/.ssh/id_ed25519 hassio@192.168.10.112
```

## Sync Workflow

Run the sync playbook from the repo root:

```bash
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt \
ANSIBLE_CONFIG=ansible/ansible.cfg \
ansible-playbook ansible/playbooks/45-sync-home-assistant-config.yml
```

The playbook will:

- stage the repo-managed config locally
- push the managed files and directories into HAOS `/config`
- run `ha core check`
- restart Home Assistant if the repo-managed config changed

## Managed Surface

The scaffold currently manages:

- `configuration.yaml`
- `automations.yaml`
- `scripts.yaml`
- `scenes.yaml`
- `secrets.yaml`
- `packages/`
- `dashboards/`
- `blueprints/`
- `www/`
- `custom_components/`

It intentionally does not delete or replace `.storage`, the SQLite database,
logs, or other HA-generated runtime state.
