#!/usr/bin/env node
import { verifyBrowserRuntime } from "./lib/browser-runtime-e2e.mjs";
import { createVerifierRun, completeVerifierRun } from "./lib/verifier-run.mjs";

const executable = process.env.REA_BROWSER_EXECUTABLE;
if (executable === undefined)
  throw new Error(
    "verify:browser:runtime requires caller-supplied REA_BROWSER_EXECUTABLE",
  );
const run = createVerifierRun();
const result = await verifyBrowserRuntime(executable, process.argv[2]);
console.log(
  JSON.stringify(
    { status: "passed", ...result, verifier: await completeVerifierRun(run) },
    null,
    2,
  ),
);
