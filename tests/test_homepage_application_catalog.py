import json
import unittest
from pathlib import Path


class HomepageApplicationCatalogTest(unittest.TestCase):
    def test_homepage_covers_required_application_entries(self) -> None:
        catalog = json.loads(Path("docs/application-catalog.json").read_text())
        template = Path("kubernetes/base/homepage/manifests.yaml.j2").read_text()

        for application in catalog["applications"]:
            if not application.get("homepage_entry_required"):
                continue

            with self.subTest(application=application["id"]):
                self.assertIn(application["homepage_title"], template)
                self.assertIn(application["homepage_href"], template)


if __name__ == "__main__":
    unittest.main()
