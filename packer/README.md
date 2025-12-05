# Packer Ubuntu Noble Template

This directory contains Packer configuration to build Ubuntu 24.04 (Noble) VM templates for Proxmox VE.

## Quick Start

### 1. Configure Environment

Ensure your `.env` file in the project root has the required Proxmox credentials:

```bash
PROXMOX_HOST=192.168.10.100
PROXMOX_NODE=pve
PROXMOX_API_TOKEN_ID=terraform@pve!opentofu
PROXMOX_API_TOKEN_SECRET=your-secret-here
```

### 2. Build Template

```bash
# From project root
task packer:build
```

## What Gets Built

The template includes:

- **OS**: Ubuntu 24.04.3 LTS Server
- **VM ID**: 9000
- **Disk**: 30GB raw on local-lvm (expandable)
- **Memory**: 8GB
- **CPU**: 6 cores, host type
- **Network**: VirtIO on vmbr0 with DHCP
- **Features**:
  - Cloud-init ready
  - QEMU Guest Agent installed and enabled
  - SSH server configured (password authentication enabled for provisioning)
  - Automatic package updates during build
  - Security hardening applied
  - Template cleaned for cloning

## Files

```
packer/
├── ubuntu-noble.pkr.hcl    # Main Packer template
├── variables.pkr.hcl       # Variable definitions
├── Taskfile.yaml           # Build automation
├── server/                 # Autoinstall files
│   ├── user-data          # Cloud-config for autoinstall
│   └── meta-data          # Cloud-init metadata (empty)
└── scripts/               # Provisioning scripts
    ├── setup.sh           # Package installation & config
    ├── harden.sh          # Security hardening
    └── cleanup.sh         # Template cleanup
```

## Build Process

1. **Initialize** Packer plugins
2. **Validate** configuration
3. **Create VM** (ID 9000)
4. **Download ISO** to Proxmox (automatic via `iso_download_pve`)
5. **Boot** with autoinstall configuration from cidata ISO
6. **Autoinstall** runs (~5-10 minutes)
   - Partitions disk (direct layout, no LVM)
   - Installs Ubuntu and base packages
   - Configures user: `ubuntu` / `ubuntu`
   - Enables SSH and QEMU guest agent
7. **Reboot** after installation
8. **Provisioning** scripts run via SSH
   - Updates packages
   - Installs utilities
   - Applies security hardening
   - Cleans up for template usage
9. **Convert to Template**

Total build time: **15-25 minutes** (depends on internet speed for ISO download)

## Available Tasks

```bash
# Validate configuration
task packer:validate

# Build template
task packer:build
```

## Customization

### Change VM Settings

Edit `variables.pkr.hcl` defaults or modify hardcoded values in `ubuntu-noble.pkr.hcl`:
- VM ID (default: 9000)
- Template name (default: ubuntu-noble-template)
- CPU cores (currently: 6)
- Memory (currently: 8192 MB)
- Disk size (currently: 30G)

### Modify Autoinstall

Edit `server/user-data` to customize the Ubuntu installation:
- Add/remove packages
- Change disk partitioning layout
- Modify user configuration
- Adjust locale/keyboard settings

### Add Provisioning Steps

Edit scripts in `scripts/` or add new provisioner blocks in `ubuntu-noble.pkr.hcl`.

## Troubleshooting

### ISO Download Fails

If Proxmox can't download the ISO automatically:
- Check Proxmox server internet connectivity
- Verify the ISO URL is accessible
- Manually download to `/var/lib/vz/template/iso/` on Proxmox

### SSH Timeout

If Packer times out waiting for SSH:
1. Check the VM console in Proxmox Web UI
2. Verify autoinstall completed successfully (look for "Autoinstall complete!" message)
3. Ensure the VM rebooted (not powered off)
4. Check that hostname was set correctly
5. Verify network connectivity and DHCP

### Storage Errors

- **ISOs must use directory storage**: `local` (not `local-lvm`)
- **VM disks use block storage**: `local-lvm`
- Ensure both storage pools exist and are active

### Cloud-Init Not Applied

If hostname or credentials are wrong:
- Check VM console for cloud-init errors
- Verify the cidata ISO was created and mounted
- Review `/var/log/cloud-init.log` in the VM

## Using the Template

After the template is built, clone it to create new VMs:

```bash
# Via Proxmox CLI
qm clone 9000 100 --name my-vm --full

# Or use OpenTofu/Terraform
cd opentofu
tofu apply
```

Cloud-init will customize the VM on first boot based on your configuration.

## Technical Notes

- **autoinstall data source**: Uses cidata ISO (CDROM method) for cloud-init
- **Boot command**: Manual GRUB commands to pass autoinstall parameters
- **Storage**: ISOs on `local`, disks on `local-lvm`
- **Network**: Connects to default bridge `vmbr0`
- **OS type**: `l26` (Linux 2.6+ kernel)
