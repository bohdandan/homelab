import unittest
from pathlib import Path


class ObservabilityManifestTest(unittest.TestCase):
    def test_kubernetes_manifests_exist_and_declare_internal_ingress(self) -> None:
        expectations = {
            Path("kubernetes/base/changedetection/manifests.yaml.j2"): [
                "kind: PersistentVolumeClaim",
                "name: changedetection",
                "host: {{ homelab_effective.domain.changedetection }}",
            ],
            Path("kubernetes/base/uptime-kuma/manifests.yaml.j2"): [
                "kind: PersistentVolumeClaim",
                "name: uptime-kuma",
                "host: {{ homelab_effective.domain.kuma }}",
            ],
            Path("kubernetes/base/ntfy/manifests.yaml.j2"): [
                "kind: PersistentVolumeClaim",
                "name: ntfy",
                "host: {{ homelab_effective.domain.ntfy }}",
            ],
            Path("kubernetes/base/glances/manifests.yaml.j2"): [
                "kind: Service",
                "kind: Endpoints",
                "host: {{ homelab_effective.domain.glances }}",
            ],
        }

        tls_annotation = 'cert-manager.io/cluster-issuer: "{{ homelab_effective.cert_manager.cluster_issuer_name }}"'

        for manifest, snippets in expectations.items():
            with self.subTest(manifest=str(manifest)):
                self.assertTrue(manifest.exists())
                text = manifest.read_text()
                self.assertIn(tls_annotation, text)
                for snippet in snippets:
                    self.assertIn(snippet, text)


if __name__ == "__main__":
    unittest.main()
