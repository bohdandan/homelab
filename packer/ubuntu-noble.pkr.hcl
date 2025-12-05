# Ubuntu Noble (24.04) Packer Template for Proxmox

packer {
  required_plugins {
    proxmox = {
      version = ">= 1.1.8"
      source  = "github.com/hashicorp/proxmox"
    }
  }
}

source "proxmox-iso" "ubuntu-noble" {
  # Proxmox Connection
  proxmox_url              = var.proxmox_api_url
  username                 = var.proxmox_api_token_id
  token                    = var.proxmox_api_token_secret
  insecure_skip_tls_verify = true
  node                     = var.proxmox_node
  
  # VM Settings
  vm_id                = var.vm_id
  vm_name              = var.vm_name
  template_description = var.vm_name
  os                   = "l26"
  
  # Communication
  communicator            = "ssh"
  ssh_username            = var.ssh_username
  ssh_password            = var.ssh_password
  ssh_timeout             = "30m"
  
  # Hardware
  qemu_agent              = true
  cores                   = 6
  cpu_type                = "host"
  memory                  = 8192
  scsi_controller         = "virtio-scsi-single"
  
  # Timing
  tags                    = var.vm_name
  task_timeout            = "30m"
  http_directory          = "server"
  boot_wait               = "10s"

  boot_iso {
    type             = "ide"
    iso_url          = var.iso_url
    unmount          = true
    iso_checksum     = var.iso_checksum
    iso_storage_pool = "local"
    iso_download_pve = true
  }

  additional_iso_files {
    cd_files = [
      "./server/meta-data",
      "./server/user-data"
    ]
    cd_label         = "cidata"
    iso_storage_pool = "local"
    unmount          = true
  }

  network_adapters {
    model  = "virtio"
    bridge = "vmbr0"
  }

  disks {
    disk_size    = "30G"
    storage_pool = "local-lvm"
    type         = "scsi"
    format       = "raw"
  }
  
  boot_command = [
    "c", "<wait3s>",
    "linux /casper/vmlinuz --- autoinstall s=/cidata/", "<enter><wait3s>",
    "initrd /casper/initrd", "<enter><wait3s>",
    "boot", "<enter>"
  ]
}

build {
  sources = ["source.proxmox-iso.ubuntu-noble"]

  # Wait for cloud-init to finish
  provisioner "shell" {
    inline = [
      "while [ ! -f /var/lib/cloud/instance/boot-finished ]; do echo 'Waiting for cloud-init...'; sleep 1; done",
      "sudo systemctl enable qemu-guest-agent",
      "sudo systemctl start qemu-guest-agent",
      "sudo cloud-init clean"
    ]
  }

  # Run setup script
  provisioner "shell" {
    script = "scripts/setup.sh"
  }

  # Run hardening script
  provisioner "shell" {
    script = "scripts/harden.sh"
  }

  # Run cleanup script
  provisioner "shell" {
    script = "scripts/cleanup.sh"
  }

  # Final message
  post-processor "shell-local" {
    inline = [
      "echo '✅ Template ${var.vm_name} built successfully!'"
    ]
  }
}
