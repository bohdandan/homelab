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

        main_yml = Path("ansible/group_vars/all/main.yml").read_text()
        self.assertNotIn(":latest", main_yml)
        self.assertIn("n8nio/n8n:", main_yml)
        self.assertIn("copyparty/ac:v1.19.21", main_yml)
        self.assertIn("dgtlmoon/changedetection.io:", main_yml)
        self.assertIn("louislam/uptime-kuma:", main_yml)
        self.assertIn("binwiederhier/ntfy:", main_yml)


if __name__ == "__main__":
    unittest.main()
