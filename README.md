# Homelab Infrastructure

Infrastructure as code for a Proxmox-based homelab using:

- `Packer` for the Ubuntu 24.04 K3s template
- `OpenTofu` for Proxmox VM provisioning and Cloudflare resources
- `Ansible` for orchestration, K3s configuration, app deployment, and backups
- `sops + age` for public-repo-safe secrets

## Target Topology

- `k3s-control-01` at `192.168.10.110`
- `k3s-worker-01` at `192.168.10.111`
- `haos-01` at `192.168.10.112`
- `dev-admin-01` at `192.168.10.113`
- MetalLB pool `192.168.10.120-192.168.10.129`
- Traefik VIP `192.168.10.120`

## Applications

- `homepage.magnetic-marten.com`
  - Public through Cloudflare Tunnel and protected by Cloudflare Access
- `homepage.homelab.magnetic-marten.com`
  - LAN only through CoreDNS and Traefik
- `n8n.magnetic-marten.com`
  - Public through Cloudflare Tunnel and protected by Cloudflare Access
- `n8n.homelab.magnetic-marten.com`
  - LAN only through CoreDNS and Traefik
- `share.magnetic-marten.com`
  - Public direct ingress for QuickDrop file sharing
- `share.homelab.magnetic-marten.com`
  - LAN only through CoreDNS and Traefik
- `ha.homelab.magnetic-marten.com`
  - LAN only, routed through Traefik to the Home Assistant OS VM
- `dev.homelab.magnetic-marten.com`
  - LAN only SSH/admin VM for Codex, Ansible, and homelab operations

## Repository Layout

```text
.
├── ansible/                  # Orchestration, K3s, apps, backups
├── kubernetes/               # Versioned Kubernetes manifests/templates
├── opentofu/
│   ├── cloudflare/           # DNS, tunnel, Access
│   └── proxmox/              # VM provisioning
└── packer/
    └── ubuntu-k3s-template/  # Ubuntu 24.04 template for K3s nodes
```

## Secrets

This repo is intended to become public. Do not commit plaintext secrets.

1. Generate or reuse an age key.
2. Copy:
   - `.sops.yaml.example` to `.sops.yaml`
   - `ansible/group_vars/all/secrets.sops.yaml.example` to `ansible/group_vars/all/secrets.sops.yaml`
3. Replace placeholders.
4. Encrypt the secrets file with `sops -e -i ansible/group_vars/all/secrets.sops.yaml`.

Bootstrap can also write short-lived local runtime files under `ansible/runtime/`. These files are gitignored and exist only to bridge the first token/discovery step before values are moved into encrypted secrets.

The same rule applies to generated inventory and Packer runtime seed files:

- `ansible/inventory/generated/hosts.yml`
- `packer/ubuntu-k3s-template/runtime/`

Those files are rendered locally and are intentionally not version-controlled. The temporary
Packer SSH password also belongs in `ansible/group_vars/all/secrets.sops.yaml`, not in
tracked config.

Example commands:

```bash
# Generate an age key for sops
mkdir -p ~/.config/sops/age
age-keygen -o ~/.config/sops/age/keys.txt

# Show the public recipient and place it into .sops.yaml
age-keygen -y ~/.config/sops/age/keys.txt

# Encrypt the repo secrets file
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt sops -e -i ansible/group_vars/all/secrets.sops.yaml
```

## Prerequisites

- Proxmox host reachable at `192.168.10.100`
- SSH access to Proxmox as `root`
- Your local SSH public key must already be installed in `root`'s `authorized_keys` on the Proxmox host
- `Packer`
- `OpenTofu`
- `Ansible`
- `age`
- `sops`
- Cloudflare account with:
  - zone `magnetic-marten.com`
  - API token for DNS and Zero Trust resources
  - Cloudflare Access allowlist emails in `ansible/group_vars/all/secrets.sops.yaml`
  - UniFi local DNS forward domain:
  - `homelab.magnetic-marten.com -> 192.168.10.121`
  - Router port forwards:
    - TCP `80` -> `192.168.10.120`
    - TCP `443` -> `192.168.10.120`

## LAN DNS

LAN-only names are resolved by a dedicated CoreDNS service in K3s.

- CoreDNS service IP: `192.168.10.121`
- Wildcard: `*.homelab.magnetic-marten.com -> 192.168.10.120`
- Explicit overrides:
  - `proxmox.homelab.magnetic-marten.com -> 192.168.10.100`
  - `haos.homelab.magnetic-marten.com -> 192.168.10.112`
  - `k3s-control.homelab.magnetic-marten.com -> 192.168.10.110`
  - `k3s-worker.homelab.magnetic-marten.com -> 192.168.10.111`
  - `dev.homelab.magnetic-marten.com -> 192.168.10.113`
  - `share.homelab.magnetic-marten.com -> 192.168.10.120`

In UniFi, keep clients using the gateway as DNS and add one `Forward Domain`
record that forwards `homelab.magnetic-marten.com` to `192.168.10.121`.

Install Ansible collections before the first run:

```bash
ansible-galaxy collection install -r ansible/requirements.yml
```

Bootstrap requires key-based SSH access to Proxmox root before any playbook run. The default key path used by this repo is `~/.ssh/id_ed25519`.

```bash
# Generate a bootstrap SSH key if you do not already have one
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -C "homelab-bootstrap"

# Copy the public key to Proxmox root
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@192.168.10.100

# Verify that key-based login works before running Ansible
ssh -i ~/.ssh/id_ed25519 root@192.168.10.100
```

## Execution Flow

All orchestration happens from this laptop through Ansible playbooks.

```bash
# 1. Bootstrap Proxmox API access and discovery
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ansible-playbook ansible/playbooks/00-bootstrap-proxmox.yml

# 2. Build the Ubuntu template
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ansible-playbook ansible/playbooks/10-build-template.yml

# 3. Provision VMs and Cloudflare resources
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ansible-playbook ansible/playbooks/20-provision-infra.yml

# 4. Configure K3s cluster
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ansible-playbook ansible/playbooks/30-configure-k3s.yml

# 5. Configure the dev/admin VM
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ansible-playbook ansible/playbooks/35-configure-dev-admin.yml

# 6. Deploy cert-manager, Homepage, n8n, Home Assistant proxy, cloudflared
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ansible-playbook ansible/playbooks/40-deploy-apps.yml

# 7. Configure Proxmox backup storage and VM backup jobs
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ansible-playbook ansible/playbooks/50-configure-backups.yml
```

To run the whole flow in one command:

```bash
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ansible-playbook ansible/playbooks/site.yml
```

## Important Notes

- Home Assistant OS does not support the same cloud-init flow as the Ubuntu K3s nodes.
  - This repo provisions `haos-01` as a VM clone from a prepared HAOS template.
  - The intended address is still `192.168.10.112`, but in practice that should be enforced with a router DHCP reservation for the VM's MAC address.
- Public apps terminate TLS at Cloudflare edge.
  - The cluster still uses Let's Encrypt wildcard certificates at the origin.
  - For `*.homelab.magnetic-marten.com`, Cloudflare edge HTTPS also requires certificate coverage for a multi-level subdomain.
  - Cloudflare Universal SSL does not cover `*.homelab.magnetic-marten.com` by default, so you need Total TLS, an Advanced Certificate, or a Custom Certificate on the zone before the public HTTPS hostnames will work end to end.
- Only encrypted secrets and source templates belong in git.
  - Generated runtime files under `ansible/runtime/`, `ansible/inventory/generated/`, and `packer/ubuntu-k3s-template/runtime/` are intentionally ignored.

## What Is Automated

- Proxmox automation user and API token bootstrap
- Proxmox discovery
- Ubuntu template build
- HAOS template preparation
- K3s VM provisioning
- Dev/admin VM provisioning
- Cloudflare Tunnel, DNS, and n8n Access policy
- K3s install with Traefik and MetalLB
- Dev/admin VM configuration with Codex CLI, Tailscale, and homelab tooling
- cert-manager DNS-01 issuer for Cloudflare
- Homepage
- n8n + PostgreSQL
- QuickDrop
- Home Assistant LAN ingress proxy
- Proxmox VM backup storage and backup jobs

## What Still Requires Environment-Specific Input

- Real encrypted secret values
- Proxmox node/storage names if they differ from defaults
- SSD device selection and formatting policy
- Cloudflare account and zone identifiers
- Router/local DNS override for Home Assistant
