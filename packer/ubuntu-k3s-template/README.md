# Ubuntu K3s Template

This Packer build creates the Ubuntu 24.04 template used for:

- `k3s-control-01`
- `k3s-worker-01`

The runtime variables file is rendered by Ansible to:

```text
packer/ubuntu-k3s-template/runtime.auto.pkrvars.hcl
```

The installer seed files under `packer/ubuntu-k3s-template/runtime/` are also rendered by
Ansible and are intentionally gitignored because they contain environment-specific values.

Builds are normally executed through:

```bash
ansible-playbook ansible/playbooks/10-build-template.yml
```
