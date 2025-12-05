# K3s Node Module - Outputs

output "vm_id" {
  description = "Proxmox VM ID"
  value       = proxmox_vm_qemu.k3s_node.vmid
}

output "vm_name" {
  description = "VM name"
  value       = proxmox_vm_qemu.k3s_node.name
}

output "ip_address" {
  description = "IP address of the VM"
  value       = proxmox_vm_qemu.k3s_node.default_ipv4_address
}

output "node_type" {
  description = "Type of node (master/worker)"
  value       = var.node_type
}

output "ansible_host" {
  description = "Ansible host configuration"
  value = {
    name         = var.node_name
    ansible_host = proxmox_vm_qemu.k3s_node.default_ipv4_address
    node_type    = var.node_type
  }
}
