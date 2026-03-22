#!/bin/bash

set -euo pipefail

echo "Clearing cloud-init state..."
sudo rm -rf /var/lib/cloud/instance
sudo rm -rf /var/lib/cloud/instances/*
sudo rm -rf /var/log/cloud-init*
sudo rm -f /etc/cloud/cloud-init.disabled
sudo rm -f /var/lib/cloud/data/disabled
sudo rm -f /etc/netplan/50-cloud-init.yaml
sudo rm -f /etc/cloud/cloud.cfg.d/90-installer-network.cfg
sudo rm -f /etc/cloud/cloud.cfg.d/99-installer.cfg

echo "Re-enabling cloud-init for cloned VMs..."
sudo touch /etc/cloud/cloud.cfg.d/99-enable-cloud-init.cfg
sudo systemctl enable cloud-init cloud-config cloud-final

sudo truncate -s 0 /etc/machine-id
sudo rm -f /var/lib/dbus/machine-id
sudo ln -sf /etc/machine-id /var/lib/dbus/machine-id
sudo apt-get clean
sudo rm -rf /tmp/* /var/tmp/*
