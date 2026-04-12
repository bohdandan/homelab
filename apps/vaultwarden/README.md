# Vaultwarden

Vaultwarden is deployed as a LAN-only password vault at:

- `https://vaultwarden.homelab.magnetic-marten.com`

## Access Model

- LAN DNS is served by CoreDNS.
- Traefik ingress is protected by an IP allowlist for local and in-cluster ranges.
- No Cloudflare DNS record or public Tunnel route is configured.

## Bootstrap

Initial signups are enabled with `homelab.apps.vaultwarden.signups_allowed: true`.

After creating the first account:

1. Set `homelab.apps.vaultwarden.signups_allowed` to `false` in `ansible/group_vars/all/main.yml`.
2. Redeploy apps:

```bash
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/playbooks/40-deploy-apps.yml
```

The human-usable admin token is stored as `vaultwarden_admin_token` in
`ansible/group_vars/all/secrets.sops.yaml`. The running container receives
`vaultwarden_admin_token_hash` so the admin page token is not exposed as
plaintext in the pod environment.
