import unittest
from pathlib import Path


class QuickDropConfigurationTest(unittest.TestCase):
    def test_quickdrop_repo_surfaces_are_wired(self) -> None:
        main_yml = Path("ansible/group_vars/all/main.yml").read_text()
        homepage = Path("kubernetes/base/homepage/manifests.yaml.j2").read_text()
        coredns = Path("kubernetes/base/coredns/manifests.yaml.j2").read_text()
        cloudflare = Path("opentofu/cloudflare/main.tf").read_text()
        manifest = Path("kubernetes/base/quickdrop/manifests.yaml.j2").read_text()
        storage_playbook = Path("ansible/playbooks/32-configure-stateful-storage.yml").read_text()

        self.assertIn("share:", main_yml)
        self.assertIn("share_internal:", main_yml)
        self.assertIn("quickdrop:", main_yml)
        self.assertIn("metadata_storage", main_yml)
        self.assertIn("files_host_path", main_yml)
        self.assertIn("quickdrop_share:", main_yml)

        self.assertIn("QuickDrop", homepage)
        self.assertIn("{{ homelab_effective.domain.share_internal }}", homepage)

        self.assertIn("share 300 IN A", coredns)

        self.assertIn('resource "cloudflare_record" "share"', cloudflare)
        self.assertIn("proxied = false", cloudflare)
        self.assertIn("quickdrop-metadata", manifest)
        self.assertIn("hostPath:", manifest)
        self.assertIn("{{ homelab_effective.apps.quickdrop.files_host_path }}", manifest)
        self.assertIn("Attach dedicated QuickDrop share disk to the stateful worker VM", storage_playbook)
        self.assertIn("backup=0", storage_playbook)
        self.assertIn("Mount dedicated QuickDrop share disk", storage_playbook)
        self.assertIn("blockdev --rereadpt", storage_playbook)
        self.assertNotIn("partprobe", storage_playbook)


if __name__ == "__main__":
    unittest.main()
