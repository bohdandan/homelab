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

## Target Layout

Recommended target segmentation for growth:

| Name | VLAN | Target subnet | Intended role |
|---|---:|---|---|
| `Home Network` | `10` | `192.168.10.0/24` | Trusted user devices such as laptops, phones, and tablets. |
| `Camera Network` | `20` | `192.168.20.0/24` | Cameras and any camera-adjacent gear. Keep tightly restricted. |
| `IOT Network` | `30` | `192.168.30.0/24` or `192.168.30.0/23` | General IoT devices. Expand to `/23` if device count grows substantially. |
| `Guest Network` | `40` | `192.168.40.0/24` | Internet-only guest devices. |
| `Servers/Homelab` | `50` | `192.168.50.0/24` | Proxmox, K3s nodes, HAOS, dev VM, and MetalLB service IPs. |
| `Management Network` | `254` | `192.168.254.0/24` | UniFi infrastructure management only. |

## Target Homelab Placement

When the homelab is moved to a dedicated server segment, the intended layout is:

- `Servers/Homelab` becomes the only network for Proxmox, K3s nodes, HAOS, the dev/admin VM, and fixed homelab service IPs.
- `Home Network` stays for trusted user endpoints only.
- `IOT Network` becomes the main landing zone for future smart-home devices rather than adding them to `Home Network`.

## Target Addressing Convention

Recommended addressing once the dedicated server VLAN exists:

- reserve low addresses for gateways and network infrastructure
- keep a large DHCP pool for client-oriented VLANs such as `Home`, `IoT`, and `Guest`
- use fixed IPs or DHCP reservations for `Servers/Homelab`
- keep MetalLB service IPs grouped in a small contiguous range on the server VLAN

Example server-side convention:

- `192.168.50.100+` - fixed homelab infrastructure
- `192.168.50.120-192.168.50.129` - MetalLB service IPs

## Target Policy

Recommended inter-network policy:

- `IoT -> Internet`: allow
- `IoT -> Home/Servers/Management`: deny by default
- `Home -> IoT`: allow only as required for control flows
- `Home Assistant -> IoT`: allow
- `Guest -> LAN`: deny
- `Cameras -> Internet`: deny or tightly restrict
- `Management`: reachable only from trusted admin devices

For discovery-heavy smart-home protocols, enable mDNS only between the networks that actually need it, rather than across the whole environment.
