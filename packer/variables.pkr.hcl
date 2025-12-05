# Packer Variables for Ubuntu Noble (24.04) Template

variable "proxmox_api_url" {
  type        = string
  description = "Proxmox API URL"
}

variable "proxmox_api_token_id" {
  type        = string
  description = "Proxmox API Token ID"
}

variable "proxmox_api_token_secret" {
  type        = string
  description = "Proxmox API Token Secret"
  sensitive   = true
}

variable "proxmox_node" {
  type        = string
  description = "Proxmox node name"
  default     = "pve"
}

variable "iso_url" {
  type        = string
  description = "URL to download the Ubuntu ISO"
  default     = "https://releases.ubuntu.com/24.04.3/ubuntu-24.04.3-live-server-amd64.iso"
}

variable "iso_checksum" {
  type        = string
  description = "Checksum for ISO validation (format: sha256:hash)"
  default     = "sha256:c3514bf0056180d09376462a7a1b4f213c1d6e8ea67fae5c25099c6fd3d8274b"
}

variable "vm_id" {
  type        = number
  description = "VM ID for the template"
  default     = 9000
}

variable "vm_name" {
  type        = string
  description = "VM template name"
  default     = "ubuntu-noble-template"
}

variable "ssh_username" {
  type        = string
  description = "SSH username for provisioning"
  default     = "ubuntu"
}

variable "ssh_password" {
  type        = string
  description = "SSH password for provisioning (temporary)"
  default     = "ubuntu"
  sensitive   = true
}
