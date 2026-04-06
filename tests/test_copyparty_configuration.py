import unittest
from pathlib import Path
import json


class CopypartyConfigurationTest(unittest.TestCase):
    def test_copyparty_repo_surfaces_are_wired(self) -> None:
        catalog = json.loads(Path("docs/application-catalog.json").read_text())
        main_yml = Path("ansible/group_vars/all/main.yml").read_text()
        homepage = Path("kubernetes/base/homepage/manifests.yaml.j2").read_text()
        coredns = Path("kubernetes/base/coredns/manifests.yaml.j2").read_text()
        storage_playbook = Path("ansible/playbooks/32-configure-stateful-storage.yml").read_text()

        copyparty_dir = Path("apps/copyparty")
        copyparty_manifest = Path("kubernetes/base/copyparty/manifests.yaml.j2")

        application_ids = {application["id"] for application in catalog["applications"]}
        self.assertIn("copyparty", application_ids)
        self.assertNotIn("quickdrop", application_ids)

        self.assertIn("copyparty:", main_yml)
        self.assertIn("copyparty_share:", main_yml)
        self.assertIn("copyparty_ingest:", main_yml)

        self.assertTrue((copyparty_dir / "README.md").is_file())
        self.assertTrue((copyparty_dir / "copyparty.conf.j2").is_file())

        self.assertIn("- Copyparty:", homepage)
        self.assertIn("href: https://{{ homelab_effective.domain.share_internal }}", homepage)
        self.assertIn("siteMonitor: https://{{ homelab_effective.domain.share_internal }}/", homepage)
        self.assertIn("share 300 IN A", coredns)

        self.assertTrue(copyparty_manifest.is_file())

        self.assertIn(
            (
                "    - name: Mount read-only ingest storage for Copyparty\n"
                "      ansible.posix.mount:\n"
                "        path: \"{{ homelab_effective.storage.copyparty_ingest.worker_mount_path }}\"\n"
                "        src: \"{{ homelab_effective.storage.copyparty_ingest.proxmox_export_path }}\"\n"
                "        fstype: nfs\n"
                "        opts: ro"
            ),
            storage_playbook,
        )


if __name__ == "__main__":
    unittest.main()
