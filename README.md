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

## Network Layout

The current UniFi VLAN and subnet layout is documented in [docs/networking.md](/Users/bohdandanyliuk/Workspace/homelab/docs/networking.md).

Current homelab placement:

- the homelab stack currently lives on `Home Network` (`VLAN 10`, `192.168.10.0/24`)
- fixed homelab infrastructure starts at `192.168.10.100`
- MetalLB service IPs use `192.168.10.120-192.168.10.129`

## Applications

- `docs.magnetic-marten.com`
  - Public through Cloudflare Tunnel without Cloudflare Access
- `docs.homelab.magnetic-marten.com`
  - LAN only through CoreDNS and Traefik
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
- `zigbee.homelab.magnetic-marten.com`
  - LAN only through CoreDNS and Traefik for Zigbee2MQTT
- `changedetection.homelab.magnetic-marten.com`
  - LAN only through CoreDNS and Traefik
- `kuma.homelab.magnetic-marten.com`
  - LAN only through CoreDNS and Traefik
- `ntfy.homelab.magnetic-marten.com`
  - LAN only through CoreDNS and Traefik
- `glances.homelab.magnetic-marten.com`
  - LAN only through CoreDNS and Traefik, backed by the dev/admin VM
- `db.homelab.magnetic-marten.com`
  - LAN only through CoreDNS and Traefik for CloudBeaver CE
- `ha.homelab.magnetic-marten.com`
  - LAN only, routed through Traefik to the Home Assistant OS VM
- `dev.homelab.magnetic-marten.com`
  - LAN only SSH/admin VM for Codex, Ansible, and homelab operations
- `slzb-mr4.homelab.magnetic-marten.com`
  - Explicit LAN hostname for the SMLIGHT SLZB-MR4 once its device IP is recorded

## Repository Layout

```text
.
├── .github/                  # CI workflows such as GHCR image publishing
├── apps/                     # App-owned source, content, and configuration
├── ansible/                  # Orchestration, K3s, apps, backups
├── docs/                     # Operator docs, specs, plans, and app catalog
├── kubernetes/               # Versioned Kubernetes manifests/templates
├── opentofu/
│   ├── cloudflare/           # DNS, tunnel, Access
│   └── proxmox/              # VM provisioning
├── packer/
│   └── ubuntu-k3s-template/  # Ubuntu 24.04 template for K3s nodes
└── tests/                    # Regression coverage for repo wiring
```

Use `apps/<app>/` for app-owned content and configuration.

- `apps/astro-docs/` is the current example.
- `apps/home-assistant/` stores the repo-managed HAOS YAML config scaffold and sync workflow.
- `apps/uptime-kuma/` stores the repo-managed Kuma desired state and reconciliation script.
- Keep deployment manifests and IaC wiring in `kubernetes/`, `ansible/`, and `opentofu/` until a broader refactor is justified.

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
- Uptime Kuma admin credentials in `ansible/group_vars/all/secrets.sops.yaml`
- Home Assistant Community `SSH & Web Terminal` add-on enabled on `haos-01`
  - SSH key installed for the `hassio` user
- UniFi local DNS forward domain:
  - `homelab.magnetic-marten.com -> 192.168.10.121`
- Router port forwards for direct-ingress services:
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
  - `glances.homelab.magnetic-marten.com -> 192.168.10.120`
  - `db.homelab.magnetic-marten.com -> 192.168.10.120`
  - `docs.homelab.magnetic-marten.com -> 192.168.10.120`
  - `changedetection.homelab.magnetic-marten.com -> 192.168.10.120`
  - `kuma.homelab.magnetic-marten.com -> 192.168.10.120`
  - `ntfy.homelab.magnetic-marten.com -> 192.168.10.120`
  - `zigbee.homelab.magnetic-marten.com -> 192.168.10.120`
  - `share.homelab.magnetic-marten.com -> 192.168.10.120`
  - `slzb-mr4.homelab.magnetic-marten.com -> <device IP>`

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

# 6. Deploy cert-manager, internal apps, Astro docs, Homepage, n8n, QuickDrop, Home Assistant proxy, and cloudflared
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ansible-playbook ansible/playbooks/40-deploy-apps.yml

# 7. Optionally sync repo-managed Home Assistant YAML config into HAOS
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ansible-playbook ansible/playbooks/45-sync-home-assistant-config.yml

# 8. Configure Proxmox backup storage and VM backup jobs
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ansible-playbook ansible/playbooks/50-configure-backups.yml
```

To run the whole flow in one command:

```bash
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ansible-playbook ansible/playbooks/site.yml
```

## Uptime Kuma As Code

Uptime Kuma monitor definitions are managed in:

- [apps/uptime-kuma/config/desired-state.yaml.j2](/Users/bohdandanyliuk/Workspace/homelab/apps/uptime-kuma/config/desired-state.yaml.j2)

The `40-deploy-apps.yml` playbook now:

- ensures the Kuma admin username/password match the encrypted repo secrets
- renders the desired-state file into `ansible/runtime/`
- installs the Python API client in a local runtime virtualenv
- creates or updates the managed monitors in the live Kuma instance

## Home Assistant Config As Code

Repo-managed Home Assistant YAML now lives under:

- [apps/home-assistant/](/Users/bohdandanyliuk/Workspace/homelab/apps/home-assistant/)

Use [ansible/playbooks/45-sync-home-assistant-config.yml](/Users/bohdandanyliuk/Workspace/homelab/ansible/playbooks/45-sync-home-assistant-config.yml)
to push the tracked config surface into HAOS `/config`.

The sync playbook is intentionally conservative:

- it manages the tracked YAML files and selected directories from `apps/home-assistant/config/`
- it validates the resulting config with `ha core check`
- it restarts Home Assistant only when the tracked config changed
- it does not delete `.storage`, the Home Assistant database, logs, or other HA-generated runtime state

## Important Notes

- Home Assistant OS does not support the same cloud-init flow as the Ubuntu K3s nodes.
  - This repo provisions `haos-01` as a VM clone from a prepared HAOS template.
  - The intended address is still `192.168.10.112`, but in practice that should be enforced with a router DHCP reservation for the VM's MAC address.
- Public exposure is intentionally mixed:
  - `docs.magnetic-marten.com`, `homepage.magnetic-marten.com`, and `n8n.magnetic-marten.com` are routed through Cloudflare Tunnel.
  - `homepage` and `n8n` are protected by Cloudflare Access.
  - `share.magnetic-marten.com` is DNS-only direct ingress so large file uploads bypass Cloudflare upload limits.
  - LAN-only `*.homelab.magnetic-marten.com` hostnames resolve through UniFi -> CoreDNS -> Traefik.
- Only encrypted secrets and source templates belong in git.
  - Generated runtime files under `ansible/runtime/`, `ansible/inventory/generated/`, and `packer/ubuntu-k3s-template/runtime/` are intentionally ignored.
- Hosted Renovate is the recommended image update path for this repo.
  - Pin image versions in git.
  - Let Renovate open PRs.
  - After merging an image update PR, re-run `ansible/playbooks/40-deploy-apps.yml`.
  - If a Renovate PR updates dev VM tooling instead of K3s app images, re-run `ansible/playbooks/35-configure-dev-admin.yml`.
- After the first successful GHCR publish for a new app image, confirm the package is public so K3s can pull it without a registry secret.
- If a workload already hit `ImagePullBackOff` before the package was made public, restart that deployment after changing package visibility so Kubernetes retries the pull immediately.

## What Is Automated

- Proxmox automation user and API token bootstrap
- Proxmox discovery
- Ubuntu template build
- HAOS template preparation
- K3s VM provisioning
- Dev/admin VM provisioning
- Cloudflare Tunnel, public DNS, and Access policy wiring for public apps
- Astro docs on K3s with public and LAN Traefik ingress
- K3s install with Traefik and MetalLB
- Dev/admin VM configuration with Codex CLI, Tailscale, and homelab tooling
- cert-manager DNS-01 issuer for Cloudflare
- Homepage
- ChangeDetection
- Uptime Kuma
- ntfy
- Glances on the dev/admin VM
- CloudBeaver CE
- Mosquitto
- Zigbee2MQTT
- n8n + PostgreSQL
- QuickDrop
- Home Assistant LAN ingress proxy
- Proxmox VM backup storage and backup jobs

## What Still Requires Environment-Specific Input

- Real encrypted secret values
- Proxmox node/storage names if they differ from defaults
- SSD device selection and formatting policy
- Cloudflare account and zone identifiers
- Stable SLZB-MR4 LAN IP and Thread/OTBR endpoint details
- Installing the hosted Renovate GitHub app on the repository

## CloudBeaver First Use

CloudBeaver is internal-only at `https://db.homelab.magnetic-marten.com`.

What is automated:
- seeded admin login from encrypted repo secrets
- preconfigured `n8n` PostgreSQL connection metadata

One manual step remains after first login:
1. Sign in as the seeded CloudBeaver admin.
2. Open the preconfigured `n8n PostgreSQL` connection.
3. Enter the PostgreSQL password once and save it in CloudBeaver.

## SLZB-MR4 / Zigbee2MQTT First Use

The repository now includes:

- `Mosquitto` as an internal MQTT broker on MetalLB IP `192.168.10.122`
- `Zigbee2MQTT` at `https://zigbee.homelab.magnetic-marten.com`
- an explicit CoreDNS record for `slzb-mr4.homelab.magnetic-marten.com` once the device IP is set in `ansible/group_vars/all/main.yml`

Before applying the Zigbee stack, record the real SLZB-MR4 values in `ansible/group_vars/all/main.yml`:

```yaml
  iot:
    slzb_mr4:
      ip: 192.168.30.X
      zigbee_adapter_type: ember
      zigbee_port: 6638
      thread_network_device: 192.168.30.X:7638
```

Until you replace it, the repo keeps `slzb-mr4.homelab.magnetic-marten.com` pinned to `0.0.0.0`
so it does not fall through to the wildcard Traefik record by mistake.

Populate these encrypted secrets too:

- `mqtt_username`
- `mqtt_password`
- `zigbee2mqtt_network_key`

Then redeploy:

```bash
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ansible-playbook ansible/playbooks/40-deploy-apps.yml
```

Manual Home Assistant steps remain:

1. Add the MQTT integration in Home Assistant using `192.168.10.122`, the configured username, and the configured password.
2. Open the SLZB-MR4 web UI and confirm the Zigbee radio socket and Thread mode are still on `6638` and `7638`.
3. In the Home Assistant OpenThread Border Router add-on, use the MR4 as a remote network device at `192.168.30.X:7638`.
4. Complete Matter-over-Thread commissioning from the Home Assistant mobile app when you start pairing devices.
