import json
import unittest
from pathlib import Path


class VaultwardenConfigurationTest(unittest.TestCase):
    def test_vaultwarden_repo_surface_is_present(self) -> None:
        main_yml = Path("ansible/group_vars/all/main.yml").read_text()
        secrets_example = Path("ansible/group_vars/all/secrets.sops.yaml.example").read_text()
        coredns = Path("kubernetes/base/coredns/manifests.yaml.j2").read_text()
        homepage = Path("kubernetes/base/homepage/manifests.yaml.j2").read_text()
        desired_state = Path("apps/uptime-kuma/config/desired-state.yaml.j2").read_text()
        readme = Path("README.md").read_text()
        app_readme = Path("apps/vaultwarden/README.md")
        manifest = Path("kubernetes/base/vaultwarden/manifests.yaml.j2")

        self.assertIn("vaultwarden: vaultwarden.homelab.magnetic-marten.com", main_yml)
        self.assertIn("vaultwarden/server:1.35.4", main_yml)
        self.assertIn("signups_allowed: true", main_yml)
        self.assertIn("vaultwarden_admin_token", secrets_example)
        self.assertIn("vaultwarden_admin_token_hash", secrets_example)
        self.assertIn("vaultwarden 300 IN A", coredns)

        self.assertIn("- Vaultwarden:", homepage)
        self.assertIn("https://{{ homelab_effective.domain.vaultwarden }}", homepage)
        self.assertIn("namespace: {{ homelab_effective.apps.vaultwarden.namespace }}", homepage)
        self.assertIn("podSelector: app=vaultwarden", homepage)

        self.assertIn("- name: Vaultwarden", desired_state)
        self.assertIn("url: https://{{ homelab_effective.domain.vaultwarden }}", desired_state)

        self.assertTrue(app_readme.exists())
        self.assertIn("vaultwarden.homelab.magnetic-marten.com", readme)
        self.assertIn("After creating the first account", app_readme.read_text())

        self.assertTrue(manifest.exists())

    def test_vaultwarden_catalog_entry_is_homepage_required(self) -> None:
        catalog = json.loads(Path("docs/application-catalog.json").read_text())
        entries = {application["id"]: application for application in catalog["applications"]}

        self.assertIn("vaultwarden", entries)
        self.assertTrue(entries["vaultwarden"]["homepage_entry_required"])
        self.assertEqual("Vaultwarden", entries["vaultwarden"]["homepage_title"])
        self.assertEqual(
            "https://{{ homelab_effective.domain.vaultwarden }}",
            entries["vaultwarden"]["homepage_href"],
        )

    def test_vaultwarden_manifest_is_lan_only_and_stateful(self) -> None:
        manifest = Path("kubernetes/base/vaultwarden/manifests.yaml.j2").read_text()

        self.assertIn("kind: PersistentVolumeClaim", manifest)
        self.assertIn("name: vaultwarden", manifest)
        self.assertIn("name: vaultwarden-lan-only", manifest)
        self.assertIn("kind: Middleware", manifest)
        self.assertIn("apiVersion: traefik.io/v1alpha1", manifest)
        self.assertIn("ipAllowList:", manifest)
        self.assertIn("192.168.0.0/16", manifest)
        self.assertIn("10.42.0.0/16", manifest)
        self.assertIn("traefik.ingress.kubernetes.io/router.middlewares", manifest)
        self.assertIn("vaultwarden-vaultwarden-lan-only@kubernetescrd", manifest)
        self.assertIn("ADMIN_TOKEN", manifest)
        self.assertIn("vaultwarden_admin_token_hash", manifest)
        self.assertIn("admin-token-hash", manifest)
        self.assertNotIn("admin-token:", manifest)
        self.assertIn("checksum/vaultwarden-admin", manifest)
        self.assertIn("SIGNUPS_ALLOWED", manifest)
        self.assertIn("host: {{ homelab_effective.domain.vaultwarden }}", manifest)
        self.assertIn('cert-manager.io/cluster-issuer: "{{ homelab_effective.cert_manager.cluster_issuer_name }}"', manifest)
        self.assertNotIn("{{ homelab_effective.domain.root }}", manifest)

    def test_vaultwarden_deploy_playbook_is_wired(self) -> None:
        playbook = Path("ansible/playbooks/40-deploy-apps.yml").read_text()

        self.assertIn("homelab_vaultwarden_secrets_ready", playbook)
        self.assertIn("vaultwarden_admin_token", playbook)
        self.assertIn("vaultwarden_admin_token_hash", playbook)
        self.assertIn("Render Vaultwarden manifest", playbook)
        self.assertIn("../../kubernetes/base/vaultwarden/manifests.yaml.j2", playbook)
        self.assertIn("Delete Vaultwarden admin secret before apply to drop removed keys", playbook)
        self.assertIn("Apply Vaultwarden manifest", playbook)
        self.assertIn("Wait for Vaultwarden deployment", playbook)
        self.assertIn("deployment/vaultwarden -n {{ homelab_effective.apps.vaultwarden.namespace }}", playbook)


if __name__ == "__main__":
    unittest.main()
