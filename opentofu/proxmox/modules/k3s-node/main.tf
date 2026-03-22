terraform {
  required_providers {
    proxmox = {
      source = "telmate/proxmox"
    }
  }
}

resource "proxmox_vm_qemu" "node" {
  name               = var.node_name
  target_node        = var.proxmox_node
  clone              = var.source_template
  vmid               = var.vmid
  full_clone         = true
  start_at_node_boot = true
  agent              = 1
  os_type            = "cloud-init"

  cores    = var.cores
  sockets  = 1
  memory   = var.memory
  scsihw   = "virtio-scsi-pci"
  bootdisk = "scsi0"

  disks {
    scsi {
      scsi0 {
        disk {
          storage = var.vm_storage
          size    = var.disk_size_gb
        }
      }
    }

    ide {
      ide2 {
        cloudinit {
          storage = var.cloudinit_storage
        }
      }
    }
  }

  network {
    id     = 0
    model  = "virtio"
    bridge = var.network_bridge
  }

  cicustom     = "network=${var.network_config_volume}"
  ciuser       = var.ssh_user
  sshkeys      = var.ssh_public_key
  nameserver   = var.nameserver
  searchdomain = var.searchdomain
  tags         = join(";", var.tags)
}
