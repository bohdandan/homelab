#!/bin/bash
# Cleanup script for Ubuntu template

set -e

echo "================================"
echo " Template Cleanup"
echo "================================"
echo ""

# Clean apt cache
echo "Cleaning apt cache..."
sudo apt-get clean
sudo apt-get autoclean
sudo apt-get autoremove -y

# Remove temporary files
echo "Removing temporary files..."
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# Clear machine-id (will be regenerated on first boot)
echo "Clearing machine-id..."
sudo truncate -s 0 /etc/machine-id
sudo rm -f /var/lib/dbus/machine-id
sudo ln -s /etc/machine-id /var/lib/dbus/machine-id

# Clear cloud-init state
echo "Clearing cloud-init state..."
sudo cloud-init clean --logs --seed

# Remove SSH host keys (will be regenerated on first boot)
echo "Removing SSH host keys..."
sudo rm -f /etc/ssh/ssh_host_*

# Clear bash history
echo "Clearing bash history..."
history -c
cat /dev/null > ~/.bash_history

# Clear log files
echo "Truncating log files..."
sudo find /var/log -type f -exec truncate -s 0 {} \;

# Remove any cloud-init artifacts
echo "Removing cloud-init artifacts..."
sudo rm -rf /var/lib/cloud/instances/*
sudo rm -rf /var/lib/cloud/instance

echo "✅ Cleanup complete!"
echo ""
echo "Template is ready to be converted."
