import json
import unittest
from pathlib import Path


class CloudBeaverConfigurationTest(unittest.TestCase):
    def test_cloudbeaver_repo_surface_is_present(self) -> None:
        main_yml = Path("ansible/group_vars/all/main.yml").read_text()
        secrets_example = Path("ansible/group_vars/all/secrets.sops.yaml.example").read_text()
        catalog = json.loads(Path("docs/application-catalog.json").read_text())
        homepage = Path("kubernetes/base/homepage/manifests.yaml.j2").read_text()
        coredns = Path("kubernetes/base/coredns/manifests.yaml.j2").read_text()
        manifest = Path("kubernetes/base/cloudbeaver/manifests.yaml.j2")

        self.assertIn("cloudbeaver:", main_yml)
        self.assertIn("db.homelab.magnetic-marten.com", main_yml)
        self.assertIn("cloudbeaver_admin_name", secrets_example)
        self.assertIn("cloudbeaver_admin_password", secrets_example)
        self.assertTrue(manifest.exists())

        manifest_text = manifest.read_text()
        self.assertIn("initial-data-sources.conf", manifest_text)
        self.assertIn("data-sources.json", manifest_text)
        self.assertIn("CB_ADMIN_NAME", manifest_text)
        self.assertIn("CB_ADMIN_PASSWORD", manifest_text)
        self.assertIn("name: cloudbeaver", manifest_text)
        self.assertIn("host: {{ homelab_effective.domain.cloudbeaver }}", manifest_text)
        self.assertIn("kind: PersistentVolumeClaim", manifest_text)
        self.assertIn("provider\": \"postgresql\"", manifest_text)
        self.assertIn("driver\": \"postgres-jdbc\"", manifest_text)

        entries = {application["id"]: application for application in catalog["applications"]}
        self.assertIn("cloudbeaver", entries)
        self.assertTrue(entries["cloudbeaver"]["homepage_entry_required"])
        self.assertEqual("CloudBeaver", entries["cloudbeaver"]["homepage_title"])
        self.assertEqual(
            "https://{{ homelab_effective.domain.cloudbeaver }}",
            entries["cloudbeaver"]["homepage_href"],
        )

        self.assertIn("CloudBeaver", homepage)
        self.assertIn("https://{{ homelab_effective.domain.cloudbeaver }}", homepage)
        self.assertIn("- Database:", homepage)
        self.assertIn("- CloudBeaver:", homepage)
        database_section = homepage.split("- Database:", 1)[1].split("- Platform:", 1)[0]
        self.assertIn("- Postgres:", database_section)
        self.assertIn("- CloudBeaver:", database_section)
        observability_section = homepage.split("- Observability:", 1)[1].split("- Database:", 1)[0]
        self.assertNotIn("- CloudBeaver:", observability_section)
        self.assertIn("db 300 IN A", coredns)


if __name__ == "__main__":
    unittest.main()
