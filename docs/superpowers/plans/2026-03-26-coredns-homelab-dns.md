# CoreDNS Homelab DNS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an internal CoreDNS service in K3s that serves `homelab.magnetic-marten.com`, provides a wildcard LAN DNS path for Traefik-hosted apps, and preserves explicit host overrides for non-Traefik systems.

**Architecture:** Deploy a standalone CoreDNS workload with a dedicated MetalLB IP. Serve `homelab.magnetic-marten.com` from a zone file with a wildcard to the Traefik VIP and explicit records for Proxmox, HAOS, and K3s nodes. Extend app ingresses so Homepage and n8n answer on LAN-only `*.homelab.magnetic-marten.com` hosts.

**Tech Stack:** Ansible, K3s, Kubernetes manifests, MetalLB, CoreDNS

---

### Task 1: Add CoreDNS configuration inputs

**Files:**
- Modify: `ansible/group_vars/all/main.yml`

- [ ] Add internal DNS hostnames and CoreDNS deployment settings.
- [ ] Keep public hostnames unchanged for Cloudflare/Tunnel flows.
- [ ] Record the dedicated CoreDNS MetalLB IP and wildcard target IP.

### Task 2: Add CoreDNS manifests

**Files:**
- Create: `kubernetes/base/coredns/manifests.yaml.j2`

- [ ] Add a `dns` namespace, ConfigMap, Deployment, and `LoadBalancer` Service.
- [ ] Configure CoreDNS to serve `homelab.magnetic-marten.com` from a zone file.
- [ ] Add wildcard `*.homelab.magnetic-marten.com -> 192.168.10.120`.
- [ ] Add explicit A records for `ha`, `proxmox`, `haos`, `k3s-control`, and `k3s-worker`.
- [ ] Forward non-homelab DNS queries upstream to `192.168.10.1`.

### Task 3: Extend LAN ingress hosts

**Files:**
- Modify: `kubernetes/base/homepage/manifests.yaml.j2`
- Modify: `kubernetes/base/n8n/manifests.yaml.j2`

- [ ] Add LAN-only ingress hosts for `homepage.homelab.magnetic-marten.com` and `n8n.homelab.magnetic-marten.com`.
- [ ] Update Homepage allowed hosts so both public and LAN hostnames work.
- [ ] Keep public hostnames and Cloudflare behavior unchanged.

### Task 4: Wire CoreDNS into the deployment playbook

**Files:**
- Modify: `ansible/playbooks/40-deploy-apps.yml`

- [ ] Render and apply the CoreDNS manifest during app deployment.
- [ ] Wait for the CoreDNS rollout to complete before secret-dependent workloads.
- [ ] Keep the deployment order compatible with MetalLB and Traefik.

### Task 5: Document and verify

**Files:**
- Modify: `README.md`

- [ ] Document the UniFi `Forward Domain` entry pointing `homelab.magnetic-marten.com` to the CoreDNS service IP.
- [ ] Verify LAN DNS resolution through CoreDNS.
- [ ] Verify `homepage.homelab...`, `n8n.homelab...`, and `ha.homelab...` over the Traefik VIP.
