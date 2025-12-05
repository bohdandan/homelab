# Pi-hole VM Module - Outputs

output "vm_id" {
  description = "Proxmox VM ID"
  value       = proxmox_vm_qemu.pihole.vmid
}

output "vm_name" {
  description = "VM name"
  value       = proxmox_vm_qemu.pihole.name
}

output "ip_address" {
  description = "IP address of the Pi-hole VM"
  value       = proxmox_vm_qemu.pihole.default_ipv4_address
}

output "ansible_host" {
  description = "Ansible host configuration"
  value = {
    name         = var.vm_name
    ansible_host = proxmox_vm_qemu.pihole.default_ipv4_address
  }
}
