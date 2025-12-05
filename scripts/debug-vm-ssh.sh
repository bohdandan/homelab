#!/bin/bash
# VM SSH Debugging Script

echo "=== VM SSH Debugging ==="
echo ""

# Get IPs from inventory
MASTER_IP=$(grep -A1 "k3s-master:" ansible/inventory/hosts.yml | grep ansible_host | awk '{print $2}')
WORKER_IP=$(grep -A1 "k3s-worker-1:" ansible/inventory/hosts.yml | grep ansible_host | awk '{print $2}')

echo "Master IP: $MASTER_IP"
echo "Worker IP: $WORKER_IP"
echo ""

for ip in $MASTER_IP $WORKER_IP; do
    echo "=== Checking $ip ==="
    
    # 1. Ping test
    echo -n "  Ping: "
    if ping -c 1 -W 2 $ip &>/dev/null; then
        echo "✓ Reachable"
    else
        echo "✗ Not reachable"
        continue
    fi
    
    # 2. Port 22 check
    echo -n "  Port 22: "
    if timeout 2 bash -c "echo >/dev/tcp/$ip/22" 2>/dev/null; then
        echo "✓ Open"
    else
        echo "✗ Closed/Filtered"
    fi
    
    # 3. SSH connection attempt
    echo -n "  SSH test: "
    if timeout 5 ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no -o BatchMode=yes ubuntu@$ip "echo ok" 2>/dev/null; then
        echo "✓ Connected"
    else
        echo "✗ Connection failed"
    fi
    
    echo ""
done

echo ""
echo "=== Proxmox Console Commands ==="
echo "To check VM console in Proxmox:"
echo "1. Open Proxmox UI: https://\${PROXMOX_HOST}:8006"
echo "2. Click on k3s-master VM → Console"
echo "3. Run these commands:"
echo ""
echo "   # Check if SSH is running"
echo "   sudo systemctl status ssh"
echo ""
echo "   # Check network config"
echo "   ip addr show"
echo ""
echo "   # Check cloud-init status"
echo "   cloud-init status"
echo ""
echo "   # View cloud-init logs"
echo "   sudo cat /var/log/cloud-init.log | tail -50"
echo ""
echo "   # Check if openssh-server is installed"
echo "   dpkg -l | grep openssh-server"
