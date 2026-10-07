import { describe, expect } from "vitest";

import { cliTest } from "../../support/cli/cliFixture.js";
import type { TestCli } from "../../support/cli/cliFixture.js";

const runCapture = async (cli: TestCli, steps: string | undefined) => {
  const arguments_ = [
    "capture-native-ui-scenario",
    "/usr/bin/true",
    "--pid",
    "1",
    "--window-id",
    "1",
  ];
  if (steps !== undefined) arguments_.push("--steps", steps);
  arguments_.push("--json");
  return cli.run({
    arguments: arguments_,
    environment: { REA_LOG_LEVEL: "silent" },
  });
};

describe("native UI scenario CLI input", () => {
  cliTest("rejects malformed JSON as invalid input", async ({ cli }) => {
    const result = await runCapture(cli, "[");

    expect(result.exitCode).not.toBe(0);
    expect(result.json).toMatchObject({
      code: "invalid_request",
      details: {
        operation: "capture-native-ui-scenario",
        issues: [
          {
            path: ["steps"],
            reason: "invalid_format",
            expected: "JSON",
          },
        ],
      },
    });
  });

  cliTest(
    "requires at least one schema-valid scenario step",
    async ({ cli }) => {
      const result = await runCapture(cli, "[]");

      expect(result.exitCode).not.toBe(0);
      expect(result.json).toMatchObject({
        code: "invalid_request",
        details: {
          operation: "capture-native-ui-scenario",
          issues: [{ path: ["steps"], reason: "out_of_range", minimum: 1 }],
        },
      });
    },
  );
});
