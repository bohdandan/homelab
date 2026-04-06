#!/usr/bin/env bash
set -eu
set -o pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../../.." && pwd)
cd "$REPO_ROOT"

export HOME="/home/dev"
export ANSIBLE_CONFIG="$REPO_ROOT/ansible/ansible.cfg"
export KUBECONFIG="/home/dev/.kube/config"
export SOPS_AGE_KEY_FILE="/home/dev/.config/sops/age/keys.txt"

LOCK_FILE="$REPO_ROOT/ansible/runtime/copyparty-ingest-reconcile.lock"
RUNTIME_INVENTORY="$REPO_ROOT/ansible/runtime/copyparty-ingest-inventory.yml"
MAIN_YML="$REPO_ROOT/ansible/group_vars/all/main.yml"
STORAGE_PLAYBOOK="$REPO_ROOT/ansible/playbooks/32-configure-stateful-storage.yml"
DEPLOY_PLAYBOOK="$REPO_ROOT/ansible/playbooks/40-deploy-apps.yml"
SSH_KEY="$HOME/.ssh/id_ed25519_copyparty_ingest"
SSH_OPTIONS=(-i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=yes)

log() {
  printf '%s\n' "$1"
}

safe_noop() {
  log "$1"
  exit 0
}

probe_failed() {
  log "probe failed: $1"
}

mkdir -p "$REPO_ROOT/ansible/runtime"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "reconcile already running"
  exit 0
fi

ensure_preflight() {
  if [ ! -f "$ANSIBLE_CONFIG" ] || [ ! -f "$MAIN_YML" ] || [ ! -f "$STORAGE_PLAYBOOK" ] || [ ! -f "$DEPLOY_PLAYBOOK" ]; then
    safe_noop "preflight: missing repo checkout at $REPO_ROOT"
  fi

  if [ ! -f "$KUBECONFIG" ]; then
    safe_noop "preflight: missing kubeconfig at $KUBECONFIG"
  fi

  if [ ! -f "$SOPS_AGE_KEY_FILE" ]; then
    safe_noop "preflight: missing age key at $SOPS_AGE_KEY_FILE"
  fi

  if [ ! -f "$SSH_KEY" ]; then
    safe_noop "preflight: missing ssh key at $SSH_KEY"
  fi
}

ensure_preflight

PROXMOX_HOST=$(yq -r '.homelab.proxmox.ssh_host' "$MAIN_YML")
PROXMOX_SSH_PORT=$(yq -r '.homelab.proxmox.ssh_port' "$MAIN_YML")
PROXMOX_SSH_USER=$(yq -r '.homelab.proxmox.ssh_user' "$MAIN_YML")
K3S_CONTROL_HOST=$(yq -r '.homelab.k3s.control.ip' "$MAIN_YML")
K3S_CONTROL_NAME=$(yq -r '.homelab.k3s.control.name' "$MAIN_YML")
K3S_CONTROL_VMID=$(yq -r '.homelab.k3s.control.vmid' "$MAIN_YML")
WORKER_HOST=$(yq -r '.homelab.k3s.worker.ip' "$MAIN_YML")
WORKER_NAME=$(yq -r '.homelab.k3s.worker.name' "$MAIN_YML")
WORKER_VMID=$(yq -r '.homelab.k3s.worker.vmid' "$MAIN_YML")
WORKER_SSH_USER=$(yq -r '.homelab.ssh.user' "$MAIN_YML")
DEV_ADMIN_HOST=$(yq -r '.homelab.dev_admin.ip' "$MAIN_YML")
DEV_ADMIN_NAME=$(yq -r '.homelab.dev_admin.name' "$MAIN_YML")
DEV_ADMIN_VMID=$(yq -r '.homelab.dev_admin.vmid' "$MAIN_YML")
DEV_ADMIN_LOGIN_USER=$(yq -r '.homelab.dev_admin.login_user' "$MAIN_YML")
HAOS_HOST=$(yq -r '.homelab.haos.desired_ip' "$MAIN_YML")
HAOS_NAME=$(yq -r '.homelab.haos.name' "$MAIN_YML")
HAOS_VMID=$(yq -r '.homelab.haos.vmid' "$MAIN_YML")
HAOS_MAC=$(yq -r '.homelab.haos.mac_address' "$MAIN_YML")
INGEST_UUID=$(yq -r '.homelab.storage.copyparty_ingest.filesystem_uuid' "$MAIN_YML")

write_runtime_inventory() {
  cat >"$RUNTIME_INVENTORY" <<EOF
all:
  hosts:
    localhost:
      ansible_connection: local
  vars:
    ansible_user: $WORKER_SSH_USER
    ansible_ssh_private_key_file: $SSH_KEY
    ansible_ssh_common_args: "-o StrictHostKeyChecking=no"
  children:
    proxmox:
      hosts:
        proxmox-01:
          ansible_host: $PROXMOX_HOST
          ansible_user: $PROXMOX_SSH_USER
          ansible_port: $PROXMOX_SSH_PORT
    k3s_control:
      hosts:
        $K3S_CONTROL_NAME:
          ansible_host: $K3S_CONTROL_HOST
          node_role: control
          vmid: $K3S_CONTROL_VMID
    k3s_worker:
      hosts:
        $WORKER_NAME:
          ansible_host: $WORKER_HOST
          node_role: worker
          vmid: $WORKER_VMID
    dev_admin:
      hosts:
        $DEV_ADMIN_NAME:
          ansible_host: $DEV_ADMIN_HOST
          vmid: $DEV_ADMIN_VMID
          remote_login_user: $DEV_ADMIN_LOGIN_USER
    home_assistant:
      hosts:
        $HAOS_NAME:
          ansible_host: $HAOS_HOST
          vmid: $HAOS_VMID
          mac_address: $HAOS_MAC
    k3s_cluster:
      children:
        k3s_control: {}
        k3s_worker: {}
EOF
}

desired_state() {
  local result=""

  if ! result=$(
    ssh "${SSH_OPTIONS[@]}" -p "$PROXMOX_SSH_PORT" "${PROXMOX_SSH_USER}@${PROXMOX_HOST}" /bin/sh -s -- "$INGEST_UUID" 2>/dev/null <<'EOF'
uuid=$1
if [ -e "/dev/disk/by-uuid/$uuid" ]; then
  printf '%s' "attached"
else
  printf '%s' "absent"
fi
EOF
  ); then
    probe_failed "desired ingest visibility over SSH"
    printf '%s\n' "unknown"
    return
  fi

  case "$result" in
    attached | absent)
      printf '%s\n' "$result"
      ;;
    *)
      probe_failed "desired ingest visibility over SSH"
      printf '%s\n' "unknown"
      ;;
  esac
}

worker_ingest_mount_state() {
  local result=""

  if ! result=$(
    ssh "${SSH_OPTIONS[@]}" "${WORKER_SSH_USER}@${WORKER_HOST}" /bin/sh -s 2>/dev/null <<'EOF'
if mount_type=$(findmnt -n -M /srv/ingest/current -o FSTYPE 2>/dev/null); then
  printf '%s' "$mount_type"
else
  rc=$?
  if [ "$rc" -eq 1 ]; then
    printf '%s' "absent"
  else
    printf '%s' "probe-failed"
  fi
fi
EOF
  ); then
    probe_failed "worker ingest mount over SSH"
    printf '%s\n' "unknown"
    return
  fi

  case "$result" in
    cifs)
      printf '%s\n' "present"
      ;;
    absent)
      printf '%s\n' "absent"
      ;;
    *)
      probe_failed "worker ingest mount over SSH"
      printf '%s\n' "unknown"
      ;;
  esac
}

copyparty_ingest_config_state() {
  local result=""

  if ! result=$(
    kubectl -n copyparty exec deploy/copyparty -- sh -eu -c \
      "if grep -Fq '[/ingest]' /etc/copyparty/copyparty.conf; then printf present; else printf absent; fi" \
      2>/dev/null
  ); then
    probe_failed "copyparty ingest config via kubectl"
    printf '%s\n' "unknown"
    return
  fi

  case "$result" in
    present | absent)
      printf '%s\n' "$result"
      ;;
    *)
      probe_failed "copyparty ingest config via kubectl"
      printf '%s\n' "unknown"
      ;;
  esac
}

current_state() {
  local mount_state=""
  local config_state=""

  mount_state=$(worker_ingest_mount_state)
  config_state=$(copyparty_ingest_config_state)

  if [ "$mount_state" = "present" ] && [ "$config_state" = "present" ]; then
    printf '%s\n' "ready"
  elif [ "$mount_state" = "absent" ] && [ "$config_state" = "absent" ]; then
    printf '%s\n' "absent"
  elif [ "$mount_state" != "unknown" ] && [ "$config_state" != "unknown" ]; then
    printf '%s\n' "mismatch"
  else
    printf '%s\n' "unknown"
  fi
}

run_reconcile() {
  write_runtime_inventory

  if ! ansible-playbook -i "$RUNTIME_INVENTORY" "$STORAGE_PLAYBOOK"; then
    log "reconcile failed"
    return 1
  fi

  if ! ansible-playbook -i "$RUNTIME_INVENTORY" "$DEPLOY_PLAYBOOK"; then
    log "reconcile failed"
    return 1
  fi
}

DESIRED_STATE=$(desired_state)
CURRENT_STATE=$(current_state)

case "$DESIRED_STATE:$CURRENT_STATE" in
  attached:ready)
    log "ingest present, no change"
    ;;
  absent:absent)
    log "ingest absent, no change"
    ;;
  attached:absent | attached:mismatch)
    log "ingest attached, reconciling"
    run_reconcile
    ;;
  absent:ready | absent:mismatch)
    log "ingest removed, reconciling"
    run_reconcile
    ;;
  *)
    log "state unknown, skipping reconcile ($DESIRED_STATE/$CURRENT_STATE)"
    exit 0
    ;;
esac
