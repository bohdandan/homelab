packer {
  required_plugins {
    proxmox = {
      source  = "github.com/hashicorp/proxmox"
      version = ">= 1.2.2"
    }
  }
}

source "proxmox-iso" "ubuntu_k3s" {
  proxmox_url              = var.proxmox_api_url
  username                 = var.proxmox_api_token_id
  token                    = var.proxmox_api_token_secret
  insecure_skip_tls_verify = true
  node                     = var.proxmox_node

  vm_id                = var.template_vmid
  vm_name              = var.template_name
  template_description = "Ubuntu 24.04 template for K3s nodes"
  os                   = "l26"
  tags                 = "ubuntu;k3s;template"

  communicator = "ssh"
  ssh_host     = var.ssh_host
  ssh_username = var.ssh_username
  ssh_password = var.ssh_password
  ssh_timeout  = "30m"

  qemu_agent      = false
  cores           = var.cores
  cpu_type        = "host"
  memory          = var.memory
  scsi_controller = "virtio-scsi-single"
  task_timeout    = "40m"
  http_directory  = "server"
  boot_wait       = "10s"

  boot_iso {
    type             = "ide"
    iso_url          = var.iso_url
    iso_checksum     = var.iso_checksum
    iso_storage_pool = var.proxmox_iso_storage
    iso_download_pve = true
    unmount          = true
  }

  additional_iso_files {
    cd_files = [
      "./runtime/meta-data",
      "./runtime/user-data",
    ]
    cd_label         = "cidata"
    iso_storage_pool = var.proxmox_iso_storage
    unmount          = true
  }

  network_adapters {
    model  = "virtio"
    bridge = var.proxmox_bridge
  }

  disks {
    disk_size    = var.disk_size
    storage_pool = var.proxmox_vm_storage
    type         = "scsi"
    format       = "raw"
  }

  boot_command = [
    "<enter><wait3s>",
    "c",
    "<wait3s>",
    "linux /casper/vmlinuz autoinstall ds=nocloud\\;s=/cidata/ ---",
    "<enter><wait3s>",
    "initrd /casper/initrd",
    "<enter><wait3s>",
    "boot",
    "<enter>",
    "<wait45s>yes<enter>",
  ]
}

build {
  sources = ["source.proxmox-iso.ubuntu_k3s"]

  provisioner "shell" {
    inline = [
      "while [ ! -f /var/lib/cloud/instance/boot-finished ]; do echo 'waiting for cloud-init'; sleep 5; done",
      "sudo systemctl start qemu-guest-agent || true",
    ]
  }

  provisioner "shell" {
    script = "scripts/setup.sh"
  }

  provisioner "shell" {
    script = "scripts/harden.sh"
  }

  provisioner "shell" {
    script = "scripts/cleanup.sh"
  }
}
