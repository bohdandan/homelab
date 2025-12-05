# Pi-hole VM Module - Variables

variable "vm_name" {
  description = "Name of the Pi-hole VM"
  type        = string
  default     = "pihole"
}

variable "proxmox_node" {
  description = "Proxmox node name"
  type        = string
}

variable "vm_template" {
  description = "VM template name to clone from"
  type        = string
}

variable "vm_storage" {
  description = "Storage pool for VM disks"
  type        = string
}

variable "cpu_cores" {
  description = "Number of CPU cores"
  type        = number
  default     = 2
}

variable "memory" {
  description = "Memory in MB"
  type        = number
  default     = 2048
}

variable "disk_size" {
  description = "Disk size in GB"
  type        = number
  default     = 20
}

variable "ssh_public_key" {
  description = "SSH public key for VM access"
  type        = string
}

variable "vm_id" {
  description = "VM ID (optional)"
  type        = number
  default     = null
}

variable "static_ip" {
  description = "Static IP address with CIDR (e.g., 192.168.1.10/24)"
  type        = string
  default     = ""
}

variable "gateway" {
  description = "Default gateway"
  type        = string
  default     = ""
}

variable "nameserver" {
  description = "DNS nameserver"
  type        = string
  default     = "8.8.8.8"
}
