# Plugin lives at the repo root, with its MCP config inline in plugin.json

The plugin root is the repo root (`.claude-plugin/plugin.json`), so `src/`, `bruno/` and tests stay
where they are. The plugin declares its MCP server inline under `mcpServers` in `plugin.json`
(using `${CLAUDE_PLUGIN_ROOT}` and `${user_config.*}`), because the root `.mcp.json` would otherwise
be read as the plugin's config. The root `.mcp.json` stays a development-only config: it runs the
server from source through mise under the name `biso24-dev`, so it never collides with an installed
`biso24` plugin.

## Considered Options

- Plugin in a `plugins/biso24/` subfolder: cleaner install payload, but splits the plugin from its source.
- Dropping the dev `.mcp.json` and developing only via `--plugin-dir`: needs a rebuild on every change.
