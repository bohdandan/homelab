import unittest
from pathlib import Path


class CopypartyConfigurationTest(unittest.TestCase):
    def test_copyparty_app_owned_config_covers_accounts_and_volumes(self) -> None:
        copyparty_dir = Path("apps/copyparty")
        readme = (copyparty_dir / "README.md").read_text()
        config = (copyparty_dir / "copyparty.conf.j2").read_text()

        self.assertIn("# Copyparty", readme)
        self.assertIn("port-forward svc/copyparty 8088:80", readme)
        self.assertIn("[accounts]", config)
        self.assertIn("[global]", config)
        self.assertIn("shr", config)
        self.assertIn("[/share]", config)
        self.assertIn("/srv/share", config)
        self.assertIn("[/ingest]", config)
        self.assertIn("/srv/ingest", config)
        self.assertIn("rw:", config)
        self.assertIn("r:", config)

    def test_copyparty_manifest_mounts_config_and_stays_off_live_hostnames(self) -> None:
        manifest = Path("kubernetes/base/copyparty/manifests.yaml.j2").read_text()

        self.assertIn("kind: Namespace", manifest)
        self.assertIn("kind: Secret", manifest)
        self.assertIn("name: copyparty-config", manifest)
        self.assertIn("kind: Deployment", manifest)
        self.assertIn("kind: Service", manifest)
        self.assertIn("kubernetes.io/hostname: {{ homelab_effective.k3s.worker.name }}", manifest)
        self.assertIn("path: {{ homelab_effective.apps.copyparty.share_host_path }}", manifest)
        self.assertIn("path: {{ homelab_effective.apps.copyparty.ingest_mount_path }}", manifest)
        self.assertIn("mountPath: /srv/share", manifest)
        self.assertIn("mountPath: /srv/ingest", manifest)
        self.assertIn("checksum/copyparty-config", manifest)
        self.assertIn("mountPath: /etc/copyparty/copyparty.conf", manifest)
        self.assertIn("secretName: copyparty-config", manifest)
        self.assertIn('type: Directory', manifest)
        self.assertIn("port: 80", manifest)
        self.assertNotIn("kind: Ingress", manifest)
        self.assertNotIn("homelab_effective.domain.share", manifest)
        self.assertNotIn("homelab_effective.domain.share_internal", manifest)

    def test_deploy_playbook_wires_copyparty_rollout(self) -> None:
        playbook = Path("ansible/playbooks/40-deploy-apps.yml").read_text()

        self.assertIn("homelab_copyparty_secrets_ready", playbook)
        self.assertIn("homelab_copyparty_storage_ready", playbook)
        self.assertIn("Check Copyparty share mount readiness on the worker", playbook)
        self.assertIn("Check Copyparty ingest mount readiness on the worker", playbook)
        self.assertIn("findmnt -n -M {{ homelab_effective.apps.copyparty.share_host_path }}", playbook)
        self.assertIn("findmnt -n -M {{ homelab_effective.apps.copyparty.ingest_mount_path }}", playbook)
        self.assertIn("delegate_to: \"{{ groups['k3s_worker'][0] }}\"", playbook)
        self.assertIn("Skipping Copyparty until the dedicated share and ingest mounts are ready", playbook)
        self.assertIn("copyparty_ingest_mount.stdout in ['nfs', 'nfs4']", playbook)
        self.assertIn("Render Copyparty manifest", playbook)
        self.assertIn("../../kubernetes/base/copyparty/manifests.yaml.j2", playbook)
        self.assertIn("Apply Copyparty manifest", playbook)
        self.assertIn("Wait for Copyparty deployment", playbook)
        self.assertIn("deployment/copyparty -n {{ homelab_effective.apps.copyparty.namespace }}", playbook)


if __name__ == "__main__":
    unittest.main()
