output "tunnel_id" {
  value = cloudflare_zero_trust_tunnel_cloudflared.homelab.id
}

output "tunnel_name" {
  value = cloudflare_zero_trust_tunnel_cloudflared.homelab.name
}

output "tunnel_token" {
  value     = cloudflare_zero_trust_tunnel_cloudflared.homelab.tunnel_token
  sensitive = true
}

output "public_hostnames" {
  value = [
    var.docs_hostname,
    var.homepage_hostname,
    var.n8n_hostname,
    var.share_hostname,
  ]
}
