# K3s Node Module - Main Configuration

terraform {
  required_providers {
    proxmox = {
      source  = "telmate/proxmox"
      version = "~> 2.9"
    }
  }
}

resource "proxmox_vm_qemu" "k3s_node" {
  name        = var.node_name
  target_node = var.proxmox_node
  clone       = var.vm_template
  vmid        = var.vm_id

  # VM Settings
  agent   = 1
  os_type = "cloud-init"

  # CPU Configuration
  cores   = var.cpu_cores
  sockets = 1
  cpu     = "host"

  memory   = var.memory
  scsihw   = "virtio-scsi-pci"
  bootdisk = "scsi0"

  # Disk Configuration
  disk {
    type    = "scsi"
    storage = var.vm_storage
    size    = var.disk_size
    slot    = 0
  }

  # Network Configuration
  network {
    model  = "virtio"
    bridge = "vmbr0"
  }

  lifecycle {
    ignore_changes = [
      network,
    ]
  }

  # Cloud-init Configuration
  ipconfig0 = "ip=dhcp"

  nameserver   = var.nameserver
  searchdomain = var.searchdomain

  sshkeys = <<EOF
  ${var.ssh_public_key}
  EOF

  # Cloud-init user config
  cicustom = "user=local:snippets/${var.node_name}-user-data.yml"

  # Tags
  tags = join(";", [
    "k3s",
    var.node_type,
    "ubuntu"
  ])
}
