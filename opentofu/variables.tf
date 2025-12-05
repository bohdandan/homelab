# Proxmox Connection Variables
variable "proxmox_api_url" {
  description = "Proxmox API URL"
  type        = string
}

variable "proxmox_api_token_id" {
  description = "Proxmox API Token ID"
  type        = string
}

variable "proxmox_api_token_secret" {
  description = "Proxmox API Token Secret"
  type        = string
  sensitive   = true
}

variable "proxmox_tls_insecure" {
  description = "Skip TLS verification"
  type        = bool
  default     = true
}

# Proxmox Configuration
variable "proxmox_node" {
  description = "Proxmox node name"
  type        = string
  default     = "pve"
}

variable "vm_template" {
  description = "VM template name to clone from (created by Packer)"
  type        = string
  default     = "ubuntu-noble-template"
}

variable "vm_storage" {
  description = "Storage pool for VM disks"
  type        = string
  default     = "local-lvm"
}

variable "ssh_public_key" {
  description = "SSH public key for VM access"
  type        = string
}

# Network Configuration
variable "nameserver" {
  description = "DNS nameserver for VMs"
  type        = string
  default     = "8.8.8.8"
}

variable "searchdomain" {
  description = "DNS search domain"
  type        = string
  default     = "local"
}

# K3s Master Configuration
variable "k3s_master_name" {
  description = "K3s master node name"
  type        = string
  default     = "k3s-master"
}

variable "k3s_master_cpu_cores" {
  description = "CPU cores for K3s master"
  type        = number
  default     = 4
}

variable "k3s_master_memory" {
  description = "Memory in MB for K3s master"
  type        = number
  default     = 8192
}

variable "k3s_master_disk_size" {
  description = "Disk size in GB for K3s master"
  type        = number
  default     = 100
}

# K3s Worker Configuration
variable "worker_count" {
  description = "Number of K3s worker nodes (0 for single-node cluster)"
  type        = number
  default     = 1
}

variable "k3s_worker_name_prefix" {
  description = "Prefix for K3s worker node names"
  type        = string
  default     = "k3s-worker"
}

variable "k3s_worker_cpu_cores" {
  description = "CPU cores for K3s workers"
  type        = number
  default     = 4
}

variable "k3s_worker_memory" {
  description = "Memory in MB for K3s workers"
  type        = number
  default     = 8192
}

variable "k3s_worker_disk_size" {
  description = "Disk size in GB for K3s workers"
  type        = number
  default     = 100
}

# Pi-hole Configuration
variable "enable_pihole" {
  description = "Enable Pi-hole VM deployment"
  type        = bool
  default     = false
}

variable "pihole_vm_name" {
  description = "Pi-hole VM name"
  type        = string
  default     = "pihole"
}

variable "pihole_cpu_cores" {
  description = "CPU cores for Pi-hole"
  type        = number
  default     = 2
}

variable "pihole_memory" {
  description = "Memory in MB for Pi-hole"
  type        = number
  default     = 2048
}

variable "pihole_disk_size" {
  description = "Disk size in GB for Pi-hole"
  type        = number
  default     = 20
}

variable "pihole_static_ip" {
  description = "Static IP for Pi-hole with CIDR (e.g., 192.168.1.10/24). Leave empty for DHCP"
  type        = string
  default     = ""
}

variable "pihole_gateway" {
  description = "Gateway for Pi-hole (required if using static IP)"
  type        = string
  default     = ""
}

variable "pihole_nameserver" {
  description = "Nameserver for Pi-hole"
  type        = string
  default     = "8.8.8.8"
}

# Cluster Configuration
variable "k3s_cluster_token" {
  description = "K3s cluster token for joining nodes"
  type        = string
  sensitive   = true
  default     = ""
}

variable "metallb_ip_range" {
  description = "IP range for MetalLB load balancer (e.g., 192.168.1.200-192.168.1.220)"
  type        = string
  default     = "192.168.1.200-192.168.1.220"
}
