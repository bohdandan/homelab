# Dev/Admin VM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated Ubuntu VM for homelab administration and coding, reachable on the LAN and over Tailscale SSH, with a `dev` user, a prepared workspace, and the requested CLI tooling.

**Architecture:** Reuse the existing Ubuntu cloud-init template and Proxmox/OpenTofu module path used for K3s nodes, but provision the VM as a separate `dev_admin` host with its own generated inventory and cloud-init network snippet. Configure the guest with Ansible after provisioning, install the requested tools with distro packages plus the official Codex npm package, and publish the VM in LAN DNS through the existing CoreDNS zone.

**Tech Stack:** OpenTofu, Proxmox, Ansible, Ubuntu 24.04 cloud-init, CoreDNS, Node.js/npm, Tailscale

---

### Task 1: Add VM provisioning and inventory support

**Files:**
- Modify: `ansible/group_vars/all/main.yml`
- Modify: `ansible/playbooks/20-provision-infra.yml`
- Modify: `ansible/templates/proxmox.terraform.tfvars.json.j2`
- Modify: `ansible/templates/generated.inventory.yml.j2`
- Modify: `opentofu/proxmox/main.tf`
- Modify: `opentofu/proxmox/variables.tf`
- Modify: `opentofu/proxmox/outputs.tf`
- Create: `ansible/tasks/prepare_vm_network_snippet.yml`

- [ ] Add `dev` hostname/IP/sizing/domain variables.
- [ ] Generalize the Proxmox network snippet preparation task so the new Ubuntu VM gets a deterministic cloud-init network config.
- [ ] Extend OpenTofu variables, resources, and outputs to provision `dev-admin-01` from the Ubuntu template.
- [ ] Extend generated inventory so Ansible gets a `dev_admin` group and LAN connection details.
- [ ] Verify with `tofu validate` and `ansible-playbook --syntax-check ansible/playbooks/20-provision-infra.yml`.

### Task 2: Configure the dev/admin VM

**Files:**
- Modify: `ansible/playbooks/site.yml`
- Create: `ansible/playbooks/35-configure-dev-admin.yml`
- Create: `ansible/templates/dev-first-login.sh.j2`

- [ ] Wait for the new VM to accept SSH.
- [ ] Create the `dev` user with the existing SSH public key for remote login.
- [ ] Install the requested tools: `codex`, `eza`, `lazygit`, `helix`, plus the homelab admin toolchain (`git`, `gh`, `ansible`, `kubectl`, `helm`, `sops`, `age`, `tailscale`, markdown reader).
- [ ] Create `/home/dev/workspace`.
- [ ] Write a first-login script with the manual handoff steps: `sudo tailscale up`, `codex --login`, and optional repo bootstrap commands.
- [ ] Verify with `ansible-playbook --syntax-check ansible/playbooks/35-configure-dev-admin.yml`.

### Task 3: Publish LAN DNS and docs

**Files:**
- Modify: `kubernetes/base/coredns/manifests.yaml.j2`
- Modify: `README.md`

- [ ] Add `dev.homelab.magnetic-marten.com -> 192.168.10.113` to CoreDNS.
- [ ] Document the new VM in topology, LAN DNS, and execution flow notes.
- [ ] Re-apply app manifests so CoreDNS picks up the new record.

### Task 4: Execute and verify

**Files:**
- Runtime outputs only

- [ ] Run `ansible-playbook ansible/playbooks/20-provision-infra.yml`.
- [ ] Run `ansible-playbook ansible/playbooks/35-configure-dev-admin.yml`.
- [ ] Run `ansible-playbook ansible/playbooks/40-deploy-apps.yml`.
- [ ] Verify VM reachability, package installation, workspace/script creation, and LAN DNS resolution.
- [ ] Commit and push the verified changes on the current feature branch.
