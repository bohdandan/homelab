# Pi-hole VM Module - Main Configuration

terraform {
  required_providers {
    proxmox = {
      source  = "telmate/proxmox"
      version = "3.0.2-rc06"
    }
  }
}

resource "proxmox_vm_qemu" "pihole" {
  name        = var.vm_name
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
  # Use static IP if provided, otherwise DHCP
  ipconfig0 = var.static_ip != "" ? "ip=${var.static_ip},gw=${var.gateway}" : "ip=dhcp"

  nameserver = var.nameserver

  sshkeys = <<EOF
  ${var.ssh_public_key}
  EOF

  description = "Pi-hole DNS Server"

  tags = join(";", [
    "pihole",
    "dns",
    "ubuntu"
  ])
}
