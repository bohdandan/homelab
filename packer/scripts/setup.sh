#!/bin/bash
# Setup script for Ubuntu template

set -e

echo "================================"
echo " Ubuntu Template Setup"
echo "================================"
echo ""

# Update package lists
echo "Updating package lists..."
sudo apt-get update

# Upgrade installed packages
echo "Upgrading packages..."
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# Install additional useful packages
echo "Installing additional packages..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    software-properties-common \
    apt-transport-https \
    python3-pip \
    jq \
    unzip \
    tree \
    ncdu

# Configure cloud-init for template usage
echo "Configuring cloud-init..."
sudo tee /etc/cloud/cloud.cfg.d/99-pve.cfg > /dev/null <<EOF
# to update this file, run dpkg-reconfigure cloud-init
datasource_list: [ NoCloud, ConfigDrive ]
EOF

# Enable QEMU guest agent
echo "Ensuring QEMU guest agent is enabled..."
sudo systemctl enable qemu-guest-agent
sudo systemctl start qemu-guest-agent || true

# Configure timezone to UTC
echo "Setting timezone to UTC..."
sudo timedatectl set-timezone UTC

# Enable time synchronization
echo "Enabling time synchronization..."
sudo systemctl enable systemd-timesyncd
sudo systemctl start systemd-timesyncd

echo "✅ Setup complete!"
