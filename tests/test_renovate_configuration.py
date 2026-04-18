import json
import unittest
from pathlib import Path


class RenovateConfigurationTest(unittest.TestCase):
    def test_renovate_exists_and_main_images_are_pinned(self) -> None:
        renovate = Path("renovate.json")
        self.assertTrue(renovate.exists())

        config = json.loads(renovate.read_text())
        self.assertTrue(config["extends"])
        self.assertTrue(config["customManagers"])
        self.assertTrue(config["lockFileMaintenance"]["enabled"])

        main_yml = Path("ansible/group_vars/all/main.yml").read_text()
        self.assertNotIn(":latest", main_yml)
        self.assertIn("n8nio/n8n:", main_yml)
        self.assertIn("copyparty/ac:", main_yml)
        self.assertIn("dgtlmoon/changedetection.io:", main_yml)
        self.assertIn("louislam/uptime-kuma:", main_yml)
        self.assertIn("binwiederhier/ntfy:", main_yml)
        self.assertNotIn("roastslav/quickdrop:", main_yml)

    def test_renovate_custom_managers_cover_homelab_version_pins(self) -> None:
        config = json.loads(Path("renovate.json").read_text())
        managers = config["customManagers"]

        for manager in managers:
            self.assertIn("managerFilePatterns", manager)
            self.assertNotIn("fileMatch", manager)

        manager_text = json.dumps(managers)
        expected_dependencies = [
            "home-assistant/operating-system",
            "k3s-io/k3s",
            "cert-manager/cert-manager",
            "metallb/metallb",
            "helm/helm",
            "helix-editor/helix",
            "jesseduffield/lazygit",
            "getsops/sops",
            "@openai/codex",
            "glances",
        ]

        for dependency in expected_dependencies:
            with self.subTest(dependency=dependency):
                self.assertIn(dependency, manager_text)

        self.assertIn("github-releases", manager_text)
        self.assertIn("npm", manager_text)
        self.assertIn("pypi", manager_text)
        self.assertIn("autoReplaceStringTemplate", manager_text)

    def test_renovate_groups_sensitive_update_lanes(self) -> None:
        config = json.loads(Path("renovate.json").read_text())
        package_rules = json.dumps(config["packageRules"])

        self.assertIn("docker image updates", package_rules)
        self.assertIn("home assistant os updates", package_rules)
        self.assertIn("cluster platform updates", package_rules)
        self.assertIn("dev admin tool updates", package_rules)
        self.assertIn("infrastructure provider updates", package_rules)
        self.assertIn("github action updates", package_rules)
        self.assertIn("ansible collection updates", package_rules)


if __name__ == "__main__":
    unittest.main()
