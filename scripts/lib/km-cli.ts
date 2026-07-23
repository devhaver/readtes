/** Strict command-line parsing for the KabbalahMedia importer. */

export const KM_TOTAL_PARTS = 16;

export interface KmCliArgs {
  parts: number[];
  dryRun: boolean;
}

const usage = (): Error =>
  new Error("Usage: import-kabbalahmedia (--part <N> | --all) [--dry-run]");

export const parseKmArgs = (argv: string[]): KmCliArgs => {
  let part: number | undefined;
  let all = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--part") {
      if (part !== undefined) {
        throw new Error("--part may only be specified once");
      }
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--part requires a value");
      }
      if (!/^\d+$/.test(value)) {
        throw new Error(
          `--part must be an integer between 1 and ${KM_TOTAL_PARTS}`,
        );
      }
      part = Number(value);
      i += 1;
    } else if (arg === "--all") {
      if (all) throw new Error("--all may only be specified once");
      all = true;
    } else if (arg === "--dry-run") {
      if (dryRun) throw new Error("--dry-run may only be specified once");
      dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (all === (part !== undefined)) throw usage();
  if (part !== undefined && (part < 1 || part > KM_TOTAL_PARTS)) {
    throw new Error(`--part must be between 1 and ${KM_TOTAL_PARTS}`);
  }

  return {
    parts: all
      ? Array.from({ length: KM_TOTAL_PARTS }, (_, i) => i + 1)
      : [part as number],
    dryRun,
  };
};
