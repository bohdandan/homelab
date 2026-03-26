module "k3s_control" {
  source = "./modules/k3s-node"

  proxmox_node      = var.proxmox_node
  vm_storage        = var.vm_storage
  cloudinit_storage = var.cloudinit_storage
  network_config_volume = "${var.snippets_storage}:snippets/${var.k3s_control.name}-network.yaml"
  network_bridge    = var.network_bridge
  nameserver        = var.nameserver
  searchdomain      = var.searchdomain
  gateway           = var.gateway
  cidr_prefix       = var.cidr_prefix
  ssh_public_key    = var.ssh_public_key
  ssh_user          = var.ssh_user
  source_template   = var.k3s_template

  vmid         = var.k3s_control.vmid
  node_name    = var.k3s_control.name
  ip_address   = var.k3s_control.ip
  memory       = var.k3s_control.memory
  cores        = var.k3s_control.cores
  disk_size_gb = var.k3s_control.disk_size_gb
  tags         = ["k3s", "control"]
}

module "k3s_worker" {
  source = "./modules/k3s-node"

  proxmox_node      = var.proxmox_node
  vm_storage        = var.vm_storage
  cloudinit_storage = var.cloudinit_storage
  network_config_volume = "${var.snippets_storage}:snippets/${var.k3s_worker.name}-network.yaml"
  network_bridge    = var.network_bridge
  nameserver        = var.nameserver
  searchdomain      = var.searchdomain
  gateway           = var.gateway
  cidr_prefix       = var.cidr_prefix
  ssh_public_key    = var.ssh_public_key
  ssh_user          = var.ssh_user
  source_template   = var.k3s_template

  vmid         = var.k3s_worker.vmid
  node_name    = var.k3s_worker.name
  ip_address   = var.k3s_worker.ip
  memory       = var.k3s_worker.memory
  cores        = var.k3s_worker.cores
  disk_size_gb = var.k3s_worker.disk_size_gb
  tags         = ["k3s", "worker", "stateful"]
}

module "dev_admin" {
  source = "./modules/k3s-node"

  proxmox_node          = var.proxmox_node
  vm_storage            = var.vm_storage
  cloudinit_storage     = var.cloudinit_storage
  network_config_volume = "${var.snippets_storage}:snippets/${var.dev_admin.name}-network.yaml"
  network_bridge        = var.network_bridge
  nameserver            = var.nameserver
  searchdomain          = var.searchdomain
  gateway               = var.gateway
  cidr_prefix           = var.cidr_prefix
  ssh_public_key        = var.ssh_public_key
  ssh_user              = var.ssh_user
  source_template       = var.k3s_template

  vmid         = var.dev_admin.vmid
  node_name    = var.dev_admin.name
  ip_address   = var.dev_admin.ip
  memory       = var.dev_admin.memory
  cores        = var.dev_admin.cores
  disk_size_gb = var.dev_admin.disk_size_gb
  tags         = ["dev", "admin", "codex"]
}

resource "proxmox_vm_qemu" "haos" {
  name               = var.haos.name
  target_node        = var.proxmox_node
  clone_id           = var.haos_template_vmid
  vmid               = var.haos.vmid
  full_clone         = true
  start_at_node_boot = true
  agent              = 1
  bios               = "ovmf"
  os_type            = "other"

  cores  = var.haos.cores
  memory = var.haos.memory
  scsihw = "virtio-scsi-pci"

  disk {
    slot     = "scsi0"
    type     = "disk"
    storage  = var.vm_storage
    size     = var.haos.disk_size_gb
    iothread = true
  }

  efidisk {
    storage           = var.vm_storage
    efitype           = "4m"
    pre_enrolled_keys = false
  }

  network {
    id      = 0
    model   = "virtio"
    bridge  = var.network_bridge
    macaddr = var.haos.mac_address
  }

  serial {
    id   = 0
    type = "socket"
  }

  vga {
    type = "serial0"
  }

  description = "Home Assistant OS VM. Reserve ${var.haos.desired_ip} on the router using ${var.haos.mac_address}."
  tags        = "home-assistant;haos"
}
