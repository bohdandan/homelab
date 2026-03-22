variable "proxmox_node" {
  type = string
}

variable "source_template" {
  type = string
}

variable "vm_storage" {
  type = string
}

variable "cloudinit_storage" {
  type = string
}

variable "network_config_volume" {
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
  type = string
}

variable "vmid" {
  type = number
}

variable "node_name" {
  type = string
}

variable "ip_address" {
  type = string
}

variable "memory" {
  type = number
}

variable "cores" {
  type = number
}

variable "disk_size_gb" {
  type = number
}

variable "tags" {
  type = list(string)
}
