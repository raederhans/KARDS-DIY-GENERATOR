// @ts-expect-error Vitest executes this contract test in Node while the app tsconfig excludes Node globals.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_CARD } from "./cardModel";
import {
  DEV_PREVIEW_ASSET_PACK_URL,
  DEV_PREVIEW_HQ_SAMPLE,
  DEV_PREVIEW_HQ_SAMPLES,
  DEV_PREVIEW_REFERENCE_SAMPLES,
  DEV_PREVIEW_SET_SAMPLES,
  filterDevPreviewSamples,
  findUniqueAutomaticArtworkSample,
  getDefaultDevPreviewSample,
  getDevPreviewReferenceForCard,
  getDevPreviewSampleById,
  getDevPreviewSampleByKind,
  getDevPreviewSampleForCard,
  getDevPreviewSampleBySet,
  sortDevPreviewSamples,
} from "./devPreviewCatalog";
import {
  applyCardUpdate,
  resolveDevPreviewSampleCard,
  resolveDevPreviewReferenceSelection,
  resolveDevPreviewTemplateSelection,
  shouldApplyDevPreviewSampleResult,
  shouldApplyAutomaticArtworkResult,
} from "./devPreviewState";
import { SETS } from "./presets";

describe("dev preview sample catalog", () => {
  it("keeps required nation and rarity metadata aligned with sample JSON", () => {
    for (const sample of DEV_PREVIEW_REFERENCE_SAMPLES) {
      const card = JSON.parse(readFileSync(
        new URL(`../public/reference-pack/v1/samples/${sample.id}.card.json`, import.meta.url),
        "utf8",
      ));
      expect({ kind: sample.kind, nation: sample.nation, rarity: sample.rarity, set: sample.set }).toEqual({
        kind: card.kind,
        nation: card.nation,
        rarity: card.rarity,
        set: card.set,
      });
    }
    expect(DEV_PREVIEW_HQ_SAMPLES.every((sample) => sample.nation && sample.rarity === "none")).toBe(true);
  });

  it("applies text and metadata filters with AND semantics", () => {
    const filtered = filterDevPreviewSamples(
      [...DEV_PREVIEW_REFERENCE_SAMPLES, ...DEV_PREVIEW_HQ_SAMPLES],
      { query: "t-70", kind: "tank", nation: "soviet", rarity: "standard", set: "base" },
    );
    const noMatches = filterDevPreviewSamples(DEV_PREVIEW_REFERENCE_SAMPLES, {
      query: "t-70",
      kind: "tank",
      nation: "britain",
      rarity: "standard",
      set: "base",
    });

    expect(filtered.map((sample) => sample.id)).toEqual(["t70"]);
    expect(noMatches).toEqual([]);
  });

  it("sorts stable copies by match, localized name, or preset order", () => {
    const samples = [
      getDevPreviewSampleById("dingo")!,
      getDevPreviewSampleById("t70")!,
      getDevPreviewSampleById("a26_invader")!,
    ];
    const originalIds = samples.map((sample) => sample.id);
    const currentCard = {
      ...DEFAULT_CARD,
      title: "T-70",
      kind: "tank" as const,
      nation: "soviet",
      set: "base",
      rarity: "standard",
    };

    expect(sortDevPreviewSamples(samples, currentCard, "match", "en").map((sample) => sample.id)[0]).toBe("t70");
    expect(sortDevPreviewSamples(samples, currentCard, "name", "zh").map((sample) => sample.id)).toEqual([
      "dingo",
      "a26_invader",
      "t70",
    ]);
    expect(sortDevPreviewSamples(samples, currentCard, "set", "en").map((sample) => sample.id)).toEqual([
      "t70",
      "a26_invader",
      "dingo",
    ]);
    expect(samples.map((sample) => sample.id)).toEqual(originalIds);
  });

  it("returns only unique exact automatic artwork matches", () => {
    const allSamples = [...DEV_PREVIEW_REFERENCE_SAMPLES, ...DEV_PREVIEW_HQ_SAMPLES];
    const t70 = getDevPreviewSampleById("t70")!;
    const washington = getDevPreviewSampleById("washington_hq")!;

    expect(findUniqueAutomaticArtworkSample(allSamples, {
      ...DEFAULT_CARD,
      kind: t70.kind,
      nation: t70.nation,
      set: t70.set,
      rarity: t70.rarity,
    })?.id).toBe("t70");
    expect(findUniqueAutomaticArtworkSample([...allSamples, { ...t70, id: "duplicate" }], {
      ...DEFAULT_CARD,
      kind: t70.kind,
      nation: t70.nation,
      set: t70.set,
      rarity: t70.rarity,
    })).toBeUndefined();
    expect(findUniqueAutomaticArtworkSample(allSamples, {
      ...DEFAULT_CARD,
      kind: "hq",
      nation: washington.nation,
      set: "custom",
      rarity: "elite",
    })?.id).toBe("washington_hq");
  });

  it("loads the bundled authorized reference pack", () => {
    expect(DEV_PREVIEW_ASSET_PACK_URL).toBe(
      "/reference-pack/v1/kards-asset-pack.json",
    );
    expect(DEV_PREVIEW_REFERENCE_SAMPLES.every((sample) =>
      sample.referenceUrl.startsWith("/reference-pack/v1/references/cards/"),
    )).toBe(true);
    expect(DEV_PREVIEW_REFERENCE_SAMPLES.every((sample) =>
      "cardUrl" in sample && sample.cardUrl.startsWith("/reference-pack/v1/samples/"),
    )).toBe(true);
    expect(DEV_PREVIEW_HQ_SAMPLES.every((sample) =>
      sample.referenceUrl.startsWith("/reference-pack/v1/references/hq/"),
    )).toBe(true);
  });

  it("covers every implemented official set with a reference sample", () => {
    const sampleSets = new Set(DEV_PREVIEW_SET_SAMPLES.map((sample) => sample.set));
    const implementedOfficialSets = SETS.filter((set) => set.id !== "custom");

    expect(DEV_PREVIEW_SET_SAMPLES).toHaveLength(implementedOfficialSets.length);
    expect(DEV_PREVIEW_REFERENCE_SAMPLES.length).toBeGreaterThan(DEV_PREVIEW_SET_SAMPLES.length);
    for (const set of implementedOfficialSets) {
      expect(sampleSets.has(set.id)).toBe(true);
    }
  });

  it("returns the expected default, set, and HQ samples", () => {
    expect(getDefaultDevPreviewSample().id).toBe("t70");
    expect(getDevPreviewSampleById("hold_the_line")?.labelZh).toBe("坚守阵线");
    expect(getDevPreviewSampleBySet("allegiance")?.id).toBe("a26_invader");
    expect(getDevPreviewSampleBySet("blood-and-iron")?.id).toBe("macchi_c_200");
    expect(getDevPreviewSampleBySet("oceania-storm")?.id).toBe("dingo");

    expect(getDevPreviewSampleByKind("hq")).toBe(DEV_PREVIEW_HQ_SAMPLE);
    expect(getDevPreviewSampleByKind("tank")).toBeUndefined();
    expect(getDevPreviewSampleForCard({ kind: "hq", set: "base" })?.label).toBe("WASHINGTON");
    expect(DEV_PREVIEW_HQ_SAMPLES.map((sample) => sample.label)).toEqual([
      "WASHINGTON",
      "LONDON",
      "MOSCOW",
      "TRUK",
      "DANZIG",
    ]);
    expect(getDevPreviewSampleById("london_hq")?.referenceUrl).toContain("London.png");
    expect(getDevPreviewSampleById("moscow_hq")?.referenceUrl).toContain("Moscow.png");
    expect(DEV_PREVIEW_HQ_SAMPLE.referenceUrl).toContain("Washington.png");
    expect(DEV_PREVIEW_REFERENCE_SAMPLES.every((sample) => sample.kind !== "hq")).toBe(true);
    expect(DEV_PREVIEW_HQ_SAMPLES.every((sample) => sample.kind === "hq")).toBe(true);
    expect("card" in DEV_PREVIEW_HQ_SAMPLE ? DEV_PREVIEW_HQ_SAMPLE.card.title : "").toBe("华盛顿");
    expect(DEV_PREVIEW_HQ_SAMPLE.artworkReferenceCrop).toEqual({
      sourceUrl: DEV_PREVIEW_HQ_SAMPLE.referenceUrl,
      sourceRect: { x: 12, y: 13, width: 476, height: 476 },
    });
  });

  it("resolves the reference image from the current card type and set", () => {
    expect(getDevPreviewReferenceForCard({ kind: "tank", set: "blood-and-iron" })).toContain("macchi_c_200.png");
    expect(getDevPreviewReferenceForCard({ kind: "tank", set: "oceania-storm" })).toContain("dingo.png");
    expect(getDevPreviewReferenceForCard({ kind: "hq", set: "blood-and-iron" })).toContain("Washington.png");
    expect(getDevPreviewReferenceForCard({ kind: "tank", set: "custom" })).toBeUndefined();
  });

  it("keeps visible sample labels aligned with the card-face titles", () => {
    expect(DEV_PREVIEW_HQ_SAMPLE.label).toBe("WASHINGTON");
    expect(DEV_PREVIEW_SET_SAMPLES.map((sample) => [sample.id, sample.label])).toEqual([
      ["t70", "T-70"],
      ["a26_invader", "A-26 INVADER"],
      ["macchi_c_200", "MACCHI C.200"],
      ["royal_scots", "ROYAL SCOTS"],
      ["plan_d", "PLAN D"],
      ["katalina", "KATALINA"],
      ["m2a4", "M2A4"],
      ["kikka", "KIKKA"],
      ["gordon_highlanders", "GORDON HIGHLANDERS"],
      ["dingo", "DINGO"],
      ["routed_troops", "ROUTED TROOPS"],
      ["the_regulars_vet", "THE REGULARS"],
      ["wespe", "WESPE"],
      ["jet_prototype", "JET PROTOTYPE"],
      ["hold_the_line", "HOLD THE LINE"],
    ]);
  });

  it("keeps set edits local until the selected set sample is explicitly loaded", () => {
    const draftCard = {
      ...DEFAULT_CARD,
      title: "Custom draft",
      body: "Do not replace me",
      set: "base",
    };

    const setOnlyEdit = applyCardUpdate(draftCard, (currentCard) => ({
      ...currentCard,
      set: "oceania-storm",
    }));
    const selectedSample = getDevPreviewSampleBySet(setOnlyEdit.set);

    expect(setOnlyEdit.title).toBe("Custom draft");
    expect(setOnlyEdit.body).toBe("Do not replace me");
    expect(setOnlyEdit.set).toBe("oceania-storm");
    expect(selectedSample?.id).toBe("dingo");
    expect(selectedSample?.label).toBe("DINGO");
  });

  it("keeps right-panel reference selection separate from the editable card", () => {
    const draftCard = {
      ...DEFAULT_CARD,
      title: "Custom draft",
      body: "Do not replace me",
      artwork: {
        source: "upload" as const,
        dataUrl: "data:image/png;base64,user-art",
        crop: { x: 12, y: -8, scale: 1.4 },
      },
    };
    const selectedSample = DEV_PREVIEW_REFERENCE_SAMPLES.find((sample) => sample.id === "dingo");

    expect(selectedSample).toBeDefined();
    expect(resolveDevPreviewReferenceSelection(selectedSample!)).toEqual({
      selectedReferenceSampleId: "dingo",
      referenceImageUrl: selectedSample!.referenceUrl,
    });
    expect(draftCard.title).toBe("Custom draft");
    expect(draftCard.body).toBe("Do not replace me");
    expect(draftCard.artwork.dataUrl).toBe("data:image/png;base64,user-art");
  });

  it("loads card data when the right-panel sample is explicitly selected", async () => {
    const selectedSample = DEV_PREVIEW_REFERENCE_SAMPLES.find((sample) => sample.id === "dingo");

    expect(selectedSample).toBeDefined();
    expect(
      await resolveDevPreviewSampleCard(selectedSample!, async (cardUrl) => ({
        ...DEFAULT_CARD,
        title: cardUrl.includes("dingo") ? "DINGO" : "Unexpected sample",
        kind: "tank",
        set: "oceania-storm",
      })),
    ).toMatchObject({
      title: "DINGO",
      kind: "tank",
      set: "oceania-storm",
    });
    expect(
      await resolveDevPreviewSampleCard(
        DEV_PREVIEW_HQ_SAMPLE,
        async () => DEFAULT_CARD,
        async () => "data:image/png;base64,hq-artwork",
      ),
    ).toMatchObject({
      title: "华盛顿",
      kind: "hq",
      artwork: {
        source: "upload",
        dataUrl: "data:image/png;base64,hq-artwork",
      },
    });
  });

  it("resolves a template load as one card and reference selection", async () => {
    const sample = getDevPreviewSampleById("london_hq");

    expect(sample).toBeDefined();
    await expect(
      resolveDevPreviewTemplateSelection(
        sample!,
        async () => DEFAULT_CARD,
        async () => "data:image/png;base64,london-artwork",
      ),
    ).resolves.toMatchObject({
      referenceImageUrl: sample!.referenceUrl,
      card: {
        kind: "hq",
        title: "伦敦",
        artwork: { source: "upload", dataUrl: "data:image/png;base64,london-artwork" },
      },
    });
  });

  it("rejects stale sample loads after a newer selection or card edit", () => {
    const currentRequest = {
      isMounted: true,
      requestId: 4,
      activeRequestId: 4,
      cardEditVersionAtStart: 2,
      currentCardEditVersion: 2,
    };

    expect(shouldApplyDevPreviewSampleResult(currentRequest)).toBe(true);
    expect(shouldApplyDevPreviewSampleResult({ ...currentRequest, isMounted: false })).toBe(false);
    expect(shouldApplyDevPreviewSampleResult({ ...currentRequest, activeRequestId: 5 })).toBe(false);
    expect(shouldApplyDevPreviewSampleResult({ ...currentRequest, currentCardEditVersion: 3 })).toBe(false);
  });

  it("rejects stale automatic artwork but permits unrelated edits during loading", () => {
    const current = {
      isMounted: true,
      requestId: 4,
      activeRequestId: 4,
      matchingKeyAtStart: "tank|soviet|base|standard",
      currentMatchingKey: "tank|soviet|base|standard",
      artworkOriginKind: "none" as const,
    };

    expect(shouldApplyAutomaticArtworkResult(current)).toBe(true);
    expect(shouldApplyAutomaticArtworkResult({ ...current, activeRequestId: 5 })).toBe(false);
    expect(shouldApplyAutomaticArtworkResult({ ...current, currentMatchingKey: "tank|anzac|base|standard" })).toBe(false);
    expect(shouldApplyAutomaticArtworkResult({ ...current, artworkOriginKind: "user" })).toBe(false);
  });
});
