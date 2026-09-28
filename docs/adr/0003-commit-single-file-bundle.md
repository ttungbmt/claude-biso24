# Ship the MCP server as a committed single-file bundle

Claude Code runs no build step when installing a plugin from a GitHub marketplace, so the built
server must already be in the repo. We bundle it with its dependencies into one `dist/index.js` and
commit it, rather than committing plain `tsc` output (which would rely on Claude Code installing
`node_modules` from the lockfile) or publishing to npm. A check fails when the committed bundle is
out of date with `src/`.

## Considered Options

- CI builds the bundle onto a separate `release` branch: keeps `dist/` out of main-branch diffs;
  worth switching to if the committed bundle becomes a nuisance.
