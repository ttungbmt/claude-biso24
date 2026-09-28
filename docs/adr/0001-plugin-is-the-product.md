# The Claude Code plugin is the product; the MCP server is not shipped on its own

This repo started as a standalone MCP server but is now a Claude Code plugin for employees of one
Organization. The MCP server is an internal component of the plugin: it is not published to npm or
supported for other MCP clients (Claude Desktop, Cursor), so its tools, config and versioning can
change freely with the plugin. Splitting it back out stays possible if another client ever needs it.
