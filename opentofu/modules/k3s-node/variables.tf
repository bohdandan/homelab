# K3s Node Module - Variables

variable "node_name" {
  description = "Name of the node"
  type        = string
}

variable "node_type" {
  description = "Type of node: master or worker"
  type        = string
  validation {
    condition     = contains(["master", "worker"], var.node_type)
    error_message = "Node type must be either 'master' or 'worker'."
  }
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
  default     = 4
}

variable "memory" {
  description = "Memory in MB"
  type        = number
  default     = 8192
}

variable "disk_size" {
  description = "Disk size in GB"
  type        = number
  default     = 100
}

variable "ssh_public_key" {
  description = "SSH public key for VM access"
  type        = string
}

variable "vm_id" {
  description = "VM ID (optional, Proxmox will assign if not provided)"
  type        = number
  default     = null
}

variable "nameserver" {
  description = "DNS nameserver"
  type        = string
  default     = "8.8.8.8"
}

variable "searchdomain" {
  description = "DNS search domain"
  type        = string
  default     = "local"
}
