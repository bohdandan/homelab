# K3s Master Node
module "k3s_master" {
  source = "./modules/k3s-node"

  node_name      = var.k3s_master_name
  node_type      = "master"
  proxmox_node   = var.proxmox_node
  vm_template    = var.vm_template
  vm_storage     = var.vm_storage
  ssh_public_key = var.ssh_public_key

  cpu_cores = var.k3s_master_cpu_cores
  memory    = var.k3s_master_memory
  disk_size = var.k3s_master_disk_size

  nameserver   = var.nameserver
  searchdomain = var.searchdomain
}

# K3s Worker Nodes (optional, controlled by worker_count)
module "k3s_worker" {
  source = "./modules/k3s-node"
  count  = var.worker_count

  node_name      = "${var.k3s_worker_name_prefix}-${count.index + 1}"
  node_type      = "worker"
  proxmox_node   = var.proxmox_node
  vm_template    = var.vm_template
  vm_storage     = var.vm_storage
  ssh_public_key = var.ssh_public_key

  cpu_cores = var.k3s_worker_cpu_cores
  memory    = var.k3s_worker_memory
  disk_size = var.k3s_worker_disk_size

  nameserver   = var.nameserver
  searchdomain = var.searchdomain
}
