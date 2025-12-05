#!/bin/bash
# Security hardening script for Ubuntu template

set -e

echo "================================"
echo " Security Hardening"
echo "================================"
echo ""

# Configure SSH for better security
echo "Hardening SSH configuration..."
sudo tee -a /etc/ssh/sshd_config.d/99-hardening.conf > /dev/null <<EOF
# Disable root login via SSH
PermitRootLogin no

# Disable password authentication (will be overridden by cloud-init as needed)
#PasswordAuthentication no

# Disable empty passwords
PermitEmptyPasswords no

# Limit authentication attempts
MaxAuthTries 3

# Enable public key authentication
PubkeyAuthentication yes

# Disable X11 forwarding
X11Forwarding no

# Set client alive interval
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

# Configure automatic security updates
echo "Configuring automatic security updates..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Enable firewall (UFW) but allow SSH
echo "Configuring firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh

# Set secure file permissions
echo "Setting secure file permissions..."
sudo chmod 700 /root
sudo chmod 600 /etc/ssh/sshd_config

echo "✅ Hardening complete!"
