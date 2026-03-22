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

variable "proxmox_tls_insecure" {
  type    = bool
  default = true
}

variable "proxmox_node" {
  type = string
}

variable "vm_storage" {
  type = string
}

variable "cloudinit_storage" {
  type = string
}

variable "snippets_storage" {
  type = string
}

variable "network_bridge" {
  type = string
}

variable "nameserver" {
  type = string
}

variable "searchdomain" {
  type = string
}

variable "gateway" {
  type = string
}

variable "cidr_prefix" {
  type = number
}

variable "ssh_public_key" {
  type = string
}

variable "ssh_user" {
  type    = string
  default = "ubuntu"
}

variable "k3s_template" {
  type = string
}

variable "haos_template_vmid" {
  type = number
}

variable "k3s_control" {
  type = object({
    vmid         = number
    name         = string
    ip           = string
    memory       = number
    cores        = number
    disk_size_gb = number
  })
}

variable "k3s_worker" {
  type = object({
    vmid         = number
    name         = string
    ip           = string
    memory       = number
    cores        = number
    disk_size_gb = number
  })
}

variable "haos" {
  type = object({
    vmid         = number
    name         = string
    desired_ip   = string
    memory       = number
    cores        = number
    disk_size_gb = string
    mac_address  = string
  })
}
