# Plugin lives at the repo root, with its MCP config inline in plugin.json

The plugin root is the repo root (`.claude-plugin/plugin.json`), so `src/`, `bruno/` and tests stay
where they are. The plugin declares its MCP server inline under `mcpServers` in `plugin.json`
(using `${CLAUDE_PLUGIN_ROOT}` and `${user_config.*}`).

The development server runs from source through mise under the name `biso24-dev`, so it never
collides with an installed `biso24` plugin. It is registered in Claude Code's local scope
(`pnpm mcp:dev`), not in a root `.mcp.json`: Claude Code loads a plugin root's `.mcp.json` in
addition to the inline `mcpServers` (verified with Claude Code 2.1.283: `--plugin-dir .` listed
`plugin:biso24:biso24-dev`), so every installed plugin would also try to start the dev server.

## Considered Options

- Plugin in a `plugins/biso24/` subfolder: cleaner install payload, and would allow a tracked root
  `.mcp.json` again, but splits the plugin from its source.
- Dropping the dev server and developing only via `--plugin-dir`: needs a rebuild on every change.
