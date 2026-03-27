# SLZB-MR4 Home Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add LAN-managed Mosquitto and Zigbee2MQTT for the SLZB-MR4, wire the new internal DNS and Homepage surfaces, and document the remaining Home Assistant Thread/Matter onboarding steps.

**Architecture:** Run Mosquitto and Zigbee2MQTT as internal K3s workloads, expose Zigbee2MQTT through Traefik/CoreDNS, and keep MQTT on a dedicated MetalLB IP. Treat the SLZB-MR4 as a LAN radio appliance with an explicit CoreDNS record and repo-managed adapter settings, while leaving the HAOS MQTT and Thread/Matter UI onboarding as documented operator steps.

**Tech Stack:** Ansible, K3s, Traefik, MetalLB, CoreDNS, Mosquitto, Zigbee2MQTT, SOPS, Python `unittest`

---

## File Structure

- Modify: `ansible/group_vars/all/main.yml`
  - Add internal hostnames, MQTT/Zigbee2MQTT app settings, service IPs, and MR4 adapter variables.
- Modify: `ansible/group_vars/all/secrets.sops.yaml.example`
  - Add encrypted examples for MQTT and Zigbee2MQTT secrets.
- Modify: `ansible/playbooks/40-deploy-apps.yml`
  - Render/apply Mosquitto and Zigbee2MQTT alongside existing internal workloads.
- Create: `kubernetes/base/mosquitto/manifests.yaml.j2`
  - Namespace, secret-backed config, PVC, Deployment, and LoadBalancer Service for MQTT.
- Create: `kubernetes/base/zigbee2mqtt/manifests.yaml.j2`
  - Namespace, secret/config-backed Deployment, PVC, Service, and internal Ingress for Zigbee2MQTT.
- Modify: `kubernetes/base/coredns/manifests.yaml.j2`
  - Add explicit records for `zigbee` and `slzb-mr4`, keep wildcard behavior intact.
- Modify: `kubernetes/base/homepage/manifests.yaml.j2`
  - Add Zigbee2MQTT and optionally the MR4 device UI in the correct section.
- Modify: `docs/application-catalog.json`
  - Add the Zigbee2MQTT operator-facing app entry.
- Modify: `README.md`
  - Document MR4 prerequisites, Mosquitto/Zigbee2MQTT rollout, and the manual HA MQTT + Thread/Matter steps.
- Create: `tests/test_slzb_mr4_configuration.py`
  - Assert repo surfaces, new hostnames, secrets examples, CoreDNS records, and Homepage/catalog entries.
- Modify: `tests/test_observability_manifests.py`
  - Keep existing coverage intact if shared manifest expectations need extension.

### Task 1: Add failing repo-surface tests for MQTT, Zigbee2MQTT, and MR4 wiring

**Files:**
- Create: `tests/test_slzb_mr4_configuration.py`
- Test: `tests/test_slzb_mr4_configuration.py`

- [ ] **Step 1: Write the failing test**

```python
import json
import unittest
from pathlib import Path


class SlzbMr4ConfigurationTest(unittest.TestCase):
    def test_repo_surfaces_exist_for_zigbee_stack(self) -> None:
        main_yml = Path("ansible/group_vars/all/main.yml").read_text()
        secrets_example = Path("ansible/group_vars/all/secrets.sops.yaml.example").read_text()
        coredns = Path("kubernetes/base/coredns/manifests.yaml.j2").read_text()
        homepage = Path("kubernetes/base/homepage/manifests.yaml.j2").read_text()
        catalog = json.loads(Path("docs/application-catalog.json").read_text())

        self.assertIn("zigbee:", main_yml)
        self.assertIn("slzb_mr4:", main_yml)
        self.assertIn("mosquitto:", main_yml)
        self.assertIn("mqtt_username", secrets_example)
        self.assertIn("mqtt_password", secrets_example)
        self.assertIn("zigbee2mqtt_network_key", secrets_example)
        self.assertIn("zigbee 300 IN A", coredns)
        self.assertIn("slzb-mr4 300 IN A", coredns)
        self.assertIn("Zigbee2MQTT", homepage)
        self.assertTrue(
            any(app["id"] == "zigbee2mqtt" and app["homepage_entry_required"] for app in catalog["applications"])
        )


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest tests/test_slzb_mr4_configuration.py`
Expected: FAIL because the MQTT/Zigbee2MQTT repo surfaces do not exist yet.

- [ ] **Step 3: Commit the red test**

```bash
git add tests/test_slzb_mr4_configuration.py
git commit -m "test: cover slzb mr4 repo surfaces"
```

### Task 2: Add config and secret surfaces for the Zigbee stack

**Files:**
- Modify: `ansible/group_vars/all/main.yml`
- Modify: `ansible/group_vars/all/secrets.sops.yaml.example`
- Test: `tests/test_slzb_mr4_configuration.py`

- [ ] **Step 1: Add hostnames and app settings to `main.yml`**

```yaml
    zigbee: zigbee.homelab.magnetic-marten.com
    slzb_mr4: slzb-mr4.homelab.magnetic-marten.com

  iot:
    slzb_mr4:
      ip: 192.168.10.X
      zigbee_adapter_type: zstack
      zigbee_port: 6638
      thread_otbr_url: http://192.168.10.X:8080

  apps:
    mosquitto:
      namespace: mqtt
      image: eclipse-mosquitto:2.0.22
      service_ip: 192.168.10.122
      data_storage: 5Gi
    zigbee2mqtt:
      namespace: zigbee2mqtt
      image: ghcr.io/koenkk/zigbee2mqtt:2.6.1
      data_storage: 10Gi
```

- [ ] **Step 2: Add encrypted example placeholders**

```yaml
  mqtt_username: "replace-me"
  mqtt_password: "replace-me"
  zigbee2mqtt_network_key: "replace-me"
```

- [ ] **Step 3: Run the red test again**

Run: `python3 -m unittest tests/test_slzb_mr4_configuration.py`
Expected: still FAIL because manifests, CoreDNS, and Homepage wiring are not implemented yet.

- [ ] **Step 4: Commit the config surface**

```bash
git add ansible/group_vars/all/main.yml ansible/group_vars/all/secrets.sops.yaml.example tests/test_slzb_mr4_configuration.py
git commit -m "feat: add slzb mr4 config surfaces"
```

### Task 3: Implement Mosquitto as an internal MetalLB-backed service

**Files:**
- Create: `kubernetes/base/mosquitto/manifests.yaml.j2`
- Modify: `ansible/playbooks/40-deploy-apps.yml`
- Test: `tests/test_slzb_mr4_configuration.py`

- [ ] **Step 1: Extend the failing test with Mosquitto manifest expectations**

```python
manifest = Path("kubernetes/base/mosquitto/manifests.yaml.j2")
self.assertTrue(manifest.exists())
text = manifest.read_text()
self.assertIn("name: mosquitto", text)
self.assertIn("loadBalancerIP: {{ homelab_effective.apps.mosquitto.service_ip }}", text)
self.assertIn("port: 1883", text)
self.assertIn("mqtt_username", Path("ansible/group_vars/all/secrets.sops.yaml.example").read_text())
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest tests/test_slzb_mr4_configuration.py`
Expected: FAIL because the manifest and playbook wiring do not exist.

- [ ] **Step 3: Write the minimal Mosquitto manifest and playbook wiring**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: {{ homelab_effective.apps.mosquitto.namespace }}
---
apiVersion: v1
kind: Secret
metadata:
  name: mosquitto-auth
  namespace: {{ homelab_effective.apps.mosquitto.namespace }}
stringData:
  passwordfile: |
    {{ homelab_effective.secrets.mqtt_username }}:{{ homelab_effective.secrets.mqtt_password }}
```

Add `template` + `kubectl apply` tasks in `ansible/playbooks/40-deploy-apps.yml`.

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest tests/test_slzb_mr4_configuration.py`
Expected: PASS for the Mosquitto assertions.

- [ ] **Step 5: Commit**

```bash
git add kubernetes/base/mosquitto/manifests.yaml.j2 ansible/playbooks/40-deploy-apps.yml tests/test_slzb_mr4_configuration.py
git commit -m "feat: add internal mosquitto service"
```

### Task 4: Implement Zigbee2MQTT, CoreDNS, Homepage, and docs

**Files:**
- Create: `kubernetes/base/zigbee2mqtt/manifests.yaml.j2`
- Modify: `kubernetes/base/coredns/manifests.yaml.j2`
- Modify: `kubernetes/base/homepage/manifests.yaml.j2`
- Modify: `docs/application-catalog.json`
- Modify: `ansible/playbooks/40-deploy-apps.yml`
- Modify: `README.md`
- Test: `tests/test_slzb_mr4_configuration.py`

- [ ] **Step 1: Extend the failing test with Zigbee2MQTT, CoreDNS, catalog, and README expectations**

```python
z2m = Path("kubernetes/base/zigbee2mqtt/manifests.yaml.j2")
self.assertTrue(z2m.exists())
z2m_text = z2m.read_text()
self.assertIn("name: zigbee2mqtt", z2m_text)
self.assertIn("host: {{ homelab_effective.domain.zigbee }}", z2m_text)
self.assertIn("tcp://{{ homelab_effective.iot.slzb_mr4.ip }}:{{ homelab_effective.iot.slzb_mr4.zigbee_port }}", z2m_text)
readme = Path("README.md").read_text()
self.assertIn("zigbee.homelab.magnetic-marten.com", readme)
self.assertIn("slzb-mr4.homelab.magnetic-marten.com", readme)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest tests/test_slzb_mr4_configuration.py`
Expected: FAIL because the Zigbee2MQTT manifest, DNS entries, and docs do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zigbee2mqtt
  namespace: {{ homelab_effective.apps.zigbee2mqtt.namespace }}
spec:
  template:
    spec:
      containers:
        - name: zigbee2mqtt
          image: {{ homelab_effective.apps.zigbee2mqtt.image }}
          env:
            - name: TZ
              value: UTC
```

Also:
- add explicit `zigbee` and `slzb-mr4` records to CoreDNS
- add a Homepage card for `Zigbee2MQTT`
- add the `zigbee2mqtt` app entry to `docs/application-catalog.json`
- document the MR4 prerequisites and the HA manual steps in `README.md`

- [ ] **Step 4: Run the test to verify it passes**

Run: `python3 -m unittest tests/test_slzb_mr4_configuration.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add kubernetes/base/zigbee2mqtt/manifests.yaml.j2 kubernetes/base/coredns/manifests.yaml.j2 kubernetes/base/homepage/manifests.yaml.j2 docs/application-catalog.json ansible/playbooks/40-deploy-apps.yml README.md tests/test_slzb_mr4_configuration.py
git commit -m "feat: add zigbee2mqtt and mr4 lan wiring"
```

### Task 5: Deploy, verify, and document the device-specific manual boundary

**Files:**
- Modify: `README.md`
- Test: `tests/test_slzb_mr4_configuration.py`

- [ ] **Step 1: Populate the live MR4 variables**

Record the actual device values in `ansible/group_vars/all/main.yml`:

```yaml
  iot:
    slzb_mr4:
      ip: 192.168.10.X
      zigbee_adapter_type: zstack
      zigbee_port: 6638
      thread_otbr_url: http://192.168.10.X:8080
```

- [ ] **Step 2: Re-run the local test suite**

Run: `python3 -m unittest tests/test_slzb_mr4_configuration.py tests/test_homepage_application_catalog.py tests/test_homepage_required_config.py`
Expected: PASS

- [ ] **Step 3: Apply the app deployment playbook**

Run: `SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/playbooks/40-deploy-apps.yml`
Expected: Mosquitto and Zigbee2MQTT become `Running`, Zigbee2MQTT ingress is created, and CoreDNS updates are live.

- [ ] **Step 4: Verify the live rollout**

Run:

```bash
kubectl --kubeconfig ansible/runtime/kubeconfig.raw get pods -n mqtt -n zigbee2mqtt
kubectl --kubeconfig ansible/runtime/kubeconfig.raw get svc -n mqtt mosquitto
dig +short zigbee.homelab.magnetic-marten.com
dig +short slzb-mr4.homelab.magnetic-marten.com
curl -skI https://zigbee.homelab.magnetic-marten.com
```

Expected:
- Mosquitto and Zigbee2MQTT pods are `Running`
- Mosquitto `LoadBalancer` IP is assigned
- internal DNS resolves both names
- Zigbee2MQTT UI returns `200`

- [ ] **Step 5: Update the README manual HA steps**

Document:
- add MQTT integration in HA using the Mosquitto service IP/credentials
- configure the MR4 Thread mode in its UI
- add OTBR/Thread in HA using the device OTBR endpoint
- complete Matter commissioning in the HA mobile app

- [ ] **Step 6: Commit**

```bash
git add ansible/group_vars/all/main.yml README.md tests/test_slzb_mr4_configuration.py
git commit -m "docs: record slzb mr4 rollout steps"
```
