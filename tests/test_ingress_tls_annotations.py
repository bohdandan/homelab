import unittest
from pathlib import Path


class IngressTLSAnnotationsTest(unittest.TestCase):
    def test_tls_ingresses_declare_cert_manager_cluster_issuer(self) -> None:
        manifests = [
            Path("kubernetes/base/homepage/manifests.yaml.j2"),
            Path("kubernetes/base/n8n/manifests.yaml.j2"),
            Path("kubernetes/base/home-assistant-proxy/manifests.yaml.j2"),
            Path("kubernetes/base/copyparty/manifests.yaml.j2"),
            Path("kubernetes/base/changedetection/manifests.yaml.j2"),
            Path("kubernetes/base/uptime-kuma/manifests.yaml.j2"),
            Path("kubernetes/base/ntfy/manifests.yaml.j2"),
            Path("kubernetes/base/glances/manifests.yaml.j2"),
            Path("kubernetes/base/cloudbeaver/manifests.yaml.j2"),
        ]

        expected_line = 'cert-manager.io/cluster-issuer: "{{ homelab_effective.cert_manager.cluster_issuer_name }}"'

        missing = []
        for manifest in manifests:
            text = manifest.read_text()
            if expected_line not in text:
                missing.append(str(manifest))

        self.assertEqual([], missing)


if __name__ == "__main__":
    unittest.main()
