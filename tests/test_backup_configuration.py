import unittest
from pathlib import Path


BACKUP_UUID = "c58cca5f-7a37-4e08-aa0e-ba02c66126be"


class BackupConfigurationTest(unittest.TestCase):
    def test_backup_mount_uses_stable_filesystem_uuid(self) -> None:
        main_yml = Path("ansible/group_vars/all/main.yml").read_text()

        self.assertIn(f"backup_mount_src: UUID={BACKUP_UUID}", main_yml)
        self.assertIn('backup_format_device: ""', main_yml)
        self.assertNotIn("backup_device:", main_yml)
        self.assertNotIn("/dev/sda1", main_yml)

    def test_backup_playbook_mounts_by_mount_source_not_format_device(self) -> None:
        playbook = Path("ansible/playbooks/50-configure-backups.yml").read_text()

        self.assertIn("backup_mount_src:", playbook)
        self.assertIn("backup_format_device:", playbook)
        self.assertIn("src: \"{{ backup_mount_src }}\"", playbook)
        self.assertIn("dev: \"{{ backup_format_device }}\"", playbook)
        self.assertIn("homelab_effective.proxmox.backup_mount_src", playbook)
        self.assertIn("homelab_effective.proxmox.backup_format_device", playbook)


if __name__ == "__main__":
    unittest.main()
