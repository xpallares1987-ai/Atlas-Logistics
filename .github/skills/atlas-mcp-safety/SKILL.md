---
name: atlas-mcp-safety
description: Diagnose and repair broken Model Context Protocol (MCP) server configuration, keep only verified servers, and validate the environment before reloading or reusing tools.
---

# Atlas MCP Safety

This skill helps recover from broken or stale MCP server configurations in VS Code and other agent environments. It is specifically tuned for situations where unsupported server entries, legacy config drift, or invalid package names prevent agent tools from starting.

## When to Use This Skill

Use this skill when:

- Multiple MCP servers fail to start
- The config contains `dnx`, `docker`, `workiq`, or stale legacy entries
- JSON validation fails or there is trailing garbage in `mcp.json`
- A tool/package appears to exist but does not actually run in this environment
- You need to keep the environment minimal, stable, and known-good

## Core Principle

Keep only servers that are verified to work in this environment. Prefer minimal, stable configs over a long list of experimental or unsupported integrations.

## Workflow

### 1. Identify the breakage

Check the relevant MCP config files first:

- workspace config: `.vscode/mcp.json`
- user config: `C:\Users\<user>\AppData\Roaming\Code\User\mcp.json`

Look for:

- invalid package names
- unsupported command patterns
- stale entries left over from older setups
- trailing legacy content after valid JSON
- server entries that rely on missing local executables or unsupported runtime wrappers

### 2. Remove unsupported or unverified entries

Remove or disable entries that fail validation or startup, especially:

- `com.microsoft/nuget` when it depends on an invalid or untrusted package setup
- `MCP_DOCKER` when Docker is not verified to be installed and running
- legacy or experimental entries known not to work in this environment
- any entry that does not have a clear runtime path or execution contract

### 3. Prefer verified replacements

When a server is broken, choose a known-good alternative instead of reusing the invalid setup.

Examples:

- Use GitHub MCP over a broken custom or stale GitHub config
- Use Playwright via `npx -y @playwright/mcp@latest` instead of a local missing install
- Use Microsoft Docs HTTP MCP when available and stable

### 4. Keep the config minimal

The correct target for this environment is usually a small list such as:

```json
{
  "servers": {
    "io.github.github/github-mcp-server": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "cwd": "${workspaceFolder}"
    },
    "microsoftdocs/mcp": {
      "type": "http",
      "url": "https://learn.microsoft.com/api/mcp"
    }
  },
  "inputs": []
}
```

### 5. Validate before continuing

Before claiming the fix is complete:

- ensure the JSON parses successfully
- run the command directly if it is a stdio MCP server
- confirm the tool is actually executable in this environment
- reopen the workspace or reload VS Code so discovery refreshes the config

### 6. Recheck startup status

After reloading:

- confirm the remaining MCP servers start cleanly
- authorize or start the GitHub server if prompted
- confirm there are no startup errors for the active tool list

## Decision Points

- If a package name is wrong or a runtime command is unavailable, do not guess a second time — replace it with a verified alternative.
- If a server is not required for the current task, keep the environment minimal and remove it.
- If the config contains garbage after a valid object, fix the JSON structure before adding anything new.
- If Docker or a local installation is not verified, do not rely on it for MCP startup.

## Completion Checks

A fix is complete only when all are true:

- the MCP config is valid JSON
- only verified servers remain enabled
- relevant commands were tested or validated in the environment
- VS Code reload or workspace reopen succeeds
- the server list starts without startup errors

## Example Prompts

- "Multiple MCP servers failed to start; fix the config and keep only working ones."
- "The NuGet MCP entry is broken; replace it with a valid minimal setup."
- "My MCP config has stale legacy entries and invalid JSON; clean it up safely."
- "Use only verified MCP servers for this repo and reload the environment."

## Related Customizations

This skill pairs well with:

- repo-level safety hooks for destructive command blocking
- MCP configuration checklists for startup validation
- custom agent prompts that explicitly require config verification before edits
