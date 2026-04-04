# Networking

Current UniFi network layout as of April 2026.

## VLANs

| Name | VLAN | Subnet | Current role |
|---|---:|---|---|
| `Default` | `1` | `192.168.1.0/24` | Legacy/default UniFi network. Not used by the homelab stack. |
| `Home Network` | `10` | `192.168.10.0/24` | Main trusted LAN. Current homelab servers and K3s nodes live here. |
| `Camera Network` | `20` | `192.168.20.0/24` | Camera-specific network. |
| `IOT Network` | `30` | `192.168.30.0/24` | General IoT network for future smart devices. |
| `Guest Network` | `40` | `192.168.40.0/24` | Guest client network. |
| `Management Network` | `254` | `192.168.254.0/24` | UniFi / infrastructure management network. |

## Homelab Placement

The current homelab stack is on `Home Network` (`VLAN 10`, `192.168.10.0/24`).

Current static infrastructure addresses:

- `192.168.10.100` - Proxmox host
- `192.168.10.110` - `k3s-control-01`
- `192.168.10.111` - `k3s-worker-01`
- `192.168.10.112` - `haos-01`
- `192.168.10.113` - `dev-admin-01`
- `192.168.10.120` - Traefik / MetalLB entrypoint
- `192.168.10.121` - CoreDNS service IP
- `192.168.10.122` - Mosquitto service IP

## Addressing Convention

Current convention in `Home Network`:

- low addresses are left for DHCP client allocation
- homelab infrastructure uses fixed addresses from `192.168.10.100` upward
- MetalLB service IPs are allocated from `192.168.10.120-192.168.10.129`

This keeps the homelab service layer separated from ordinary LAN clients without changing the current VLAN placement.

## DNS and Exposure

- UniFi forwards `homelab.magnetic-marten.com` to CoreDNS at `192.168.10.121`
- CoreDNS resolves internal `*.homelab.magnetic-marten.com` names
- Traefik terminates and routes internal HTTPS traffic on `192.168.10.120`
- public apps are split between:
  - Cloudflare Tunnel: `docs`, `homepage`, `n8n`
  - direct ingress / DNS-only: `share`

## Current Limitation

The homelab stack has not yet been moved to a dedicated `Servers/Homelab` VLAN. Today it still shares `Home Network` with trusted client devices.
