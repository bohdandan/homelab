# Home Assistant

Home Assistant configuration as code lives here.

This folder is the repo-owned source of truth for the YAML-driven parts of the
current `haos-01` setup.

## Layout

- `config/configuration.yaml`
  - Root Home Assistant configuration entrypoint.
- `config/automations.yaml`
  - YAML-managed automations.
- `config/scripts.yaml`
  - YAML-managed scripts.
- `config/scenes.yaml`
  - YAML-managed scenes.
- `config/packages/`
  - Package-style configuration split by concern.
- `config/dashboards/`
  - YAML dashboards.
- `config/blueprints/`
  - Local blueprint storage.
- `config/www/`
  - Static frontend assets.
- `config/custom_components/`
  - Tracked custom integrations if you add them later.

## Deployment

Repo-managed Home Assistant config is synced to HAOS with:

```bash
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt \
ANSIBLE_CONFIG=ansible/ansible.cfg \
ansible-playbook ansible/playbooks/45-sync-home-assistant-config.yml
```

The sync playbook only manages the repo-owned files and directories. It does not
delete HAOS runtime state such as `.storage`, `home-assistant_v2.db`, logs, or
other UI-managed data.

## Scope

Keep the YAML-first parts of Home Assistant here. Continue to treat HA backups as
the rollback path for UI-managed state that is not practical to hand-edit in git.
