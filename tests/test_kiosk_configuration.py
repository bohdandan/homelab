import json
import unittest
from pathlib import Path


class KioskConfigurationTest(unittest.TestCase):
    def test_kiosk_source_tree_exists(self) -> None:
        app_root = Path("apps/kiosk")

        self.assertTrue(app_root.is_dir())
        self.assertTrue((app_root / "package.json").is_file())
        self.assertTrue((app_root / "Dockerfile").is_file())
        self.assertTrue((app_root / "config/dashboard.json").is_file())
        self.assertTrue((app_root / "components/dashboard.tsx").is_file())
        gitignore = (app_root / ".gitignore").read_text()
        self.assertIn("node_modules/", gitignore)
        self.assertIn(".next/", gitignore)

    def test_kiosk_repo_wiring_exists(self) -> None:
        main_yml = Path("ansible/group_vars/all/main.yml").read_text()
        coredns = Path("kubernetes/base/coredns/manifests.yaml.j2").read_text()
        homepage = Path("kubernetes/base/homepage/manifests.yaml.j2").read_text()
        playbook = Path("ansible/playbooks/40-deploy-apps.yml").read_text()
        manifest = Path("kubernetes/base/kiosk/manifests.yaml.j2").read_text()
        catalog = json.loads(Path("docs/application-catalog.json").read_text())

        self.assertIn("kiosk: kiosk.homelab.magnetic-marten.com", main_yml)
        self.assertIn("kiosk:", main_yml)
        self.assertIn("ghcr.io/bohdandan/homelab/kiosk", main_yml)
        self.assertIn("kiosk 300 IN A", coredns)
        self.assertIn("- Kiosk:", homepage)
        self.assertIn("https://{{ homelab_effective.domain.kiosk }}", homepage)
        self.assertIn("namespace: {{ homelab_effective.apps.kiosk.namespace }}", homepage)
        self.assertIn("podSelector: app=kiosk", homepage)
        self.assertIn("kubernetes/base/kiosk/manifests.yaml.j2", playbook)
        self.assertIn("deployment/kiosk", playbook)
        self.assertIn("lookup('ansible.builtin.file'", manifest)
        self.assertIn("config/dashboard.json", manifest)
        self.assertIn("mountPath: /usr/share/nginx/html/config/dashboard.json", manifest)

        entry = next((app for app in catalog["applications"] if app["id"] == "kiosk"), None)
        self.assertIsNotNone(entry)
        self.assertTrue(entry["homepage_entry_required"])
        self.assertEqual("Kiosk", entry["homepage_title"])
        self.assertEqual("https://{{ homelab_effective.domain.kiosk }}", entry["homepage_href"])

    def test_kiosk_is_lan_only(self) -> None:
        cloudflare_tf = Path("opentofu/cloudflare/main.tf").read_text()

        self.assertNotIn("kiosk.magnetic-marten.com", cloudflare_tf)
        self.assertNotIn("kiosk_hostname", cloudflare_tf)


if __name__ == "__main__":
    unittest.main()
