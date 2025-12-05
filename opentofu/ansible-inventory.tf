# Generate Ansible Inventory from OpenTofu outputs

resource "local_file" "ansible_inventory" {
  filename = "${path.root}/../ansible/inventory/hosts.yml"

  content = templatefile("${path.module}/templates/inventory.yml.tpl", {
    master_name = module.k3s_master.vm_name
    master_ip   = module.k3s_master.ip_address

    workers = [
      for worker in module.k3s_worker : {
        name         = worker.vm_name
        ansible_host = worker.ip_address
      }
    ]

    pihole           = null # Pi-hole removed
    k3s_token        = var.k3s_cluster_token != "" ? var.k3s_cluster_token : random_password.k3s_token.result
    metallb_ip_range = var.metallb_ip_range
  })

  file_permission = "0644"
}

# Generate K3s cluster token if not provided
resource "random_password" "k3s_token" {
  length  = 32
  special = false
}

# Save cluster token to a file for reference
resource "local_file" "k3s_token" {
  filename        = "${path.root}/.k3s-token"
  content         = var.k3s_cluster_token != "" ? var.k3s_cluster_token : random_password.k3s_token.result
  file_permission = "0600"
}
