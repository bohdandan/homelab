#!/bin/bash
# First-boot script to inject SSH keys
# This runs once on first boot to configure SSH keys

MARKER_FILE="/var/lib/firstboot-done"

# Exit if already run
if [ -f "$MARKER_FILE" ]; then
    exit 0
fi

# Create ubuntu user .ssh directory
mkdir -p /home/ubuntu/.ssh
chmod 700 /home/ubuntu/.ssh

# Add SSH public key from environment or default
if [ -n "$SSH_PUBLIC_KEY" ]; then
    echo "$SSH_PUBLIC_KEY" > /home/ubuntu/.ssh/authorized_keys
else
    # Fallback: Try to get from Proxmox metadata if available
    echo "No SSH key provided"
fi

chmod 600 /home/ubuntu/.ssh/authorized_keys
chown -R ubuntu:ubuntu /home/ubuntu/.ssh

# Mark as done
touch "$MARKER_FILE"

echo "SSH keys configured via firstboot script"
