import unittest
from pathlib import Path


class HomeAssistantRepoConfigurationTest(unittest.TestCase):
    def test_home_assistant_repo_scaffold_and_sync_playbook_exist(self) -> None:
        readme = Path("README.md").read_text()
        main_vars = Path("ansible/group_vars/all/main.yml").read_text()
        playbook = Path("ansible/playbooks/45-sync-home-assistant-config.yml").read_text()
        app_readme = Path("apps/home-assistant/README.md").read_text()
        operations = Path("apps/home-assistant/OPERATIONS.md").read_text()
        configuration = Path("apps/home-assistant/config/configuration.yaml").read_text()
        dashboards = Path("apps/home-assistant/config/dashboards/main.yaml").read_text()

        self.assertIn("home_assistant:", main_vars)
        self.assertIn("sync:", main_vars)
        self.assertIn("45-sync-home-assistant-config.yml", readme)
        self.assertIn("apps/home-assistant/", readme)
        self.assertIn("Push rendered Home Assistant config to HAOS", playbook)
        self.assertIn("Validate Home Assistant config on HAOS", playbook)
        self.assertIn("Restart Home Assistant after config sync", playbook)
        self.assertIn("synchronize:", playbook)
        self.assertIn("packages: !include_dir_named packages", configuration)
        self.assertIn("dashboards:", configuration)
        self.assertIn("Home Assistant configuration as code", app_readme)
        self.assertIn("SSH & Web Terminal", operations)
        self.assertIn("type: sections", dashboards)


if __name__ == "__main__":
    unittest.main()
