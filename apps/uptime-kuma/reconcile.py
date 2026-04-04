#!/usr/bin/env python3

import argparse
import json
from pathlib import Path
from typing import Any

import yaml
from uptime_kuma_api import UptimeKumaApi


MANAGED_DESCRIPTION = "Managed by homelab repo"
MANAGED_FIELDS = {
    "type",
    "url",
    "interval",
    "maxretries",
    "accepted_statuscodes",
    "description",
}
DEFAULT_ACCEPTED_STATUSCODES = ["200-299", "300-399"]


def load_desired_state(path: Path) -> list[dict[str, Any]]:
    document = yaml.safe_load(path.read_text()) or {}
    monitors = document.get("monitors", [])
    desired: list[dict[str, Any]] = []

    for monitor in monitors:
        normalized = dict(monitor)
        normalized.setdefault("description", MANAGED_DESCRIPTION)
        normalized["accepted_statuscodes"] = [
            str(code) for code in normalized.get("accepted_statuscodes", DEFAULT_ACCEPTED_STATUSCODES)
        ]
        desired.append(normalized)

    return desired


def comparable_monitor_fields(monitor: dict[str, Any]) -> dict[str, Any]:
    comparable = {key: monitor.get(key) for key in MANAGED_FIELDS}
    comparable["accepted_statuscodes"] = sorted(str(code) for code in comparable.get("accepted_statuscodes") or [])
    return comparable


def main() -> int:
    parser = argparse.ArgumentParser(description="Reconcile repo-managed Uptime Kuma monitors.")
    parser.add_argument("--api-url", required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--desired-state", required=True, type=Path)
    args = parser.parse_args()

    desired_monitors = load_desired_state(args.desired_state)

    created: list[str] = []
    updated: list[str] = []
    unchanged: list[str] = []

    with UptimeKumaApi(args.api_url) as api:
        api.login(args.username, args.password)
        existing_monitors = {monitor["name"]: monitor for monitor in api.get_monitors()}

        for desired in desired_monitors:
            name = desired["name"]
            existing = existing_monitors.get(name)

            if existing is None:
                api.add_monitor(**desired)
                created.append(name)
                continue

            if comparable_monitor_fields(existing) != comparable_monitor_fields(desired):
                api.edit_monitor(existing["id"], **desired)
                updated.append(name)
            else:
                unchanged.append(name)

    print(
        json.dumps(
            {
                "created": created,
                "updated": updated,
                "unchanged": unchanged,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
