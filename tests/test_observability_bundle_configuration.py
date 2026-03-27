import json
import unittest
from pathlib import Path


class ObservabilityBundleConfigurationTest(unittest.TestCase):
    def test_catalog_homepage_and_coredns_cover_observability_apps(self) -> None:
        catalog = json.loads(Path("docs/application-catalog.json").read_text())
        homepage = Path("kubernetes/base/homepage/manifests.yaml.j2").read_text()
        coredns = Path("kubernetes/base/coredns/manifests.yaml.j2").read_text()

        expected = {
            "changedetection": (
                "ChangeDetection",
                "https://{{ homelab_effective.domain.changedetection }}",
                "changedetection 300 IN A",
            ),
            "uptime-kuma": (
                "Uptime Kuma",
                "https://{{ homelab_effective.domain.kuma }}",
                "kuma 300 IN A",
            ),
            "ntfy": (
                "ntfy",
                "https://{{ homelab_effective.domain.ntfy }}",
                "ntfy 300 IN A",
            ),
            "glances": (
                "Glances",
                "https://{{ homelab_effective.domain.glances }}",
                "glances 300 IN A",
            ),
        }

        entries = {application["id"]: application for application in catalog["applications"]}

        for app_id, (title, href, dns_snippet) in expected.items():
            with self.subTest(app=app_id):
                self.assertIn(app_id, entries)
                self.assertTrue(entries[app_id]["homepage_entry_required"])
                self.assertEqual(title, entries[app_id]["homepage_title"])
                self.assertEqual(href, entries[app_id]["homepage_href"])
                self.assertIn(title, homepage)
                self.assertIn(href, homepage)
                self.assertIn(dns_snippet, coredns)

        self.assertIn("type: glances", homepage)
        self.assertIn("metric: info", homepage)
        self.assertIn(
            "siteMonitor: http://{{ homelab_effective.dev_admin.ip }}:{{ homelab_effective.apps.glances.port }}/api/4/all",
            homepage,
        )
        self.assertNotIn("description: Dev admin VM metrics", homepage)
        self.assertIn('apiGroups: ["networking.k8s.io"]', homepage)
        self.assertIn('resources: ["ingresses"]', homepage)


if __name__ == "__main__":
    unittest.main()
