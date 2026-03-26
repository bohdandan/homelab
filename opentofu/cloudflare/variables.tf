variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "account_id" {
  type = string
}

variable "zone_id" {
  type = string
}

variable "zone_name" {
  type = string
}

variable "tunnel_name" {
  type = string
}

variable "homepage_hostname" {
  type = string
}

variable "n8n_hostname" {
  type = string
}

variable "share_hostname" {
  type = string
}

variable "share_origin_ipv4" {
  type = string
}

variable "homepage_origin_service" {
  type = string
}

variable "n8n_origin_service" {
  type = string
}

variable "n8n_allowed_emails" {
  type = list(string)
}
