# K3s Node Module - Main Configuration

terraform {
  required_providers {
    proxmox = {
      source  = "telmate/proxmox"
      version = "3.0.2-rc06"
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

  cpu {
    cores   = var.cpu_cores
    sockets = 1
    type    = "host"
  }

  memory   = var.memory
  scsihw   = "virtio-scsi-pci"
  bootdisk = "scsi0"

  # Disk Configuration
  disks {
    scsi {
      scsi0 {
        disk {
          size    = var.disk_size
          storage = var.vm_storage
        }
      }
    }
  }

  # Network Configuration
  network {
    id     = 0
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

  # Set description based on node type
  description = var.node_type == "master" ? "K3s Master Node" : "K3s Worker Node"

  # Tags
  tags = join(";", [
    "k3s",
    var.node_type,
    "ubuntu"
  ])
}
