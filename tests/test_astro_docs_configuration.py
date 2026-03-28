import json
import re
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

        self.assertRegex(
            cloudflare_tf,
            re.compile(
                r"ingress_rule\s*\{.*?hostname\s*=\s*(?:var\.docs_hostname|\"docs\.magnetic-marten\.com\")"
                r".*?service\s*=\s*(?:var\.docs_origin_service|\"http://traefik\.kube-system\.svc\.cluster\.local:80\")"
                r".*?\}",
                re.S,
            ),
        )
        self.assertRegex(
            cloudflare_tf,
            re.compile(
                r'resource\s+"cloudflare_record"\s+"[^"]+"\s*\{'
                r'.*?name\s*=\s*(?:var\.docs_hostname|\"docs\.magnetic-marten\.com\")'
                r'.*?type\s*=\s*"CNAME".*?proxied\s*=\s*true'
                r'.*?cfargotunnel\.com',
                re.S,
            ),
        )

        self.assertIn("docs 300 IN A", coredns)
        self.assertRegex(
            homepage,
            re.compile(
                r"-\s*Docs:\s*\n\s*href:\s*https://\{\{\s*homelab_effective\.domain\.docs_internal\s*\}\}",
                re.S,
            ),
        )

        docs_app = next((app for app in catalog["applications"] if app["id"] == "docs"), None)
        self.assertIsNotNone(docs_app)
        self.assertTrue(docs_app.get("homepage_entry_required"))
        self.assertEqual(docs_app.get("homepage_href"), "https://{{ homelab_effective.domain.docs_internal }}")

    def test_astro_docs_is_not_cloudflare_access_protected(self) -> None:
        cloudflare_tf = Path("opentofu/cloudflare/main.tf").read_text()

        self.assertNotIn('resource "cloudflare_access_application" "docs"', cloudflare_tf)
        self.assertNotIn('resource "cloudflare_access_policy" "docs"', cloudflare_tf)
        self.assertNotRegex(
            cloudflare_tf,
            re.compile(
                r'resource\s+"cloudflare_access_application"\s+"[^"]+"\s*\{'
                r'[^}]*?(?:domain|hostname)\s*=\s*(?:var\.docs_[A-Za-z0-9_]+|\"docs\.(?:magnetic-marten|homelab\.magnetic-marten)\.com\")'
                r'[^}]*\}',
                re.S,
            ),
        )
        self.assertNotRegex(
            cloudflare_tf,
            re.compile(
                r'resource\s+"cloudflare_access_policy"\s+"[^"]+"\s*\{'
                r'[^}]*application_id\s*=\s*cloudflare_access_application\.[A-Za-z0-9_]*docs[A-Za-z0-9_]*\.id'
                r'[^}]*\}',
                re.S,
            ),
        )


if __name__ == "__main__":
    unittest.main()
