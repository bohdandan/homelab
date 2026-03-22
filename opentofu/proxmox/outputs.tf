output "k3s_control_ip" {
  value = module.k3s_control.ip_address
}

output "k3s_control_name" {
  value = module.k3s_control.vm_name
}

output "k3s_control_vmid" {
  value = module.k3s_control.vm_id
}

output "k3s_worker_ip" {
  value = module.k3s_worker.ip_address
}

output "k3s_worker_name" {
  value = module.k3s_worker.vm_name
}

output "k3s_worker_vmid" {
  value = module.k3s_worker.vm_id
}

output "haos_name" {
  value = proxmox_vm_qemu.haos.name
}

output "haos_vmid" {
  value = proxmox_vm_qemu.haos.vmid
}

output "haos_mac_address" {
  value = var.haos.mac_address
}

output "ansible_inventory" {
  value = {
    k3s_control = {
      name = module.k3s_control.vm_name
      ip   = module.k3s_control.ip_address
      vmid = module.k3s_control.vm_id
    }
    k3s_worker = {
      name = module.k3s_worker.vm_name
      ip   = module.k3s_worker.ip_address
      vmid = module.k3s_worker.vm_id
    }
    haos = {
      name = proxmox_vm_qemu.haos.name
      ip   = var.haos.desired_ip
      vmid = proxmox_vm_qemu.haos.vmid
      mac  = var.haos.mac_address
    }
  }
}
