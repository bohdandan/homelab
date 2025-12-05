# Homelab Quick Start Guide

## Prerequisites Checklist

- [ ] Proxmox VE 8.x installed on hardware
- [ ] Network configured with DHCP
- [ ] Workstation with Homebrew (macOS) or apt (Linux)
- [ ] SSH access to Proxmox host
- [ ] Git repository for homelab code (this repo)

## Step-by-Step Deployment

### 1. Install Dependencies

```bash
# Install Taskfile (if not already installed)
brew install go-task

# Install all required tools
task workstation:install
```

This installs:
- Packer
- OpenTofu
- Ansible
- kubectl
- Helm
- argocd CLI

### 2. Proxmox Setup

```bash
# Run interactive Proxmox configuration
task proxmox:setup
```

This will:
- Set up SSH key authentication
- Create Proxmox user for OpenTofu with proper permissions
- Generate API token
- Update `.env` file with credentials

### 3. Configure Variables

Edit `opentofu/terraform.tfvars`:

```hcl
# Update SSH public key
ssh_public_key = <<-EOT
ssh-rsa AAAAB3Nza... your-key-here
EOT

# Adjust resources if needed
k3s_master_cpu_cores = 4
k3s_master_memory    = 8192

# Single-node or multi-node
worker_count = 1  # 0 for single-node
```

### 4. Deploy Everything

```bash
# One command to rule them all
task bootstrap
```

This will:
1. **Build VM template** (~15 min)
   - Downloads Ubuntu 24.04 ISO
   - Creates cloud-init template with QEMU agent
   - Hardens OS and prepares for K8s
   
2. **Provision VMs** (~5 min)
   - Creates K3s master node
   - Creates worker node(s) if configured
   - Generates Ansible inventory
   
3. **Configure Cluster** (~10 min)
   - Installs K3s on all nodes
   - Deploys MetalLB load balancer
   - Installs Ingress-NGINX
   - Sets up cert-manager
   - Installs monitoring stack (Prometheus + Grafana + Loki)
   - Deploys ArgoCD for GitOps
   - Configures Velero for backups
   
4. **Deploy Applications** (~10 min)
   - ArgoCD syncs all applications from Git
   - Deploys Home Assistant, n8n, Homepage, etc.

**Total time**: 40-50 minutes

### 5. Access Your Services

Add to your `/etc/hosts` (or configure local DNS):

```bash
# Get MetalLB LoadBalancer IPs
kubectl get svc -A | grep LoadBalancer

# Add entries
<INGRESS_IP> home.homelab.local
<INGRESS_IP> n8n.homelab.local
<INGRESS_IP> dashboard.homelab.local
<ARGOCD_IP> argocd.homelab.local
```

Then access:
- **Homepage Dashboard**: https://dashboard.homelab.local
- **Home Assistant**: https://home.homelab.local
- **n8n**: https://n8n.homelab.local
- **ArgoCD**: Get password with `task gitops:login`
- **Grafana**: `kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80`

## Verification

```bash
# Check cluster nodes
export KUBECONFIG=./kubeconfig
kubectl get nodes

# Check all pods
kubectl get pods -A

# Check ArgoCD applications
task gitops:status

# Check ingress
kubectl get ingress -A
```

## Troubleshooting

### Packer build fails
- Check Proxmox UI for VM console
- Verify network connectivity
- Ensure ISO downloads successfully

### OpenTofu apply fails
- Verify API token: `task proxmox:setup`
- Check Proxmox storage availability
- Ensure template exists after Packer build

### Ansible fails to connect
- Test SSH: `task ansible:ping`
- Check inventory: `task ansible:list-hosts`
- Verify VMs have IP addresses in Proxmox

### Applications not deploying
- Check ArgoCD: `task gitops:status`
- View ArgoCD UI for detailed errors
- Force sync: `task gitops:sync`

## Next Steps

1. **Customize applications**: Edit `gitops/applications/*/manifests.yaml`
2. **Add new services**: Create new manifests and ArgoCD Application
3. **Configure backups**: Set up S3-compatible storage for Velero
4. **Monitor**: Access Grafana dashboards
5. **Secure**: Configure Let's Encrypt for production certificates

## Useful Commands

```bash
# Get kubeconfig
task ansible:get-kubeconfig

# Destroy everything (careful!)
task destroy

# Rebuild just VMs
task opentofu:destroy-confirm
task opentofu:apply

# Re-run Ansible
task ansible:run

# Check specific playbook
task ansible:run-playbook -- playbooks/03-networking.yml
```

## Support

For issues or questions:
1. Check logs: `kubectl logs -n <namespace> <pod>`
2. Review task output carefully
3. Consult service-specific documentation
4. Open GitHub issue with details

---

**Happy homelabbing!** 🚀
