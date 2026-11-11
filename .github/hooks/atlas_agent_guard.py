#!/usr/bin/env python3
import argparse
import sys

BLOCK_PATTERNS = [
    "rm -rf",
    "git reset --hard",
    "git clean -fd",
    "drop table",
    "truncate ",
    "delete from",
    "gcloud projects delete",
    "kubectl delete",
    "docker system prune",
    "docker rm -f",
    "az group delete",
]

WARN_PATTERNS = [
    "mcp.json",
    "playwright",
    "npx",
    "pnpm install",
    "npm install",
    "curl",
    "wget",
]


def _normalize(command_text: str) -> str:
    return command_text.lower().strip()


def main() -> int:
    try:
        raw_cmd = " ".join(sys.argv[1:])
        if "--event SessionStart" in raw_cmd or "SessionStart" in raw_cmd:
            print("[Atlas Hook] SessionStart: repo safety context is active.")
            print("- Do not run destructive commands without explicit user confirmation.")
            print("- Before editing MCP config, validate the JSON and keep only known-good servers.")
            print("- Do not reintroduce legacy or unsupported MCP entries.")
            print("- Prefer minimal, verified commands and validate the result before proceeding.")
            return 0

        lowered = _normalize(raw_cmd)

        for pattern in BLOCK_PATTERNS:
            if pattern in lowered:
                print("[Atlas Hook] BLOCKED: destructive or risky command detected.")
                print("Reason: the command contains a pattern that can delete data or modify the environment irreversibly.")
                print("Required action: ask for explicit user confirmation and explain the impact before proceeding.")
                print(f"Detected pattern: {pattern}")
                return 2

        for pattern in WARN_PATTERNS:
            if pattern in lowered:
                print(f"[Atlas Hook] WARNING: command touches {pattern}.")
                print("Policy: validate the intent, confirm the target is appropriate, and prefer known-good minimal commands.")
                break

        if "mcp.json" in lowered or "playwright" in lowered:
            print("[Atlas Hook] MCP policy: validate JSON syntax, avoid stale/legacy entries, and keep only verified working servers.")

        return 0
    except Exception:
        return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
