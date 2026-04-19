import unittest
from pathlib import Path


class CopypartyConfigurationTest(unittest.TestCase):
    def _section(self, content: str, heading: str) -> str:
        start = content.index(heading)
        next_heading = content.find("\n[/", start + len(heading))
        if next_heading == -1:
            return content[start:]
        return content[start:next_heading]

    def test_copyparty_app_owned_config_covers_accounts_and_volumes(self) -> None:
        copyparty_dir = Path("apps/copyparty")
        readme = (copyparty_dir / "README.md").read_text()
        config = (copyparty_dir / "copyparty.conf.j2").read_text()

        self.assertIn("# Copyparty", readme)
        self.assertIn("port-forward svc/copyparty 8088:80", readme)
        self.assertIn("[accounts]", config)
        self.assertIn("guest:", config)
        self.assertIn("manager:", config)
        self.assertIn("[global]", config)
        self.assertIn("shr", config)
        self.assertIn("[/share]", config)
        self.assertIn("/srv/share", config)
        self.assertIn("[/ingest]", config)
        self.assertIn("/srv/ingest", config)
        self.assertIn("hist: /srv/share/.hist/ingest", config)
        self.assertIn("rw: {{ copyparty_admin_name }}, manager", config)
        self.assertIn("r: {{ copyparty_admin_name }}, guest", config)
        self.assertIn("rw:", config)
        self.assertIn("r:", config)
        self.assertIn("xff-hdr: x-forwarded-for", config)
        self.assertIn("xff-src: 10.42.0.0/16", config)
        self.assertIn("rproxy: -1", config)
        self.assertIn("dont-ban: any", config)
        self.assertIn('localStorage.getItem("acode2")', config)
        self.assertIn('localStorage.setItem("acode2","mp3")', config)
        self.assertIn("{% if homelab_copyparty_ingest_ready | default(false) %}", config)

    def test_copyparty_admin_can_manage_internal_share_only(self) -> None:
        config = Path("apps/copyparty/copyparty.conf.j2").read_text()
        share_config = self._section(config, "[/share]")
        ingest_config = self._section(config, "[/ingest]")

        self.assertIn("rw: {{ copyparty_admin_name }}, manager", share_config)
        self.assertIn("m: {{ copyparty_admin_name }}", share_config)
        self.assertIn("d: {{ copyparty_admin_name }}", share_config)

        self.assertIn("r: {{ copyparty_admin_name }}, guest", ingest_config)
        self.assertNotIn("rw:", ingest_config)
        self.assertNotIn("m:", ingest_config)
        self.assertNotIn("d:", ingest_config)

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
        self.assertIn("{% if homelab_effective.storage.copyparty_ingest.filesystem_type == 'ext4' %}", manifest)
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

    def test_copyparty_role_passwords_are_stored_in_sops(self) -> None:
        secrets = Path("ansible/group_vars/all/secrets.sops.yaml").read_text()

        self.assertIn("copyparty_guest_password:", secrets)
        self.assertIn("copyparty_manager_password:", secrets)

    def test_copyparty_ingest_disk_config_matches_the_current_recording_ssd(self) -> None:
        main_yml = Path("ansible/group_vars/all/main.yml").read_text()

        self.assertIn("copyparty_ingest:", main_yml)
        self.assertIn("proxmox_device: /dev/sdb1", main_yml)
        self.assertIn("filesystem_type: exfat", main_yml)
        self.assertIn("filesystem_label: NINJA", main_yml)
        self.assertIn("filesystem_uuid: 651F-B1B5", main_yml)

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
        self.assertIn("copyparty_ingest_mount.stdout == 'cifs'", playbook)
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
        self.assertIn("samba", playbook)
        self.assertIn("cifs-utils", playbook)
        self.assertIn("Manage read-only Samba ingest share for the worker", playbook)
        self.assertIn("Remove read-only Samba ingest share when the removable SSD is absent", playbook)
        self.assertIn("name: smbd", playbook)
        self.assertIn("fstype: cifs", playbook)
        self.assertIn("Force-unmount worker ingest path when the removable SSD is absent", playbook)
        self.assertIn("Remove worker ingest fstab entry when the removable SSD is absent", playbook)
        self.assertIn("Remove stale worker ingest mountpoint when the removable SSD is absent", playbook)
        self.assertIn("hostvars[groups['proxmox'][0]].copyparty_ingest_device.rc != 0", playbook)

    def test_copyparty_ingest_reconcile_automation_is_repo_managed(self) -> None:
        script = Path("apps/copyparty/bin/reconcile-ingest.sh").read_text()
        service = Path("ansible/templates/copyparty-ingest-reconcile.service.j2").read_text()
        timer = Path("ansible/templates/copyparty-ingest-reconcile.timer.j2").read_text()
        playbook = Path("ansible/playbooks/35-configure-dev-admin.yml").read_text()

        self.assertIn("ansible/runtime/copyparty-ingest-reconcile.lock", script)
        self.assertIn("ansible/runtime/copyparty-ingest-inventory.yml", script)
        self.assertIn("flock", script)
        self.assertIn("ansible/playbooks/32-configure-stateful-storage.yml", script)
        self.assertIn("ansible/playbooks/40-deploy-apps.yml", script)
        self.assertIn("preflight: missing ssh key", script)
        self.assertIn("id_ed25519_copyparty_ingest", script)
        self.assertIn("write_runtime_inventory()", script)
        self.assertIn("ansible-playbook -i \"$RUNTIME_INVENTORY\"", script)
        self.assertIn("ansible_connection: local", script)
        self.assertIn("ansible_ssh_private_key_file: $SSH_KEY", script)
        self.assertIn("proxmox-01:", script)
        self.assertIn("k3s_cluster:", script)
        self.assertIn("state unknown, skipping reconcile", script)
        self.assertIn("ingest attached, reconciling", script)
        self.assertIn("ingest removed, reconciling", script)
        self.assertIn("ingest present, no change", script)
        self.assertIn("ingest absent, no change", script)

        self.assertIn("Type=oneshot", service)
        self.assertIn("User=dev", service)
        self.assertIn("ConditionPathExists=/home/dev/.ssh/id_ed25519_copyparty_ingest", service)

        self.assertIn("OnBootSec=1min", timer)
        self.assertIn("OnUnitActiveSec=1min", timer)

        self.assertIn("../templates/copyparty-ingest-reconcile.service.j2", playbook)
        self.assertIn("../templates/copyparty-ingest-reconcile.timer.j2", playbook)
        self.assertIn("apps/copyparty/bin/reconcile-ingest.sh", playbook)
        self.assertIn("ssh-keygen -t ed25519", playbook)
        self.assertIn("id_ed25519_copyparty_ingest", playbook)
        self.assertIn("copyparty_ingest_automation_public_key", playbook)
        self.assertIn("ansible.builtin.known_hosts", playbook)
        self.assertIn("groups['k3s_control'][0]", playbook)
        self.assertIn("argv:", playbook)
        self.assertIn("rsync", playbook)
        self.assertIn("--exclude=runtime/venvs/", playbook)
        self.assertIn("homelab/ansible/", playbook)
        self.assertIn("homelab/apps/", playbook)
        self.assertIn("homelab/kubernetes/", playbook)
        self.assertIn("Remove locally generated runtime virtualenvs from the dev workspace checkout", playbook)
        self.assertIn("ansible.posix.authorized_key", playbook)
        self.assertIn("Authorize Copyparty ingest automation SSH key on the control-plane node", playbook)
        self.assertIn("daemon_reload: true", playbook)
        self.assertIn("name: copyparty-ingest-reconcile.timer", playbook)
        self.assertIn("enabled: true", playbook)
        self.assertIn("state: >", playbook)

    def test_quickdrop_manifest_is_removed(self) -> None:
        self.assertFalse(Path("kubernetes/base/quickdrop/manifests.yaml.j2").exists())

    def test_load_context_derives_runtime_paths_instead_of_storing_jinja_in_main_yml(self) -> None:
        main_yml = Path("ansible/group_vars/all/main.yml").read_text()
        load_context = Path("ansible/tasks/load_context.yml").read_text()

        self.assertNotIn("lookup('env', 'HOME')", main_yml)
        self.assertNotIn("{{ homelab.ssh.private_key_path }}", main_yml)
        self.assertNotIn("{{ playbook_dir | default('.') }}", main_yml)

        self.assertIn("'public_key_path': (lookup('env', 'HOME')", load_context)
        self.assertIn("'private_key_path': (lookup('env', 'HOME')", load_context)
        self.assertIn("'ssh_private_key_file': (lookup('env', 'HOME')", load_context)
        self.assertIn("'stage_dir': ((playbook_dir | default('.'))", load_context)
        self.assertIn("'token_file': ((playbook_dir | default('.'))", load_context)


if __name__ == "__main__":
    unittest.main()
