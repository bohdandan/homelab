#!/bin/bash
# Setup Proxmox User and API Token for Packer/Terraform
# Run this on your Proxmox server as root

set -e

echo "🔧 Creating Proxmox user and API token for automation..."

# User details
USERNAME="terraform"
REALM="pve"
FULL_USER="${USERNAME}@${REALM}"
TOKEN_NAME="opentofu"

# Check if user exists
if pveum user list | grep -q "^${FULL_USER}"; then
    echo "✅ User ${FULL_USER} already exists"
else
    echo "📝 Creating user ${FULL_USER}..."
    pveum user add ${FULL_USER} --comment "Automation user for Packer/Terraform/OpenTofu"
    echo "✅ User created"
fi

# Create/recreate API token
echo "🔑 Creating API token ${TOKEN_NAME}..."
pveum user token add ${FULL_USER} ${TOKEN_NAME} --privsep 0

echo ""
echo "============================================"
echo "✅ Setup Complete!"
echo "============================================"
echo ""
echo "Add the following to your .env file:"
echo ""
echo "PROXMOX_API_TOKEN_ID=\"${FULL_USER}!${TOKEN_NAME}\""
echo "PROXMOX_API_TOKEN_SECRET=\"<secret-from-above>\""
echo ""
echo "⚠️  IMPORTANT: Copy the secret from the output above!"
echo "    It will only be shown once and cannot be retrieved later."
echo ""

# Assign permissions
echo "📋 Assigning permissions..."
pveum acl modify / --user ${FULL_USER} --role PVEVMAdmin
pveum acl modify /storage --user ${FULL_USER} --role PVEDatastoreUser

echo "✅ Permissions assigned (PVEVMAdmin on /, PVEDatastoreUser on /storage)"
echo ""
echo "You can now use Packer/Terraform/OpenTofu with these credentials."
