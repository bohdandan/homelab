import unittest
from pathlib import Path


class UptimeKumaConfigurationTest(unittest.TestCase):
    def test_repo_managed_kuma_configuration_exists(self) -> None:
        playbook = Path("ansible/playbooks/40-deploy-apps.yml").read_text()
        secrets_example = Path("ansible/group_vars/all/secrets.sops.yaml.example").read_text()
        readme = Path("README.md").read_text()
        app_readme = Path("apps/uptime-kuma/README.md").read_text()
        requirements = Path("apps/uptime-kuma/requirements.txt").read_text()
        reconcile = Path("apps/uptime-kuma/reconcile.py").read_text()
        desired_state = Path("apps/uptime-kuma/config/desired-state.yaml.j2").read_text()

        self.assertIn("uptime_kuma_admin_name", secrets_example)
        self.assertIn("uptime_kuma_admin_password", secrets_example)
        self.assertIn("Ensure Uptime Kuma admin credentials match encrypted secrets", playbook)
        self.assertIn("Install Uptime Kuma reconciliation dependencies", playbook)
        self.assertIn("Reconcile Uptime Kuma desired state", playbook)
        self.assertIn("uptime-kuma-api-v2==1.0.1", requirements)
        self.assertIn("PyYAML==6.0.3", requirements)
        self.assertIn("load_desired_state", reconcile)
        self.assertIn("api.add_monitor", reconcile)
        self.assertIn("api.edit_monitor", reconcile)
        self.assertIn("Managed by homelab repo", reconcile)
        self.assertIn("Homepage", desired_state)
        self.assertIn("Home Assistant", desired_state)
        self.assertIn("Zigbee2MQTT", desired_state)
        self.assertIn("https://{{ homelab_effective.domain.kuma }}", desired_state)
        self.assertNotIn('"200-399"', desired_state)
        self.assertIn('"200-299"', desired_state)
        self.assertIn('"300-399"', desired_state)
        self.assertNotIn('["200-399"]', reconcile)
        self.assertIn("apps/uptime-kuma/", readme)
        self.assertIn("40-deploy-apps.yml", app_readme)


if __name__ == "__main__":
    unittest.main()
