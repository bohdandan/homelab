variable "proxmox_api_url" {
  type = string
}

variable "proxmox_api_token_id" {
  type = string
}

variable "proxmox_api_token_secret" {
  type      = string
  sensitive = true
}

variable "proxmox_node" {
  type = string
}

variable "proxmox_iso_storage" {
  type = string
}

variable "proxmox_vm_storage" {
  type = string
}

variable "proxmox_bridge" {
  type = string
}

variable "template_name" {
  type    = string
  default = "ubuntu-24-04-k3s-template"
}

variable "template_vmid" {
  type    = number
  default = 9000
}

variable "iso_url" {
  type = string
}

variable "iso_checksum" {
  type = string
}

variable "ssh_username" {
  type    = string
  default = "ubuntu"
}

variable "ssh_host" {
  type = string
}

variable "ssh_password" {
  type      = string
  sensitive = true
}

variable "memory" {
  type    = number
  default = 4096
}

variable "cores" {
  type    = number
  default = 2
}

variable "disk_size" {
  type    = string
  default = "30G"
}
