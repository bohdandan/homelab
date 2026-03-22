# Proxmox Stack

This stack provisions:

- `k3s-control-01`
- `k3s-worker-01`
- `haos-01`

Inputs are rendered by Ansible to `terraform.tfvars.json`.

The Home Assistant OS VM is cloned from a Proxmox template prepared by Ansible on the Proxmox host before `tofu apply`.
