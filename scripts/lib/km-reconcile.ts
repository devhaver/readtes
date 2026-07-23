import type { LayerKind, TocChapter } from "../../shared/types/content.ts";

export const removeKmVersionAvailability = (
  chapter: TocChapter,
  layer: Extract<LayerKind, "source" | "commentary">,
  versionId: string,
): boolean => {
  const versions = chapter.availableVersions[layer];
  const index = versions.indexOf(versionId);
  if (index === -1) return false;

  versions.splice(index, 1);
  if (versions.length === 0) {
    chapter.availableLayers = chapter.availableLayers.filter(
      (availableLayer) => availableLayer !== layer,
    );
  }
  return true;
};
