# SLZB-MR4 Home Assistant Design

## Goal

Add the newly attached SMLIGHT SLZB-MR4 to the homelab so Home Assistant can use:

- Zigbee through Zigbee2MQTT
- Matter/Thread through the MR4's Thread border-router capability

The result should fit the repo's infrastructure-as-code pattern as closely as practical, while acknowledging that some Home Assistant UI steps remain manual.

## Constraints

- Keep the SLZB-MR4 on the LAN as a network radio appliance, not a USB passthrough device.
- Keep Zigbee infrastructure in code inside this repository.
- Keep Home Assistant running in the existing HAOS VM.
- Do not depend on the Home Assistant `SMLIGHT SLZB` device-management integration as the primary integration path for radios, because MR4 support there is still incomplete.
- Keep new operator-facing surfaces internal-only on `*.homelab.magnetic-marten.com`.

## Recommended Approach

Use the SLZB-MR4 in its native LAN-adapter model:

- run `Mosquitto` in K3s as the internal MQTT broker
- run `Zigbee2MQTT` in K3s and connect it to the MR4 Zigbee radio over TCP
- leave Thread / Matter border routing on the MR4 itself
- connect Home Assistant to:
  - Mosquitto for Zigbee2MQTT entities
  - the MR4's Thread/OTBR endpoint for Matter-over-Thread

This keeps Zigbee2MQTT and MQTT declarative in the repo while avoiding unnecessary complexity around remote USB or containerized border-router emulation.

## Why This Approach

This is the best fit because:

- the MR4 is designed to expose Zigbee and Thread radios over the network and supports simultaneous Zigbee + Thread operation
- Zigbee2MQTT explicitly supports network-connected adapters
- HAOS can consume MQTT and OTBR over the LAN without running Zigbee middleware inside the HA VM
- the repo remains the source of truth for the broker, Zigbee2MQTT, DNS, Homepage, and operational docs

## Architecture

### Components

- `SLZB-MR4`
  - physical LAN radio appliance
  - one radio used for Zigbee
  - one radio used for Thread/Matter
- `Mosquitto` in K3s
  - internal MQTT broker for Zigbee2MQTT and Home Assistant
- `Zigbee2MQTT` in K3s
  - connects to the MR4 Zigbee socket over the LAN
  - publishes to Mosquitto
- `Home Assistant OS VM`
  - connects to Mosquitto using the MQTT integration
  - connects to the MR4 Thread/OTBR endpoint through the HA Thread / OTBR flow

### Networking

- `Zigbee2MQTT` web UI:
  - `zigbee.homelab.magnetic-marten.com`
  - exposed through Traefik on the existing internal VIP `192.168.10.120`
- `Mosquitto`:
  - exposed on a dedicated internal MetalLB IP
  - not routed through Traefik, because MQTT is a raw TCP service
- `SLZB-MR4`:
  - gets its own explicit CoreDNS record, for example `slzb-mr4.homelab.magnetic-marten.com`
  - must use a stable LAN IP outside DHCP churn

## Required Inputs

The implementation needs these environment-specific values:

- a stable LAN IP for the MR4, ideally via UniFi DHCP reservation
- the Zigbee radio network endpoint from the MR4 UI
- the Thread/OTBR endpoint details from the MR4 UI

These values should become repo-managed variables once known.

## Exposure Model

### Internal-only operator surfaces

- `zigbee.homelab.magnetic-marten.com`
  - Zigbee2MQTT web UI
- `slzb-mr4.homelab.magnetic-marten.com`
  - direct device hostname for the adapter itself

### Non-HTTP service

- `Mosquitto`
  - LAN-only TCP service on a dedicated IP/port
  - intended for Home Assistant and Zigbee2MQTT, not direct browser access

## Home Assistant Boundary

Some HA steps should remain explicit manual/operator steps:

- adding or verifying the MQTT integration in Home Assistant
- adding the OTBR / Thread integration in Home Assistant if not already present
- completing any Matter commissioning flow in Home Assistant

These should be documented clearly in the repo runbook rather than hidden as live-only setup.

## Homepage

Homepage should be updated when this work lands:

- add `Zigbee2MQTT` as an operator-facing app
- optionally add the MR4 device UI if you want direct access from Homepage
- `Mosquitto` should remain a support component unless you decide its UI or management surface belongs there later

## Repo Surfaces Likely to Change

- `ansible/group_vars/all/main.yml`
- `kubernetes/base/coredns/manifests.yaml.j2`
- `kubernetes/base/homepage/manifests.yaml.j2`
- `ansible/playbooks/40-deploy-apps.yml`
- new manifests for:
  - `mosquitto`
  - `zigbee2mqtt`
- `docs/application-catalog.json`
- `README.md`
- tests covering Zigbee2MQTT, MQTT exposure, CoreDNS, and Homepage

## Testing Strategy

Implementation should verify:

- CoreDNS resolves the MR4 hostname and Zigbee2MQTT hostname correctly
- Mosquitto is reachable on its internal TCP service IP
- Zigbee2MQTT rollout succeeds
- Zigbee2MQTT can reach the MR4 Zigbee adapter endpoint
- Homepage includes the new operator-facing app entry
- Home Assistant can reach MQTT and the configured Thread/OTBR endpoint over the LAN

## Non-Goals

- public exposure of Zigbee2MQTT, Mosquitto, or the MR4
- replacing HAOS with a containerized Home Assistant
- full automation of Home Assistant UI onboarding flows
