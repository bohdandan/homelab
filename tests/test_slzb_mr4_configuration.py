import json
import unittest
from pathlib import Path


class SlzbMr4ConfigurationTest(unittest.TestCase):
    def test_repo_surfaces_exist_for_slzb_mr4_stack(self) -> None:
        main_yml = Path("ansible/group_vars/all/main.yml").read_text()
        secrets_example = Path("ansible/group_vars/all/secrets.sops.yaml.example").read_text()
        coredns = Path("kubernetes/base/coredns/manifests.yaml.j2").read_text()
        homepage = Path("kubernetes/base/homepage/manifests.yaml.j2").read_text()
        deploy_playbook = Path("ansible/playbooks/40-deploy-apps.yml").read_text()
        readme = Path("README.md").read_text()
        catalog = json.loads(Path("docs/application-catalog.json").read_text())

        self.assertIn("zigbee:", main_yml)
        self.assertIn("slzb_mr4:", main_yml)
        self.assertIn("mosquitto:", main_yml)
        self.assertIn("zigbee2mqtt:", main_yml)
        self.assertIn("mqtt_username", secrets_example)
        self.assertIn("mqtt_password", secrets_example)
        self.assertIn("zigbee2mqtt_network_key", secrets_example)
        self.assertIn("zigbee 300 IN A", coredns)
        self.assertIn("slzb-mr4 300 IN A", coredns)
        self.assertIn("Zigbee2MQTT", homepage)
        self.assertIn("{{ homelab_effective.domain.zigbee }}", homepage)
        self.assertIn("Render Mosquitto manifest", deploy_playbook)
        self.assertIn("Render Zigbee2MQTT manifest", deploy_playbook)
        self.assertIn("zigbee.homelab.magnetic-marten.com", readme)
        self.assertIn("slzb-mr4.homelab.magnetic-marten.com", readme)

        entries = {application["id"]: application for application in catalog["applications"]}
        self.assertIn("zigbee2mqtt", entries)
        self.assertTrue(entries["zigbee2mqtt"]["homepage_entry_required"])
        self.assertEqual("Zigbee2MQTT", entries["zigbee2mqtt"]["homepage_title"])
        self.assertEqual(
            "https://{{ homelab_effective.domain.zigbee }}",
            entries["zigbee2mqtt"]["homepage_href"],
        )

        mosquitto_manifest = Path("kubernetes/base/mosquitto/manifests.yaml.j2")
        zigbee_manifest = Path("kubernetes/base/zigbee2mqtt/manifests.yaml.j2")
        self.assertTrue(mosquitto_manifest.exists())
        self.assertTrue(zigbee_manifest.exists())

        mosquitto_text = mosquitto_manifest.read_text()
        zigbee_text = zigbee_manifest.read_text()
        self.assertIn("name: mosquitto", mosquitto_text)
        self.assertIn("loadBalancerIP: {{ homelab_effective.apps.mosquitto.service_ip }}", mosquitto_text)
        self.assertIn("containerPort: 1883", mosquitto_text)
        self.assertIn("name: zigbee2mqtt", zigbee_text)
        self.assertIn("host: {{ homelab_effective.domain.zigbee }}", zigbee_text)
        self.assertIn("tcp://{{ homelab_effective.iot.slzb_mr4.ip }}:{{ homelab_effective.iot.slzb_mr4.zigbee_port }}", zigbee_text)
        self.assertIn("network_key", zigbee_text)


if __name__ == "__main__":
    unittest.main()
