import json
import re
import unittest
from pathlib import Path


def _extract_terraform_blocks(text: str, start_pattern: str) -> list[str]:
    blocks = []
    pattern = re.compile(start_pattern, re.M)
    for match in pattern.finditer(text):
        start = text.find("{", match.end() - 1)
        if start == -1:
            continue

        depth = 0
        for index in range(start, len(text)):
            if text[index] == "{":
                depth += 1
            elif text[index] == "}":
                depth -= 1
                if depth == 0:
                    blocks.append(text[match.start() : index + 1])
                    break
    return blocks


class AstroDocsConfigurationTest(unittest.TestCase):
    def test_astro_docs_source_tree_exists(self) -> None:
        app_root = Path("apps/astro-docs")

        self.assertTrue(app_root.is_dir())
        self.assertTrue(Path("apps/astro-docs/package.json").is_file())
        self.assertTrue(Path("apps/astro-docs/astro.config.mjs").is_file())
        self.assertTrue(Path("apps/astro-docs/Dockerfile").is_file())
        self.assertTrue(Path("apps/astro-docs/src/content/docs/index.mdx").is_file())

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

        ingress_blocks = _extract_terraform_blocks(cloudflare_tf, "ingress_rule")
        self.assertTrue(
            any(
                (
                    "hostname = var.docs_hostname" in block
                    or 'hostname = "docs.magnetic-marten.com"' in block
                )
                and "service =" in block
                for block in ingress_blocks
            )
        )

        record_blocks = _extract_terraform_blocks(
            cloudflare_tf, r'resource\s+"cloudflare_record"\s+"[^"]+"\s*\{'
        )
        self.assertTrue(
            any(
                (
                    "name    = var.docs_hostname" in block
                    or 'name    = "docs.magnetic-marten.com"' in block
                    or "name = var.docs_hostname" in block
                    or 'name = "docs.magnetic-marten.com"' in block
                )
                and 'type    = "CNAME"' in block
                and "proxied = true" in block
                and "cfargotunnel.com" in block
                for block in record_blocks
            )
        )

        self.assertIn("docs 300 IN A", coredns)
        self.assertIn("Docs:", homepage)
        self.assertIn("href: https://{{ homelab_effective.domain.docs_internal }}", homepage)

        docs_app = next((app for app in catalog["applications"] if app["id"] == "docs"), None)
        self.assertIsNotNone(docs_app)
        self.assertTrue(docs_app.get("homepage_entry_required"))
        self.assertEqual(docs_app.get("homepage_href"), "https://{{ homelab_effective.domain.docs_internal }}")

    def test_astro_docs_is_not_cloudflare_access_protected(self) -> None:
        cloudflare_tf = Path("opentofu/cloudflare/main.tf").read_text()
        access_application_blocks = _extract_terraform_blocks(
            cloudflare_tf, r'resource\s+"cloudflare_access_application"\s+"[^"]+"\s*\{'
        )
        access_policy_blocks = _extract_terraform_blocks(
            cloudflare_tf, r'resource\s+"cloudflare_access_policy"\s+"[^"]+"\s*\{'
        )

        self.assertNotIn('resource "cloudflare_access_application" "docs"', cloudflare_tf)
        self.assertNotIn('resource "cloudflare_access_policy" "docs"', cloudflare_tf)
        self.assertFalse(
            any(
                re.search(
                    r'(?:domain|hostname)\s*=\s*(?:var\.docs_[A-Za-z0-9_]+|\"docs\.(?:magnetic-marten\.com|homelab\.magnetic-marten\.com)\")',
                    block,
                )
                for block in access_application_blocks
            )
        )
        self.assertFalse(
            any(
                re.search(
                    r'application_id\s*=\s*cloudflare_access_application\.[A-Za-z0-9_]*docs[A-Za-z0-9_]*\.id',
                    block,
                )
                for block in access_policy_blocks
            )
        )


if __name__ == "__main__":
    unittest.main()
