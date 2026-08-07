/** Three load phases — docs/05-Asset-Pipeline.md §5.4. M0: boot assets only. */

export const AssetManifest = {
  boot: [] as readonly string[],
  phase1: [] as readonly string[],
  phase2: [] as readonly string[],
} as const;
