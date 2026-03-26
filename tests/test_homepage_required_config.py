import unittest
from pathlib import Path


class HomepageRequiredConfigFilesTest(unittest.TestCase):
    def test_template_includes_all_required_config_files(self) -> None:
        template = Path("kubernetes/base/homepage/manifests.yaml.j2").read_text()
        required_files = {
            "bookmarks.yaml",
            "custom.css",
            "custom.js",
            "docker.yaml",
            "kubernetes.yaml",
            "proxmox.yaml",
            "services.yaml",
            "settings.yaml",
            "widgets.yaml",
        }

        missing_files = sorted(name for name in required_files if name not in template)
        self.assertEqual([], missing_files)


if __name__ == "__main__":
    unittest.main()
