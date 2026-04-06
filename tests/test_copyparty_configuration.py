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
        self.assertIn("xff-hdr: x-forwarded-for", config)
        self.assertIn("xff-src: 10.42.0.0/16", config)
        self.assertIn("rproxy: -1", config)
        self.assertIn("dont-ban: any", config)
        self.assertIn("{% if homelab_copyparty_ingest_ready | default(false) %}", config)

    def test_copyparty_manifest_owns_live_share_surface(self) -> None:
        manifest = Path("kubernetes/base/copyparty/manifests.yaml.j2").read_text()

        self.assertIn("kind: Namespace", manifest)
        self.assertIn("kind: Secret", manifest)
        self.assertIn("name: copyparty-config", manifest)
        self.assertIn("kind: Deployment", manifest)
        self.assertIn("kind: Service", manifest)
        self.assertIn("kind: Ingress", manifest)
        self.assertIn("kubernetes.io/hostname: {{ homelab_effective.k3s.worker.name }}", manifest)
        self.assertIn("path: {{ homelab_effective.storage.copyparty_share.mount_path }}", manifest)
        self.assertIn("path: {{ homelab_effective.storage.copyparty_ingest.worker_mount_path }}", manifest)
        self.assertIn("mountPath: /srv/share", manifest)
        self.assertIn("mountPath: /srv/ingest", manifest)
        self.assertIn("mountPath: /srv/ingest/lost+found", manifest)
        self.assertIn("{% if homelab_copyparty_ingest_ready | default(false) %}", manifest)
        self.assertIn("checksum/copyparty-config", manifest)
        self.assertIn("mountPath: /etc/copyparty/copyparty.conf", manifest)
        self.assertIn("secretName: copyparty-config", manifest)
        self.assertIn("name: copyparty-ingest-lost-found-shadow", manifest)
        self.assertIn("emptyDir: {}", manifest)
        self.assertIn('type: Directory', manifest)
        self.assertIn("port: 80", manifest)
        self.assertIn('cert-manager.io/cluster-issuer: "{{ homelab_effective.cert_manager.cluster_issuer_name }}"', manifest)
        self.assertIn("{{ homelab_effective.domain.share }}", manifest)
        self.assertIn("{{ homelab_effective.domain.share_internal }}", manifest)
        self.assertIn("name: copyparty", manifest)

    def test_copyparty_operator_surfaces_replace_quickdrop(self) -> None:
        homepage = Path("kubernetes/base/homepage/manifests.yaml.j2").read_text()
        uptime_kuma = Path("apps/uptime-kuma/config/desired-state.yaml.j2").read_text()
        readme = Path("README.md").read_text()

        self.assertIn("- Copyparty:", homepage)
        self.assertIn("namespace: {{ homelab_effective.apps.copyparty.namespace }}", homepage)
        self.assertIn("podSelector: app=copyparty", homepage)
        self.assertNotIn("apps.quickdrop", homepage)
        self.assertNotIn("podSelector: app=quickdrop", homepage)

        self.assertIn("- name: Copyparty", uptime_kuma)
        self.assertNotIn("- name: QuickDrop", uptime_kuma)

        self.assertIn("Copyparty", readme)
        self.assertNotIn("Public direct ingress for QuickDrop", readme)
        self.assertNotIn("deploys QuickDrop", readme)
        self.assertNotIn("QuickDrop, with Copyparty migration work in progress", readme)

    def test_deploy_playbook_wires_copyparty_rollout(self) -> None:
        playbook = Path("ansible/playbooks/40-deploy-apps.yml").read_text()

        self.assertIn("homelab_copyparty_secrets_ready", playbook)
        self.assertIn("homelab_copyparty_share_ready", playbook)
        self.assertIn("homelab_copyparty_ingest_ready", playbook)
        self.assertIn("homelab_copyparty_storage_ready", playbook)
        self.assertIn("Check Copyparty share mount readiness on the worker", playbook)
        self.assertIn("Check Copyparty ingest mount readiness on the worker", playbook)
        self.assertIn("findmnt -n -M {{ homelab_effective.storage.copyparty_share.mount_path }}", playbook)
        self.assertIn("findmnt -n -M {{ homelab_effective.storage.copyparty_ingest.worker_mount_path }}", playbook)
        self.assertIn("delegate_to: \"{{ groups['k3s_worker'][0] }}\"", playbook)
        self.assertIn("The removable ingest", playbook)
        self.assertIn("copyparty_ingest_mount.stdout in ['nfs', 'nfs4']", playbook)
        self.assertIn("copyparty_share_mount.stdout == 'ext4'", playbook)
        self.assertIn("Render Copyparty manifest", playbook)
        self.assertIn("../../kubernetes/base/copyparty/manifests.yaml.j2", playbook)
        self.assertIn("homelab_copyparty_ingest_ready: \"{{ homelab_copyparty_ingest_ready | bool }}\"", playbook)
        self.assertIn("Delete legacy QuickDrop ingress before Copyparty hostname cutover", playbook)
        self.assertIn("kubectl delete ingress quickdrop -n quickdrop --ignore-not-found=true --wait=true --timeout=240s", playbook)
        self.assertIn("Apply Copyparty manifest", playbook)
        self.assertIn("Wait for Copyparty deployment", playbook)
        self.assertIn("deployment/copyparty -n {{ homelab_effective.apps.copyparty.namespace }}", playbook)
        self.assertIn("Delete legacy QuickDrop namespace after Copyparty cutover", playbook)
        self.assertNotIn("Render QuickDrop manifest", playbook)
        self.assertNotIn("Apply QuickDrop manifest", playbook)
        self.assertNotIn("Wait for QuickDrop deployment", playbook)
        self.assertNotIn("apps.quickdrop", playbook)

    def test_stateful_storage_playbook_handles_missing_ingest_disk(self) -> None:
        playbook = Path("ansible/playbooks/32-configure-stateful-storage.yml").read_text()

        self.assertIn("sg3-utils", playbook)
        self.assertIn("rescan-scsi-bus -r", playbook)
        self.assertIn("Remove ingest NFS export when the removable SSD is absent", playbook)
        self.assertIn("Force-unmount worker ingest path when the removable SSD is absent", playbook)
        self.assertIn("Remove worker ingest fstab entry when the removable SSD is absent", playbook)
        self.assertIn("Remove stale worker ingest mountpoint when the removable SSD is absent", playbook)
        self.assertIn("hostvars[groups['proxmox'][0]].copyparty_ingest_device.rc != 0", playbook)

    def test_quickdrop_manifest_is_removed(self) -> None:
        self.assertFalse(Path("kubernetes/base/quickdrop/manifests.yaml.j2").exists())


if __name__ == "__main__":
    unittest.main()
