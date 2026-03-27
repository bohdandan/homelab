import json
import unittest
from pathlib import Path


class HomepageProxmoxCardTest(unittest.TestCase):
    def test_platform_cards_and_datetime_widget_are_present(self) -> None:
        catalog = json.loads(Path("docs/application-catalog.json").read_text())
        template = Path("kubernetes/base/homepage/manifests.yaml.j2").read_text()

        proxmox_entry = next(
            (
                application
                for application in catalog["applications"]
                if application["id"] == "proxmox"
            ),
            None,
        )

        self.assertIsNotNone(proxmox_entry)
        self.assertTrue(proxmox_entry["homepage_entry_required"])
        self.assertEqual("Proxmox", proxmox_entry["homepage_title"])
        self.assertEqual(
            "https://{{ homelab_effective.domain.proxmox }}:8006",
            proxmox_entry["homepage_href"],
        )
        self.assertIn("Proxmox", template)
        self.assertIn("https://{{ homelab_effective.domain.proxmox }}:8006", template)
        self.assertIn("Traefik", template)
        self.assertIn("Cloudflare Tunnels", template)
        self.assertIn("- datetime:", template)


if __name__ == "__main__":
    unittest.main()
