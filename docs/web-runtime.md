# Website runtime source attribution

REA integrates native Chrome DevTools Protocol inspection and precise V8 coverage through two composable tools. Supply an existing loopback CDP endpoint and a page target from `list_browser_targets`. With omitted origins, REA selects the page's current HTTP(S) origin. The browser and page remain externally owned.

## Observe execution

```bash
rea observe-web-execution http://127.0.0.1:9222 TARGET_ID \
  --observation-ms 10000 --json
```

MCP: `observe_web_execution` with `cdp_endpoint`, `target_id`, optional `allowed_origins` and optional `observation_ms` (default 10000). The operation itself selects instrumentation; no extra approval flag is needed.

Starting precise coverage resets counters and prevents optimized execution until REA stops it. This changes timing/JIT behavior. REA requests accurate call counts and detailed ranges, takes one resetting sample, stops coverage, disables enabled domains and detaches its own connection. It does not navigate, click, evaluate selected application code or close the page.

Wait for the actual armed progress event before performing an action. MCP emits negotiated progress notifications; CLI emits `rea_progress` JSON on stderr while the Evidence result stays on stdout. Use ordinary commands, scripts or user actions to trigger behavior. CLI SIGINT/SIGTERM and MCP cancellation await instrumentation cleanup; unconfirmed cleanup is an error with the target, failed commands and previous failure.

Results retain:

- The selected target, frame and document loader identity; local armed/end timestamps and separate backend monotonic coverage timestamps.
- Every admitted producer function/block range, exclusive end offset and execution count in UTF-16 code units, with verified bounds when exact text is available. Nested/overlapping counts are preserved and must not be summed.
- Main-document script inventory, exact session script IDs, resource start coordinates, sourceURL/source-map declarations, producer hash and independently computed UTF-8 text digest.
- Armed-window requests from the selected main frame and selected origins, complete embedded initiator stacks, exact script-ID associations and unresolved async parent IDs. Source association does not establish UI causality.

A document replacement ends the window; final coverage then remains unavailable. Missing coverage is unknown: an already loaded script may be absent from a sample. A detailed request also does not guarantee block granularity for already compiled functions. If `is_block_coverage` is false, the function-only ranges are observed and branch execution remains unknown. Native Chrome verification reproduced block coverage in the first window and function-only coverage in a subsequent window, including without REA.

Child frames, workers, service workers, WebAssembly, chronological execution order and framework-specific causal interpretation are outside this operation. Script ownership comes from frame/context metadata, never URL equality. Repeated URLs and synthetic names therefore retain separate identities.

## Inspect a node's listeners

```bash
rea inspect-web-event-listeners http://127.0.0.1:9222 TARGET_ID '#submit' --json
```

MCP: `inspect_web_event_listeners` with the same scope and an explicit CSS `selector`. Native DOM selection inspects the first matching node in the main document. A missing match is an explicit empty result.

The result contains directly registered listener types/flags, callback coordinates, source identity/text/digest and execution unknowns. REA uses native DOM/DOMDebugger operations and releases its own remote object group. It never invokes a listener or dispatches an event. Delegated ancestor listeners, descendants, closed shadow roots and framework registries are not enumerated.

## Bounds and verification

Each protocol message has a 64 MiB budget; script/context metadata and request metadata each have an 8 MiB retained budget. Complete retained source text has a 32 MiB budget. Oversized or malformed evidence returns no partial successful result. Each command and the complete inspection/source-join phase have a 20-second deadline; cleanup has a separate 5-second command deadline plus transport closure. The selected observation duration must fit the host timer's positive 32-bit millisecond range. REA does not control the externally owned browser's CPU or memory.

`npm run verify:browser:runtime` uses caller-supplied `REA_BROWSER_EXECUTABLE` against an owned synthetic fixture, through real public CLI and stdio MCP. It checks exact Unicode/CRLF text/digests, same-URL identities, executed and zero-count branches, function-only unknowns on repeated observation, listener selection, initiator association, actual arming and preservation of the external page. The optional positional entrypoint to `scripts/verify-browser-runtime.mjs` permits the same checks against an isolated installed tarball.

Real workflow coverage is Linux x64 / Chrome 153 / Node 24. Other browser engines and host workflows remain unverified. The conditional `real-web-runtime` CI lane acquires Chrome only for relevant changes; ordinary unit/static checks need no browser.

Primary protocol references: [Profiler and Debugger](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/js_protocol.pdl), [DOMDebugger](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/DOMDebugger.pdl).
