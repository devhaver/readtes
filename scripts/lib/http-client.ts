/**
 * Polite, cached, retrying HTTP client shared by every importer (Sefaria,
 * KabbalahMedia). Not unit tested directly (it's pure I/O) — exercised by
 * actually running an importer against its live API. See AGENTS.md for the
 * politeness contract (User-Agent, minimum interval, cache location).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const USER_AGENT = "readtes-importer (github.com/devhaver/readtes)";
const DEFAULT_MIN_INTERVAL_MS = 600;
const MAX_RETRIES = 4;

export class HttpClientError extends Error {
  readonly url: string;
  readonly status: number;
  readonly body: string;

  constructor(url: string, status: number, body: string) {
    super(`HTTP request failed: ${status} ${url}`);
    this.url = url;
    this.status = status;
    this.body = body;
  }
}

interface CacheEntry {
  url: string;
  status: number;
  body: string;
}

export interface HttpClientOptions {
  cacheDir: string;
  minIntervalMs?: number;
  /** Overridable for tests/tooling; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

export interface HttpClient {
  getJson: <T>(url: string) => Promise<T>;
  getText: (url: string) => Promise<string>;
  stats: () => { requests: number; cacheHits: number };
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const createHttpClient = (options: HttpClientOptions): HttpClient => {
  const {
    cacheDir,
    minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
    fetchImpl = fetch,
  } = options;
  mkdirSync(cacheDir, { recursive: true });

  let lastRequestAt = 0;
  let requests = 0;
  let cacheHits = 0;

  const cachePathFor = (url: string): string => {
    const hash = createHash("sha256").update(url).digest("hex");
    return join(cacheDir, `${hash}.json`);
  };

  const readCache = (url: string): CacheEntry | undefined => {
    const path = cachePathFor(url);
    if (!existsSync(path)) return undefined;
    try {
      return JSON.parse(readFileSync(path, "utf-8")) as CacheEntry;
    } catch {
      return undefined;
    }
  };

  const writeCache = (entry: CacheEntry): void => {
    writeFileSync(
      cachePathFor(entry.url),
      `${JSON.stringify(entry, null, 2)}\n`,
      "utf-8",
    );
  };

  const politeDelay = async (): Promise<void> => {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < minIntervalMs) await wait(minIntervalMs - elapsed);
    lastRequestAt = Date.now();
  };

  const fetchWithRetry = async (url: string): Promise<CacheEntry> => {
    let attempt = 0;
    for (;;) {
      await politeDelay();
      requests += 1;
      const response = await fetchImpl(url, {
        headers: { "User-Agent": USER_AGENT },
      });
      const body = await response.text();

      if (response.status >= 500 || response.status === 429) {
        attempt += 1;
        if (attempt > MAX_RETRIES)
          throw new HttpClientError(url, response.status, body);
        await wait(2 ** attempt * 1000);
        continue;
      }

      if (response.status >= 400)
        throw new HttpClientError(url, response.status, body);

      return { url, status: response.status, body };
    }
  };

  const getRaw = async (url: string): Promise<string> => {
    const cached = readCache(url);
    if (cached) {
      cacheHits += 1;
      return cached.body;
    }

    const result = await fetchWithRetry(url);
    writeCache(result);
    return result.body;
  };

  const getJson = async <T>(url: string): Promise<T> =>
    JSON.parse(await getRaw(url)) as T;

  const getText = (url: string): Promise<string> => getRaw(url);

  return { getJson, getText, stats: () => ({ requests, cacheHits }) };
};
