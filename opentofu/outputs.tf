# K3s Master Outputs
output "k3s_master_ip" {
  description = "K3s master node IP address"
  value       = module.k3s_master.ip_address
}

output "k3s_master_id" {
  description = "K3s master VM ID"
  value       = module.k3s_master.vm_id
}

# K3s Worker Outputs
output "k3s_worker_ips" {
  description = "K3s worker node IP addresses"
  value       = module.k3s_worker[*].ip_address
}

output "k3s_worker_ids" {
  description = "K3s worker VM IDs"
  value       = module.k3s_worker[*].vm_id
}



# Cluster Summary
output "cluster_summary" {
  description = "Summary of all cluster nodes"
  value = {
    master = {
      name = module.k3s_master.vm_name
      ip   = module.k3s_master.ip_address
      id   = module.k3s_master.vm_id
    }
    workers = [
      for worker in module.k3s_worker : {
        name = worker.vm_name
        ip   = worker.ip_address
        id   = worker.vm_id
      }
    ]
  }
}

# Ansible Inventory Data
output "ansible_inventory_data" {
  description = "Data for Ansible inventory generation"
  value = {
    k3s_master  = module.k3s_master.ansible_host
    k3s_workers = module.k3s_worker[*].ansible_host
  }
  sensitive = false
}

# MetalLB Configuration
output "metallb_ip_range" {
  description = "MetalLB IP range for load balancer"
  value       = var.metallb_ip_range
}
