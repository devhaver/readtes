/**
 * Order-preserving alignment of an official translation's units to a
 * chapter sequence that carries no shared numbering — by comparing each
 * unit with the corpus's own English rendering of the same Hebrew item
 * (`en-ai`).
 *
 * Why this is needed: Ohr Pnimi on parts 5+ is numbered per seif in the
 * printed English but per Sefaria chapter in the Hebrew, and the two do not
 * coincide (Sefaria's part 5 chapter 2 holds the notes of seifim 2-4). The
 * Hebrew items have no printed numeral to key on. What both sides do share
 * is content, and `en-ai` puts the Hebrew's content into English.
 *
 * The two translations differ in vocabulary (Bnei Baruch transliterates —
 * `Klipot`, `Achoraim` — where `en-ai` translates: "shells", "posteriors"),
 * so absolute similarity is modest (median ~0.4 tf-idf cosine) and the
 * signal is the *alignment*: a monotone dynamic programme over both
 * sequences, where a wrong pairing costs every pairing after it. Units are
 * aligned 1:1, or 1:2 / 2:1 where one side split a note the other kept
 * whole, or skipped. Only confident 1:1 pairs are ever used (see
 * `acceptedPairs`); the rest stay on their existing version.
 */

const STOPWORDS = new Set(
  (
    "the a an of and to in is that it this as for are be by with from which on not its " +
    "his her their they we he she was were has have had all so or but there what when " +
    "only also into than then them these those at one one's who whom how any each such"
  ).split(" "),
);

export const similarityTokens = (html: string): string[] =>
  (
    html
      .replace(/<[^>]*>/g, " ")
      .toLowerCase()
      .match(/[a-z]+/g) ?? []
  ).filter((word) => word.length > 2 && !STOPWORDS.has(word));

type Vector = Map<string, number>;

const buildIdf = (documents: string[][]): Map<string, number> => {
  const documentFrequency = new Map<string, number>();
  for (const document of documents) {
    for (const word of new Set(document)) {
      documentFrequency.set(word, (documentFrequency.get(word) ?? 0) + 1);
    }
  }
  const total = documents.length;
  return new Map(
    [...documentFrequency].map(([word, count]) => [
      word,
      Math.log(total / (1 + count)) + 1,
    ]),
  );
};

const vectorize = (tokens: string[], idf: Map<string, number>): Vector => {
  const vector: Vector = new Map();
  for (const token of tokens) {
    vector.set(token, (vector.get(token) ?? 0) + (idf.get(token) ?? 1));
  }
  return vector;
};

const cosine = (a: Vector, b: Vector): number => {
  let dot = 0;
  for (const [word, weight] of a) dot += weight * (b.get(word) ?? 0);
  const norm = (v: Vector): number =>
    Math.sqrt([...v.values()].reduce((sum, w) => sum + w * w, 0));
  const denominator = norm(a) * norm(b);
  return denominator === 0 ? 0 : dot / denominator;
};

export type AlignmentOp =
  "one-to-one" | "target-split" | "target-merged" | "skip-target" | "skip-unit";

export interface AlignmentStep {
  op: AlignmentOp;
  /** Target indices covered by this step (0, 1 or 2). */
  targets: number[];
  /** Unit indices covered by this step (0, 1 or 2). */
  units: number[];
  score: number;
}

/** Penalty for leaving a target or a unit unpaired. */
const SKIP_SCORE = -0.15;
/** Pairing two-for-one must beat 1:1 clearly before it is chosen. */
const MERGE_PENALTY = 0.1;

/**
 * Aligns `units` (the official translation, in page order) to `targets`
 * (each target's reference text, in corpus order). Targets with a `null`
 * reference can only be skipped.
 */
export const alignBySimilarity = (
  targets: (string | null)[],
  units: string[],
): AlignmentStep[] => {
  const targetTokens = targets.map((t) =>
    t === null ? [] : similarityTokens(t),
  );
  const unitTokens = units.map(similarityTokens);
  const idf = buildIdf([...targetTokens, ...unitTokens]);
  const tv = targetTokens.map((tokens) => vectorize(tokens, idf));
  const uv = unitTokens.map((tokens) => vectorize(tokens, idf));
  const tv2 = targetTokens.map((tokens, i) =>
    i + 1 < targetTokens.length
      ? vectorize([...tokens, ...(targetTokens[i + 1] as string[])], idf)
      : undefined,
  );
  const uv2 = unitTokens.map((tokens, j) =>
    j + 1 < unitTokens.length
      ? vectorize([...tokens, ...(unitTokens[j + 1] as string[])], idf)
      : undefined,
  );

  const n = targets.length;
  const m = units.length;
  const score: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(Number.NEGATIVE_INFINITY),
  );
  const back: (AlignmentStep & { from: [number, number] })[][] = Array.from(
    { length: n + 1 },
    () => new Array(m + 1),
  );
  (score[0] as number[])[0] = 0;

  const relax = (
    i: number,
    j: number,
    di: number,
    dj: number,
    op: AlignmentOp,
    stepScore: number,
  ): void => {
    const candidate = (score[i] as number[])[j] as number;
    const row = score[i + di] as number[];
    if (candidate + stepScore > (row[j + dj] as number)) {
      row[j + dj] = candidate + stepScore;
      (back[i + di] as AlignmentStep[])[j + dj] = {
        op,
        targets: Array.from({ length: di }, (_, k) => i + k),
        units: Array.from({ length: dj }, (_, k) => j + k),
        score: stepScore,
        from: [i, j],
      } as AlignmentStep & { from: [number, number] };
    }
  };

  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j <= m; j += 1) {
      if ((score[i] as number[])[j] === Number.NEGATIVE_INFINITY) continue;
      const hasReference = i < n && targets[i] !== null;
      if (hasReference && j < m) {
        relax(
          i,
          j,
          1,
          1,
          "one-to-one",
          cosine(tv[i] as Vector, uv[j] as Vector),
        );
        const pair = uv2[j];
        if (pair) {
          relax(
            i,
            j,
            1,
            2,
            "target-split",
            cosine(tv[i] as Vector, pair) - MERGE_PENALTY,
          );
        }
        const merged = tv2[i];
        if (merged && targets[i + 1] !== null) {
          relax(
            i,
            j,
            2,
            1,
            "target-merged",
            cosine(merged, uv[j] as Vector) - MERGE_PENALTY,
          );
        }
      }
      if (i < n) relax(i, j, 1, 0, "skip-target", SKIP_SCORE);
      if (j < m) relax(i, j, 0, 1, "skip-unit", SKIP_SCORE);
    }
  }

  const steps: AlignmentStep[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const step = (back[i] as (AlignmentStep & { from: [number, number] })[])[
      j
    ] as AlignmentStep & { from: [number, number] };
    const { from, ...rest } = step;
    steps.push(rest);
    [i, j] = from;
  }
  return steps.reverse();
};

/** A 1:1 pairing scoring at least this is accepted on its own. */
export const CONFIDENT_SIMILARITY = 0.12;
/** …and one scoring at least this, if both neighbours are confident 1:1 pairs. */
export const SANDWICHED_SIMILARITY = 0.04;

/**
 * The 1:1 pairs trusted enough to write: confident on their own, or weak
 * but held in place by confident 1:1 pairs immediately on both sides (the
 * vocabulary gap makes some true pairs score low; being boxed in by two
 * certain pairs leaves them nowhere else to go). Returns target -> unit.
 */
export const acceptedPairs = (steps: AlignmentStep[]): Map<number, number> => {
  const isConfident = (step: AlignmentStep | undefined): boolean =>
    step?.op === "one-to-one" && step.score >= CONFIDENT_SIMILARITY;
  const accepted = new Map<number, number>();
  steps.forEach((step, index) => {
    if (step.op !== "one-to-one") return;
    const ok =
      step.score >= CONFIDENT_SIMILARITY ||
      (step.score >= SANDWICHED_SIMILARITY &&
        isConfident(steps[index - 1]) &&
        isConfident(steps[index + 1]));
    if (ok) accepted.set(step.targets[0] as number, step.units[0] as number);
  });
  return accepted;
};

/**
 * A pairwise scorer over a fixed set of documents (their idf weights), for
 * checks that compare individual pairs rather than align whole sequences.
 */
export const similarityScorer = (
  documents: string[],
): ((a: string, b: string) => number) => {
  const idf = buildIdf(documents.map(similarityTokens));
  return (a, b) =>
    cosine(
      vectorize(similarityTokens(a), idf),
      vectorize(similarityTokens(b), idf),
    );
};

export interface VectorSpace {
  vector: (html: string) => Map<string, number>;
  /** Adds `b` into `a` in place and returns `a`. */
  add: (a: Map<string, number>, b: Map<string, number>) => Map<string, number>;
  cosine: (a: Map<string, number>, b: Map<string, number>) => number;
}

/** The scorer's pieces, for callers that build up vectors incrementally. */
export const vectorSpace = (documents: string[]): VectorSpace => {
  const idf = buildIdf(documents.map(similarityTokens));
  return {
    vector: (html) => vectorize(similarityTokens(html), idf),
    add: (a, b) => {
      for (const [word, weight] of b) a.set(word, (a.get(word) ?? 0) + weight);
      return a;
    },
    cosine,
  };
};
