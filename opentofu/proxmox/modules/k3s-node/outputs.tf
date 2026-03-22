output "vm_id" {
  value = proxmox_vm_qemu.node.vmid
}

output "vm_name" {
  value = proxmox_vm_qemu.node.name
}

output "ip_address" {
  value = var.ip_address
}
