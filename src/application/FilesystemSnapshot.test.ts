import { mkdtemp, lstat, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, it } from "vitest";

import { hashFile } from "./FilesystemSnapshot.js";

it("does not hash a replacement file using the earlier path metadata", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rea-snapshot-identity-"));
  const path = join(directory, "observed-file");
  try {
    await writeFile(path, "captured file\n");
    const expected = await lstat(path);
    await rm(path);
    await writeFile(path, "replacement with a different identity and size\n");

    await expect(hashFile(path, expected, 1_000)).resolves.toBeNull();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("rejects cancellation for an empty file before returning its digest", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rea-snapshot-empty-cancel-"));
  const path = join(directory, "observed-file");
  try {
    await writeFile(path, "");
    const expected = await lstat(path);
    const controller = new AbortController();
    controller.abort();

    await expect(
      hashFile(path, expected, 1_000, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("closes the opened file when cancellation arrives during open", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rea-snapshot-cancel-"));
  const path = join(directory, "observed-file");
  try {
    await writeFile(path, "captured file\n");
    const expected = await lstat(path);
    const controller = new AbortController();
    const hashing = hashFile(path, expected, 1_000, controller.signal);
    // hashFile reaches `open` synchronously before its first suspension, so
    // this abort is observed after the descriptor is acquired and is handled
    // by the `finally` close path.
    controller.abort();

    await expect(hashing).rejects.toMatchObject({ name: "AbortError" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
