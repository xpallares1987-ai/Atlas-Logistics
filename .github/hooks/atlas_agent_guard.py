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
    parser = argparse.ArgumentParser(description="Atlas Logistics agent safety guard")
    parser.add_argument("--event", required=True, choices=["SessionStart", "PreToolUse"])
    parser.add_argument("--tool", default="")
    parser.add_argument("--tool-command", default="")
    args = parser.parse_args()

    if args.event == "SessionStart":
        print("[Atlas Hook] SessionStart: repo safety context is active.")
        print("- Do not run destructive commands without explicit user confirmation.")
        print("- Before editing MCP config, validate the JSON and keep only known-good servers.")
        print("- Do not reintroduce legacy or unsupported MCP entries.")
        print("- Prefer minimal, verified commands and validate the result before proceeding.")
        return 0

    command_text = " ".join(part for part in [args.tool, args.tool_command] if part).strip()
    if not command_text:
        print("[Atlas Hook] PreToolUse: no command text provided; continuing with repo safety checks.")
        return 0

    lowered = _normalize(command_text)

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


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
