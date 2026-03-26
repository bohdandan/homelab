# Homepage Full-Stack Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Homepage so it shows zero-maintenance blocks for every installed workload, with LAN links for user-facing apps and Kubernetes-backed status/resource cards for internal services.

**Architecture:** Keep the change isolated to the embedded Homepage config in the existing ConfigMap template. Model each workload as a Homepage service card, using LAN `href`/`siteMonitor` only where a real LAN UI exists and using `namespace` plus explicit `podSelector` values for Kubernetes-backed resource/status data.

**Tech Stack:** Ansible, Jinja2, Kubernetes manifests, Homepage

---

### Task 1: Update Homepage Services And Widgets

**Files:**
- Modify: `kubernetes/base/homepage/manifests.yaml.j2`
- Test: render `kubernetes/base/homepage/manifests.yaml.j2` through Ansible with `ansible/tasks/load_context.yml`

- [ ] **Step 1: Re-read the current Homepage config block**

Run:

```bash
sed -n '1,180p' kubernetes/base/homepage/manifests.yaml.j2
```

Expected: the current config only contains Homepage, n8n, Home Assistant, and the basic Kubernetes widget.

- [ ] **Step 2: Replace the embedded `services.yaml` content**

Update the Homepage ConfigMap so `services.yaml` contains exactly these groups:

```yaml
- Apps:
    - n8n:
        href: https://{{ homelab_effective.domain.n8n_internal }}
        siteMonitor: https://{{ homelab_effective.domain.n8n_internal }}/
        description: Automation workflows
        namespace: {{ homelab_effective.apps.n8n.namespace }}
        podSelector: app=n8n
    - Home Assistant:
        href: https://{{ homelab_effective.domain.home_assistant }}
        siteMonitor: https://{{ homelab_effective.domain.home_assistant }}/
        description: Smart home

- Data:
    - Postgres:
        description: n8n database
        namespace: {{ homelab_effective.apps.postgres.namespace }}
        podSelector: app=postgres

- Platform:
    - Cloudflared:
        description: Cloudflare tunnel connector
        namespace: {{ homelab_effective.apps.cloudflared.namespace }}
        podSelector: app=cloudflared
    - CoreDNS:
        description: LAN DNS service
        namespace: {{ homelab_effective.apps.coredns.namespace }}
        podSelector: app=coredns
```

Expected: no Homepage card remains, every installed workload has a card, and only n8n/Home Assistant have LAN links.

- [ ] **Step 3: Expand the embedded `widgets.yaml` content**

Update the Kubernetes widget so cluster and node summaries explicitly show CPU and memory:

```yaml
- kubernetes:
    cluster:
      show: true
      cpu: true
      memory: true
      showLabel: true
      label: cluster
    nodes:
      show: true
      cpu: true
      memory: true
      showLabel: true
      label: nodes
```

Expected: the top-level Homepage widgets remain zero-maintenance while surfacing the most common cluster metrics.

- [ ] **Step 4: Review the manifest diff**

Run:

```bash
git diff -- kubernetes/base/homepage/manifests.yaml.j2
```

Expected: only Homepage config content changes, with no unrelated manifest edits.

### Task 2: Render And Verify The Homepage Manifest

**Files:**
- Test: `kubernetes/base/homepage/manifests.yaml.j2`
- Test helper: temporary playbook under `/tmp`

- [ ] **Step 1: Render the template with the real context loader**

Run:

```bash
cat > ansible/playbooks/.homepage-render.yml <<'EOF'
---
- hosts: localhost
  connection: local
  gather_facts: false
  tasks:
    - name: Load context
      ansible.builtin.include_tasks: ../tasks/load_context.yml
    - name: Render homepage manifest
      ansible.builtin.template:
        src: ../../kubernetes/base/homepage/manifests.yaml.j2
        dest: /tmp/homepage-rendered.yaml
EOF
mkdir -p /tmp/ansible-local /tmp/ansible-remote
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt \
ANSIBLE_LOCAL_TEMP=/tmp/ansible-local \
ANSIBLE_REMOTE_TEMP=/tmp/ansible-remote \
ansible-playbook ansible/playbooks/.homepage-render.yml -i localhost,
rm -f ansible/playbooks/.homepage-render.yml
```

Expected: `PLAY RECAP` shows `failed=0` and `/tmp/homepage-rendered.yaml` exists.

- [ ] **Step 2: Verify the rendered Homepage service entries**

Run:

```bash
rg -n "Apps:|Home Assistant:|n8n:|Postgres:|Cloudflared:|CoreDNS:|siteMonitor: https://|podSelector:" /tmp/homepage-rendered.yaml
```

Expected: LAN links appear for n8n and Home Assistant, and pod selectors appear for n8n/postgres/cloudflared/coredns.

- [ ] **Step 3: Verify the expanded Kubernetes widget fields**

Run:

```bash
rg -n "cluster:|nodes:|cpu: true|memory: true|showLabel: true|label: cluster|label: nodes" /tmp/homepage-rendered.yaml
```

Expected: the rendered widget config includes CPU and memory for both cluster and node summaries.
