#!/bin/bash

set -euo pipefail

sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  apt-transport-https \
  ca-certificates \
  curl \
  git \
  jq \
  net-tools \
  nfs-common \
  open-iscsi \
  python3 \
  python3-pip \
  qemu-guest-agent \
  software-properties-common \
  unzip \
  wget

sudo tee /etc/cloud/cloud.cfg.d/99-pve.cfg > /dev/null <<'EOF'
datasource_list: [ NoCloud, ConfigDrive ]
EOF

sudo systemctl enable ssh
sudo systemctl enable systemd-timesyncd
sudo systemctl start ssh
sudo systemctl start qemu-guest-agent || true
sudo systemctl start systemd-timesyncd
sudo timedatectl set-timezone UTC
