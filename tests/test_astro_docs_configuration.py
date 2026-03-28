import json
import unittest
from pathlib import Path


class AstroDocsConfigurationTest(unittest.TestCase):
    def test_astro_docs_source_tree_exists(self) -> None:
        app_root = Path("apps/astro-docs")

        self.assertTrue(app_root.is_dir())
        self.assertTrue(Path("apps/astro-docs/package.json").exists())
        self.assertTrue(Path("apps/astro-docs/astro.config.mjs").exists())
        self.assertTrue(Path("apps/astro-docs/Dockerfile").exists())
        self.assertTrue(Path("apps/astro-docs/src/content/docs/index.mdx").exists())

    def test_astro_docs_repo_wiring_exists(self) -> None:
        main_yml = Path("ansible/group_vars/all/main.yml").read_text()
        cloudflare_tf = Path("opentofu/cloudflare/main.tf").read_text()
        coredns = Path("kubernetes/base/coredns/manifests.yaml.j2").read_text()
        homepage = Path("kubernetes/base/homepage/manifests.yaml.j2").read_text()
        catalog = json.loads(Path("docs/application-catalog.json").read_text())

        self.assertIn("docs: docs.magnetic-marten.com", main_yml)
        self.assertIn("docs_internal: docs.homelab.magnetic-marten.com", main_yml)
        self.assertIn("astro_docs:", main_yml)
        self.assertIn("ghcr.io/bohdandan/homelab/astro-docs", main_yml)

        self.assertIn("docs.magnetic-marten.com", cloudflare_tf)
        self.assertIn('resource "cloudflare_record" "docs"', cloudflare_tf)

        self.assertIn("docs.homelab.magnetic-marten.com", coredns)
        self.assertIn("docs.homelab.magnetic-marten.com", homepage)

        docs_app = next((app for app in catalog["applications"] if app["id"] == "docs"), None)
        self.assertIsNotNone(docs_app)
        self.assertTrue(docs_app.get("homepage_entry_required"))
        self.assertEqual(docs_app.get("homepage_href"), "https://{{ homelab_effective.domain.docs_internal }}")

    def test_astro_docs_is_not_cloudflare_access_protected(self) -> None:
        cloudflare_tf = Path("opentofu/cloudflare/main.tf").read_text()

        self.assertNotIn('resource "cloudflare_access_application" "docs"', cloudflare_tf)
        self.assertNotIn('resource "cloudflare_access_policy" "docs"', cloudflare_tf)


if __name__ == "__main__":
    unittest.main()
