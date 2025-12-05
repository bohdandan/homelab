# GitOps Applications

This directory contains Kubernetes manifests for all homelab applications deployed via ArgoCD.

## Structure

```
applications/
├── *.yaml                    # ArgoCD Application definitions
└── */                        # Application manifests
    └── manifests.yaml        # K8s resources
```

## Available Applications

**Productivity**
- `home-assistant/` - Smart home automation platform
- `n8n/` - Workflow automation and integration
- `nextcloud/` - File storage and collaboration
- `homepage/` - Homelab dashboard (https://gethomepage.dev)

**AI & Development**
- `ollama/` - Local LLM inference with OpenWebUI

**Monitoring**
- `uptime-kuma/` - Uptime and status monitoring
- `monitoring/` - Prometheus, Grafana, Loki (managed by Ansible)

**Infrastructure**
- `velero/` - Backup and disaster recovery

## Adding New Applications

1. Create directory: `applications/<app-name>/`
2. Add manifests: `applications/<app-name>/manifests.yaml`
3. Create ArgoCD app: `applications/<app-name>.yaml`
4. Commit and push - ArgoCD will auto-sync

## Bootstrap

The bootstrap process uses the Application-of-Applications pattern:
- `bootstrap/root-app.yaml` watches this directory
- Any new `*.yaml` file here becomes an ArgoCD Application
- All apps auto-sync on Git changes
