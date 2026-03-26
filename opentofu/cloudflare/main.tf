provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "random_id" "tunnel_secret" {
  byte_length = 32
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "homelab" {
  account_id = var.account_id
  name       = var.tunnel_name
  secret     = random_id.tunnel_secret.b64_std
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "homelab" {
  account_id = var.account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.homelab.id

  config {
    ingress_rule {
      hostname = var.homepage_hostname
      service  = var.homepage_origin_service
    }

    ingress_rule {
      hostname = var.n8n_hostname
      service  = var.n8n_origin_service
    }

    ingress_rule {
      service = "http_status:404"
    }
  }
}

resource "cloudflare_record" "homepage" {
  zone_id = var.zone_id
  name    = var.homepage_hostname
  value   = "${cloudflare_zero_trust_tunnel_cloudflared.homelab.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "n8n" {
  zone_id = var.zone_id
  name    = var.n8n_hostname
  value   = "${cloudflare_zero_trust_tunnel_cloudflared.homelab.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_access_application" "n8n" {
  zone_id          = var.zone_id
  name             = "n8n"
  domain           = var.n8n_hostname
  type             = "self_hosted"
  session_duration = "24h"
}

resource "cloudflare_access_application" "homepage" {
  zone_id          = var.zone_id
  name             = "homepage"
  domain           = var.homepage_hostname
  type             = "self_hosted"
  session_duration = "24h"
}

resource "cloudflare_access_policy" "n8n_allow" {
  zone_id        = var.zone_id
  application_id = cloudflare_access_application.n8n.id
  name           = "Allow homelab n8n users"
  precedence     = "1"
  decision       = "allow"

  include {
    email = var.n8n_allowed_emails
  }
}

resource "cloudflare_access_policy" "homepage_allow" {
  zone_id        = var.zone_id
  application_id = cloudflare_access_application.homepage.id
  name           = "Allow homelab homepage users"
  precedence     = "1"
  decision       = "allow"

  include {
    email = var.n8n_allowed_emails
  }
}
