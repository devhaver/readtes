import type { DocBlock } from "./km-doc-blocks.ts";

export interface KmDocumentCandidate<TFile> {
  uid: string;
  file: TFile;
}

export type KmCandidateFailureKind = "structure-unsupported" | "unmatched";

export interface KmCandidateRejection<TFile> {
  candidate: KmDocumentCandidate<TFile>;
  kind: KmCandidateFailureKind;
  reason: string;
}

type KmCandidateInspection<TValue> =
  | { ok: true; value: TValue }
  | { ok: false; kind: KmCandidateFailureKind; reason: string };

export interface KmCandidateResolution<TFile, TValue> {
  selected?: KmDocumentCandidate<TFile>;
  value?: TValue;
  rejections: KmCandidateRejection<TFile>[];
  failureKind?: KmCandidateFailureKind;
}

export const dedupeKmDocumentCandidates = <TFile extends { id: string }>(
  candidates: readonly KmDocumentCandidate<TFile>[],
): KmDocumentCandidate<TFile>[] => {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.file.id)) return false;
    seen.add(candidate.file.id);
    return true;
  });
};

export const resolveKmDocumentCandidate = async <TFile, TValue>(
  candidates: readonly KmDocumentCandidate<TFile>[],
  loadBlocks: (candidate: KmDocumentCandidate<TFile>) => Promise<DocBlock[]>,
  inspect: (
    blocks: DocBlock[],
    candidate: KmDocumentCandidate<TFile>,
  ) => KmCandidateInspection<TValue>,
): Promise<KmCandidateResolution<TFile, TValue>> => {
  const rejections: KmCandidateRejection<TFile>[] = [];

  for (const candidate of candidates) {
    const result = inspect(await loadBlocks(candidate), candidate);
    if (result.ok) {
      return {
        selected: candidate,
        value: result.value,
        rejections,
      };
    }
    rejections.push({ candidate, kind: result.kind, reason: result.reason });
  }

  return {
    rejections,
    failureKind: rejections.some((rejection) => rejection.kind === "unmatched")
      ? "unmatched"
      : "structure-unsupported",
  };
};
