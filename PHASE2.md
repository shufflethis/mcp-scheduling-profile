# Phase 2: Implementation Roadmap

Everything in this document was deliberately deferred from Phase 1 (specification). Phase 1 produced specs, schemas, and a reference skeleton. Phase 2 turns these into working software.

## Deferred Implementation Work

### Adapter Implementations
- [ ] **Google Calendar adapter** — implement `GoogleCalendarAdapter` against Calendar API v3
- [ ] **Calendly adapter** — evaluate consuming Calendly's own MCP server vs. wrapping their REST API
- [ ] **CalDAV adapter** — implement against Nextcloud as reference CalDAV server
- [ ] **Cal.com adapter** — open-source scheduling, high community interest

### Authentication
- [ ] OAuth 2.1 + PKCE flow implementation for Google
- [ ] Dynamic Client Registration (DCR) support
- [ ] Token refresh and secure storage
- [ ] Per-provider scope management
- [ ] Calendly OAuth integration
- [ ] CalDAV authentication (Basic/Digest/OAuth depending on server)

### ChatGPT App
- [ ] Complete `chatgpt-app/manifest.todo.json` with real manifest schema
- [ ] Build and submit a reference ChatGPT App for review
- [ ] End-to-end test: ChatGPT -> MCP -> ASP server -> Google Calendar

### Testing
- [ ] JSON Schema validation test suite (ajv)
- [ ] Integration tests for each adapter (search -> hold -> book -> cancel flow)
- [ ] Error handling tests (all 9 error codes)
- [ ] Capability negotiation tests (capability mismatch scenarios)
- [ ] Idempotency tests (duplicate `clientIntentId` handling)

### Reference Server Enhancements
- [ ] Extract tool handlers from `server.ts` into individual modules
- [ ] Add input validation via ajv against JSON Schemas
- [ ] Structured logging
- [ ] Health check endpoint
- [ ] Configuration file support (adapter selection, port, etc.)

### Documentation
- [ ] Expand whitepaper TODO(expand) sections
- [ ] Create architecture diagrams (see `paper/figures/README.md`)
- [ ] Verify and fill all TODO(verify) markers in adapter READMEs
- [ ] API reference documentation (generated from schemas)
- [ ] Tutorial: "Build Your Own ASP Adapter"

### Ecosystem
- [ ] Publish `@asp/adapter-sdk` npm package
- [ ] GitHub Actions CI pipeline (schema validation, type checking)
- [ ] Contribution guidelines for new adapter proposals
- [ ] IETF Internet-Draft submission preparation

## Verification Backlog

All `TODO(verify: ...)` markers from Phase 1 need resolution. Run:
```bash
grep -rn 'TODO(verify' --include='*.md' --include='*.ts' --include='*.json' --include='*.yaml'
```
to get the current list.
