import unittest
from pathlib import Path


class GlancesConfigurationTest(unittest.TestCase):
    def test_dev_admin_playbook_and_templates_cover_glances_service(self) -> None:
        main_yml = Path("ansible/group_vars/all/main.yml").read_text()
        playbook = Path("ansible/playbooks/35-configure-dev-admin.yml").read_text()
        service_template = Path("ansible/templates/glances.service.j2")
        config_template = Path("ansible/templates/glances.conf.j2")
        ingress_manifest = Path("kubernetes/base/glances/manifests.yaml.j2")

        self.assertIn("glances:", main_yml)
        self.assertIn("host: glances.homelab.magnetic-marten.com", main_yml)
        self.assertTrue(service_template.exists())
        self.assertTrue(config_template.exists())
        self.assertTrue(ingress_manifest.exists())

        self.assertIn("Create glances system user", playbook)
        self.assertIn("Install Glances in dedicated virtualenv", playbook)
        self.assertIn("Patch Glances web UI TemplateResponse compatibility", playbook)
        self.assertIn('TemplateResponse(request, "index.html"', playbook)
        self.assertIn('TemplateResponse(request, "browser.html"', playbook)
        self.assertIn("Enable and start glances service", playbook)
        self.assertIn("--enable-mcp", service_template.read_text())
        self.assertIn("ExecStart=", service_template.read_text())
        self.assertIn("{{ homelab_effective.domain.glances }}", ingress_manifest.read_text())


if __name__ == "__main__":
    unittest.main()
