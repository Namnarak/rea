import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, expect, it } from "vitest";

import { finalizeInspectorCapture } from "./V8InspectorCaptureProjection.js";
import type { CaptureState } from "./V8InspectorProvider.js";

const rootPromise = mkdtemp(join(tmpdir(), "rea-inspector-projection-"));
afterAll(async () => rm(await rootPromise, { recursive: true, force: true }));

it("authorizes distinct Inspector locations and preserves stable deduplication", async () => {
  const root = await rootPromise;
  const firstPath = join(root, "first.js");
  const secondPath = join(root, "second.js");
  await Promise.all([
    writeFile(firstPath, "void 0;\n"),
    writeFile(secondPath, "void 1;\n"),
  ]);
  const firstUrl = pathToFileURL(firstPath).href;
  const secondUrl = pathToFileURL(secondPath).href;
  const state: CaptureState = {
    scripts: [
      {
        rawUrl: firstUrl,
        executionContextKey: "1",
        cdpHash: "first",
        length: 7,
        isModule: false,
      },
      {
        rawUrl: firstUrl,
        executionContextKey: "1",
        cdpHash: "first",
        length: 7,
        isModule: false,
      },
      {
        rawUrl: secondUrl,
        executionContextKey: "1",
        cdpHash: "second",
        length: 7,
        isModule: false,
      },
      {
        rawUrl: "ftp://example.test/unapproved.js",
        executionContextKey: null,
        cdpHash: null,
        length: 0,
        isModule: false,
      },
    ],
    contexts: new Map(),
    eventsObserved: 4,
    eventsRetained: 4,
    eventsDropped: 0,
    metadataBytes: 0,
    scriptsObserved: 4,
    invalidScripts: 0,
    truncated: false,
    truncationReasons: new Set(),
  };
  const result = await finalizeInspectorCapture({
    input: {
      inspector_endpoint: "http://127.0.0.1:9222",
      target_id: "target-1",
      observation_ms: 100,
    },
    runtime: {
      product: "Node.js/v24.18.0",
      protocol_version: "1.3",
      v8_version: null,
    },
    target: {
      id: "target-1",
      type: "node",
      url: "file:///tmp/target.js",
      attached: false,
      webSocketUrl: "ws://127.0.0.1:9222/target-1",
      location: { kind: "file", file_path: "/tmp/target.js" },
    },
    state,
  });

  expect(result.scripts.items.map(({ location }) => location)).toEqual(
    expect.arrayContaining([
      { kind: "file", file_path: await realpath(firstPath) },
      { kind: "file", file_path: await realpath(secondPath) },
    ]),
  );
  expect(result.scripts.items).toHaveLength(2);
  expect(result.scripts.excluded).toEqual({
    unsupported_location: 1,
    invalid_protocol_value: 0,
  });
});
