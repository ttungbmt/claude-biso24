# The Biso24 API reference lives in docs/api, Bruno only runs requests

Biso24 publishes no API documentation, so everything we know about an endpoint comes from trying
it: capturing the web app's requests, reading its JS bundle, and calling the real API. That
knowledge used to sit in the `docs {}` block of each Bruno request, split across many small files
and mixed with how to run them.

It now lives in `docs/api/`, one Markdown file per `<service>/<resource>` (mirroring
`src/modules/` and `bruno/`), with shared conventions (auth, headers, envelope, pagination) in
`docs/api/README.md`. Each endpoint follows a fixed template that maps onto an OpenAPI operation,
because this reference is the source for a future OpenAPI spec. Bruno keeps the runnable requests
(including disabled optional params to toggle) and points to the reference instead of repeating it.

## Considered Options

- Keep documenting in Bruno: no extra files, but scattered and not a base for OpenAPI.
- Write `openapi.yaml` now: precise, but awkward for what we still need to record, such as whether
  a param was verified, odd API behaviour, and the web app's Vietnamese labels.
