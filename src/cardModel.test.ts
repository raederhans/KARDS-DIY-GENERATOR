import { describe, expect, it } from "vitest";
import { CARD_TEXT_APPEARANCE_BOUNDS, DEFAULT_CARD, normalizeCardSpec, sanitizeInteger } from "./cardModel";
import {
  applyAutomaticArtwork,
  applyUserCardUpdate,
  applyUserArtworkIfRevisionMatches,
  clearAutomaticArtwork,
  clearMismatchedAutomaticArtwork,
  createCardEditorState,
  getCardKindReferenceCard,
  replaceCardEditorContent,
  resetCardEditorState,
  selectCardKind,
} from "./cardEditorState";
import { getLocalizedDefaultCard, type Language } from "./i18n";
import { BODY_MAX_LENGTH, MAX_DATA_URL_LENGTH } from "./limits";
import { CARD_KINDS } from "./presets";

describe("sanitizeInteger", () => {
  it("rounds finite values and clamps to the allowed range", () => {
    expect(sanitizeInteger(4.6, 0, 12)).toBe(5);
    expect(sanitizeInteger(-3, 0, 12)).toBe(0);
    expect(sanitizeInteger(99, 0, 12)).toBe(12);
  });

  it("returns undefined for empty or invalid values", () => {
    expect(sanitizeInteger("", 0, 12)).toBeUndefined();
    expect(sanitizeInteger("not-a-number", 0, 12)).toBeUndefined();
  });
});

describe("normalizeCardSpec", () => {
  it("preserves valid card data and normalizes imported project files", () => {
    const card = normalizeCardSpec({
      version: 1,
      kind: "fighter",
      nation: "britain",
      rarity: "elite",
      set: "blood-and-iron",
      title: "ACE",
      body: "Gain air superiority.",
      keywordLine: "GUARD",
      costs: { deployment: 3, operation: 1 },
      stats: { attack: 2, defense: 4, hqDefense: 30 },
      artwork: {
        source: "upload",
        dataUrl: "data:image/png;base64,abc",
        crop: { x: 10, y: -20, scale: 1.4 },
      },
      appearance: {
        texture: {
          seed: 123,
          intensity: 2.4,
          randomness: 2.2,
          mottle: 1.8,
        },
        text: {
          title: { fontScale: 1.2, scaleX: 0.9, scaleY: 1.1, offsetX: 12, offsetY: -6, bold: false },
          keywords: { fontScale: 0.85, scaleX: 1.15, scaleY: 0.95, offsetX: -10, offsetY: 4 },
          body: { fontScale: 1.1, scaleX: 0.92, scaleY: 1.08, offsetX: 6, offsetY: -12 },
        },
      },
    });

    expect(card.kind).toBe("fighter");
    expect(card.nation).toBe("britain");
    expect(card.rarity).toBe("elite");
    expect(card.set).toBe("blood-and-iron");
    expect(card.artwork.source).toBe("upload");
    expect(card.artwork.crop.scale).toBe(1.4);
    expect(card.keywords).toEqual(["guard"]);
    expect(card.keywordLine).toBe("GUARD");
    expect(card.appearance.texture).toEqual({
      seed: 123,
      intensity: 2.4,
      randomness: 2.2,
      mottle: 1.8,
    });
    expect(card.appearance.text.title).toEqual({
      fontScale: 1.2,
      scaleX: 0.9,
      scaleY: 1.1,
      offsetX: 12,
      offsetY: -6,
      bold: false,
    });
    expect(card.appearance.text.keywords).toEqual({
      fontScale: 0.85,
      scaleX: 1.15,
      scaleY: 0.95,
      offsetX: -10,
      offsetY: 4,
    });
    expect(card.appearance.text.body).toEqual({
      fontScale: 1.1,
      scaleX: 0.92,
      scaleY: 1.08,
      offsetX: 6,
      offsetY: -12,
    });
  });

  it("normalizes card appearance so project files reproduce texture settings safely", () => {
    const card = normalizeCardSpec({
      appearance: {
        texture: {
          seed: -1,
          intensity: 99,
          randomness: -99,
          mottle: "not-a-number",
        },
        text: {
          title: {
            fontScale: 99,
            scaleX: -99,
            scaleY: "not-a-number",
            offsetX: 999,
            offsetY: -999,
            bold: "yes",
          },
          keywords: {
            fontScale: 0,
            scaleX: 2,
            scaleY: 2,
            offsetX: "not-a-number",
            offsetY: 24,
          },
        },
      },
    });

    expect(card.appearance.texture).toEqual({
      seed: 0xffffffff,
      intensity: 3,
      randomness: 0.5,
      mottle: DEFAULT_CARD.appearance.texture.mottle,
    });
    expect(card.appearance.text.title).toEqual({
      fontScale: CARD_TEXT_APPEARANCE_BOUNDS.fontScale.max,
      scaleX: CARD_TEXT_APPEARANCE_BOUNDS.scaleX.min,
      scaleY: DEFAULT_CARD.appearance.text.title.scaleY,
      offsetX: CARD_TEXT_APPEARANCE_BOUNDS.offsetX.max,
      offsetY: CARD_TEXT_APPEARANCE_BOUNDS.offsetY.min,
      bold: DEFAULT_CARD.appearance.text.title.bold,
    });
    expect(card.appearance.text.keywords).toEqual({
      fontScale: CARD_TEXT_APPEARANCE_BOUNDS.fontScale.min,
      scaleX: CARD_TEXT_APPEARANCE_BOUNDS.scaleX.max,
      scaleY: CARD_TEXT_APPEARANCE_BOUNDS.scaleY.max,
      offsetX: DEFAULT_CARD.appearance.text.keywords.offsetX,
      offsetY: 24,
    });
    expect(card.appearance.text.body).toEqual(DEFAULT_CARD.appearance.text.body);
  });

  it("keeps ordinary card-face numeric values within the two-digit range", () => {
    const card = normalizeCardSpec({
      costs: { deployment: 120, operation: 12 },
      stats: { attack: 101, defense: 99, hqDefense: 120 },
    });

    expect(card.costs.deployment).toBe(99);
    expect(card.costs.operation).toBe(12);
    expect(card.stats.attack).toBe(99);
    expect(card.stats.defense).toBe(99);
    expect(card.stats.hqDefense).toBe(99);
  });

  it("normalizes structured keywords and ignores duplicate or unknown keyword values", () => {
    const card = normalizeCardSpec({
      keywords: ["guard", "guard", "blitz", "unknown", "shock", "fury", "ambush"],
      keywordLine: "SMOKESCREEN",
    });

    expect(card.keywords).toEqual(["guard", "blitz", "shock", "fury"]);
    expect(card.keywordLine).toBe("GUARD, BLITZ, SHOCK, FURY");
  });

  it("preserves cards with no visible rarity mark", () => {
    const card = normalizeCardSpec({ rarity: "none" });

    expect(card.rarity).toBe("none");
  });

  it("migrates old comma-separated keyword lines into structured keywords", () => {
    const card = normalizeCardSpec({
      keywordLine: "BECOMESVETERAN:641ST RIFLES VET, ONLYSPAWNABLE, BLITZ, GUARD",
    });

    expect(card.keywords).toEqual(["blitz", "guard"]);
    expect(card.keywordLine).toBe("BLITZ, GUARD");
  });

  it("keeps first-version imports inside implemented artwork boundaries", () => {
    const oversizedImage = `data:image/png;base64,${"a".repeat(MAX_DATA_URL_LENGTH)}`;
    const card = normalizeCardSpec({
      body: "x".repeat(BODY_MAX_LENGTH + 10),
      artwork: {
        source: "preset",
        dataUrl: oversizedImage,
        crop: { x: 0, y: 0, scale: 1 },
        presetId: "future-feature",
      },
      customIcons: { nation: "future-feature" },
    });

    expect(card.body).toHaveLength(BODY_MAX_LENGTH);
    expect(card.artwork.source).toBe("none");
    expect(card.artwork.dataUrl).toBeUndefined();
    expect("customIcons" in card).toBe(false);
  });

  it("falls back to the default shape for invalid imports", () => {
    const card = normalizeCardSpec({
      kind: "invalid",
      nation: "unknown",
      costs: { deployment: 999 },
      artwork: { source: "remote-url", crop: { scale: 99 } },
    });

    expect(card.kind).toBe(DEFAULT_CARD.kind);
    expect(card.nation).toBe(DEFAULT_CARD.nation);
    expect(card.costs.deployment).toBe(99);
    expect(card.artwork.source).toBe("none");
    expect(card.artwork.crop.scale).toBe(3);
  });
});

describe("card editor reference samples", () => {
  it("tracks automatic artwork separately and never overwrites user artwork", () => {
    const empty = createCardEditorState(getCardKindReferenceCard("tank", "zh"), false);
    const automatic = applyAutomaticArtwork(empty, "t70", {
      source: "upload",
      dataUrl: "data:image/png;base64,automatic",
      crop: { x: 1, y: 2, scale: 1.1 },
    });
    const refreshed = applyAutomaticArtwork(automatic, "dingo", {
      source: "upload",
      dataUrl: "data:image/png;base64,refreshed",
      crop: { x: 3, y: 4, scale: 1.2 },
    });
    const userCrop = applyUserCardUpdate(refreshed, (card) => ({
      ...card,
      artwork: {
        ...card.artwork,
        crop: { ...card.artwork.crop, x: 12 },
      },
    }));
    const protectedState = applyAutomaticArtwork(userCrop, "t70", {
      source: "upload",
      dataUrl: "data:image/png;base64,should-not-win",
      crop: { x: 0, y: 0, scale: 1 },
    });

    expect(empty.artworkOrigin).toEqual({ kind: "none" });
    expect(automatic.artworkOrigin).toEqual({ kind: "auto-reference", sampleId: "t70" });
    expect(refreshed.card.artwork.dataUrl).toContain("refreshed");
    expect(userCrop.artworkOrigin).toEqual({ kind: "user" });
    expect(protectedState).toBe(userCrop);
  });

  it("clears stale automatic artwork on no-match without touching user artwork", () => {
    const automatic = applyAutomaticArtwork(createCardEditorState(DEFAULT_CARD, false), "t70", {
      source: "upload",
      dataUrl: "data:image/png;base64,auto",
      crop: { x: 1, y: 2, scale: 1.1 },
    });
    const cleared = clearAutomaticArtwork(automatic);
    const user = applyUserCardUpdate(automatic, (card) => ({
      ...card,
      artwork: { ...card.artwork, crop: { x: 5, y: 2, scale: 1.1 } },
    }));

    expect(cleared.artworkOrigin).toEqual({ kind: "none" });
    expect(cleared.card.artwork).toEqual({ source: "none", crop: { x: 0, y: 0, scale: 1 } });
    expect(clearAutomaticArtwork(user)).toBe(user);
  });

  it("does not let an older reference-artwork request overwrite a newer user artwork edit", () => {
    const initial = createCardEditorState(DEFAULT_CARD, false);
    const requestRevision = initial.artworkRevision;
    const userEdited = applyUserCardUpdate(initial, (card) => ({
      ...card,
      artwork: {
        source: "upload",
        dataUrl: "data:image/png;base64,user",
        crop: { x: 0.1, y: 0.2, scale: 1.4 },
      },
    }));

    expect(applyUserArtworkIfRevisionMatches(userEdited, requestRevision, {
      source: "upload",
      dataUrl: "data:image/png;base64,older-reference",
      crop: { x: 0, y: 0, scale: 1 },
    })).toBe(userEdited);
  });

  it("clears sample A when unique sample B fails without clearing user artwork", () => {
    const automaticA = applyAutomaticArtwork(createCardEditorState(DEFAULT_CARD, false), "sample-a", {
      source: "upload",
      dataUrl: "data:image/png;base64,sample-a",
      crop: { x: 0, y: 0, scale: 1 },
    });
    const user = applyUserCardUpdate(automaticA, (card) => ({
      ...card,
      artwork: { ...card.artwork, crop: { x: 1, y: 0, scale: 1 } },
    }));

    expect(clearMismatchedAutomaticArtwork(automaticA, "sample-b").artworkOrigin)
      .toEqual({ kind: "none" });
    expect(clearMismatchedAutomaticArtwork(automaticA, "sample-a")).toBe(automaticA);
    expect(clearMismatchedAutomaticArtwork(user, "sample-b")).toBe(user);
  });

  it("keeps automatic artwork provenance for unrelated edits", () => {
    const automatic = applyAutomaticArtwork(
      createCardEditorState(getCardKindReferenceCard("tank", "zh"), false),
      "t70",
      {
        source: "upload",
        dataUrl: "data:image/png;base64,automatic",
        crop: { x: 0, y: 0, scale: 1 },
      },
    );
    const titled = applyUserCardUpdate(automatic, (card) => ({ ...card, title: "保留标题" }));

    expect(titled.card.title).toBe("保留标题");
    expect(titled.artworkOrigin).toEqual({ kind: "auto-reference", sampleId: "t70" });
  });

  it("treats imports, full-card loads, and reset as explicit source transitions", () => {
    const imported = replaceCardEditorContent(getCardKindReferenceCard("fighter", "zh"));
    const reset = resetCardEditorState("zh");

    expect(imported.artworkOrigin).toEqual({ kind: "user" });
    expect(reset.artworkOrigin).toEqual({ kind: "none" });
  });

  it("provides complete, kind-appropriate reference content for every card kind", () => {
    let state = createCardEditorState(getLocalizedDefaultCard("zh"), false);

    for (const kind of CARD_KINDS) {
      state = selectCardKind(state, kind.id, "zh");
      const sample = state.card;

      expect(state.hasUserEdits).toBe(false);
      expect(sample.kind).toBe(kind.id);
      expect(sample.title.trim()).not.toBe("");
      expect(sample.body.trim()).not.toBe("");
      expect(sample.artwork.source).toBe("none");

      if (kind.id === "hq") {
        expect(sample.costs.deployment).toBeUndefined();
        expect(sample.costs.operation).toBeUndefined();
        expect(sample.stats.attack).toBeUndefined();
        expect(sample.stats.defense).toBeUndefined();
        expect(sample.stats.hqDefense).toBeGreaterThan(0);
        expect(sample.keywords).toEqual([]);
      } else if (kind.hasStats) {
        expect(sample.costs.deployment).toBeTypeOf("number");
        expect(sample.costs.operation).toBeTypeOf("number");
        expect(sample.stats.attack).toBeTypeOf("number");
        expect(sample.stats.defense).toBeTypeOf("number");
        expect(sample.stats.hqDefense).toBeUndefined();
      } else {
        expect(sample.costs.deployment).toBeTypeOf("number");
        expect(sample.costs.operation).toBeUndefined();
        expect(sample.stats.attack).toBeUndefined();
        expect(sample.stats.defense).toBeUndefined();
        expect(sample.stats.hqDefense).toBeUndefined();
      }
    }
  });

  it("changes only the kind after the player has edited card content", () => {
    const pristine = createCardEditorState(getLocalizedDefaultCard("zh"), false);
    const edited = applyUserCardUpdate(pristine, (currentCard) => ({
      ...currentCard,
      title: "玩家自定义标题",
      body: "这段正文必须在切换类型后保留。",
      nation: "japan",
      rarity: "elite",
      set: "winter-war",
      keywords: ["ambush"],
      keywordLine: "AMBUSH",
      costs: { deployment: 9, operation: 8 },
      stats: { attack: 7, defense: 6, hqDefense: 25 },
      artwork: {
        source: "upload",
        dataUrl: "data:image/png;base64,abc",
        crop: { x: 14, y: -9, scale: 1.4 },
      },
      appearance: {
        ...currentCard.appearance,
        text: {
          ...currentCard.appearance.text,
          title: {
            ...currentCard.appearance.text.title,
            offsetX: 18,
          },
        },
      },
    }));

    const selected = selectCardKind(edited, "bomber", "zh");

    expect(selected.hasUserEdits).toBe(true);
    expect(selected.card).toEqual({
      ...edited.card,
      kind: "bomber",
    });
  });

  it("fills only missing HQ values when an edited unit changes type", () => {
    const tank = getCardKindReferenceCard("tank", "zh");
    const edited = applyUserCardUpdate(createCardEditorState(tank, false), {
      ...tank,
      title: "玩家保留的坦克标题",
    });

    const selected = selectCardKind(edited, "hq", "zh");

    expect(selected.card.title).toBe("玩家保留的坦克标题");
    expect(selected.card.stats.hqDefense).toBe(20);
    expect(selected.card.stats.attack).toBe(tank.stats.attack);
    expect(selected.card.stats.defense).toBe(tank.stats.defense);
    expect(selected.card.keywords).toEqual(tank.keywords);
  });

  it("fills only missing unit values when an edited HQ changes type", () => {
    const hq = getCardKindReferenceCard("hq", "zh");
    const edited = applyUserCardUpdate(createCardEditorState(hq, false), {
      ...hq,
      title: "玩家保留的总部标题",
    });

    const selected = selectCardKind(edited, "fighter", "zh");

    expect(selected.card.title).toBe("玩家保留的总部标题");
    expect(selected.card.costs.deployment).toBe(3);
    expect(selected.card.costs.operation).toBe(1);
    expect(selected.card.stats.attack).toBe(3);
    expect(selected.card.stats.defense).toBe(3);
    expect(selected.card.stats.hqDefense).toBe(hq.stats.hqDefense);
  });

  it("does not refill visible numeric fields the player deliberately cleared", () => {
    const fighter = getCardKindReferenceCard("fighter", "zh");
    const edited = applyUserCardUpdate(createCardEditorState(fighter, false), {
      ...fighter,
      costs: { deployment: undefined, operation: undefined },
      stats: { attack: undefined, defense: fighter.stats.defense },
    });

    const selected = selectCardKind(edited, "bomber", "zh");

    expect(selected.card.costs.deployment).toBeUndefined();
    expect(selected.card.costs.operation).toBeUndefined();
    expect(selected.card.stats.attack).toBeUndefined();
    expect(selected.card.stats.defense).toBe(fighter.stats.defense);
  });

  it("remembers cleared unit values across an HQ round trip", () => {
    const fighter = getCardKindReferenceCard("fighter", "zh");
    let state = applyUserCardUpdate(createCardEditorState(fighter, false), {
      ...fighter,
      stats: { ...fighter.stats, attack: undefined },
    });

    state = selectCardKind(state, "hq", "zh");
    state = selectCardKind(state, "bomber", "zh");

    expect(state.card.stats.attack).toBeUndefined();
    expect(state.card.stats.defense).toBe(fighter.stats.defense);
  });

  it("remembers cleared deployment across a command and HQ round trip", () => {
    const order = getCardKindReferenceCard("order", "zh");
    let state = applyUserCardUpdate(createCardEditorState(order, false), {
      ...order,
      costs: { deployment: undefined },
    });

    state = selectCardKind(state, "hq", "zh");
    state = selectCardKind(state, "order", "zh");

    expect(state.card.costs.deployment).toBeUndefined();
  });

  it("remembers cleared HQ defense across a unit round trip", () => {
    const hq = getCardKindReferenceCard("hq", "zh");
    let state = applyUserCardUpdate(createCardEditorState(hq, false), {
      ...hq,
      stats: { hqDefense: undefined },
    });

    state = selectCardKind(state, "fighter", "zh");
    state = selectCardKind(state, "hq", "zh");

    expect(state.card.stats.hqDefense).toBeUndefined();
  });

  it("uses the explicit persisted edit classification instead of guessing from card contents", () => {
    for (const language of ["en", "zh"] satisfies Language[]) {
      for (const kind of CARD_KINDS) {
        const sample = getCardKindReferenceCard(kind.id, language);
        expect(createCardEditorState(sample, false).hasUserEdits).toBe(false);
        expect(createCardEditorState(sample, true).hasUserEdits).toBe(true);
      }
    }

    expect(
      createCardEditorState({
        ...getCardKindReferenceCard("fighter", "zh"),
        title: "已经修改过的战斗机",
      }, true).hasUserEdits,
    ).toBe(true);
  });

  it("restores reference mode on reset but treats explicit card replacement as authored content", () => {
    const replacement = replaceCardEditorContent({
      ...getCardKindReferenceCard("artillery", "zh"),
      title: "导入的炮兵",
    });
    const reset = resetCardEditorState("zh");

    expect(replacement.hasUserEdits).toBe(true);
    expect(reset.hasUserEdits).toBe(false);
    expect(reset.card).toEqual(getCardKindReferenceCard("tank", "zh"));
  });

  it("fills target-only values after replacing the whole card", () => {
    const unitReplacement = replaceCardEditorContent(getCardKindReferenceCard("fighter", "zh"));
    const hqSelection = selectCardKind(unitReplacement, "hq", "zh");
    const hqReplacement = replaceCardEditorContent(getCardKindReferenceCard("hq", "zh"));
    const unitSelection = selectCardKind(hqReplacement, "fighter", "zh");

    expect(hqSelection.card.stats.hqDefense).toBe(20);
    expect(unitSelection.card.costs.deployment).toBe(3);
    expect(unitSelection.card.costs.operation).toBe(1);
    expect(unitSelection.card.stats.attack).toBe(3);
    expect(unitSelection.card.stats.defense).toBe(3);
  });

  it("does not inherit cleared-field provenance when replacing the whole card", () => {
    const fighter = getCardKindReferenceCard("fighter", "zh");
    const edited = applyUserCardUpdate(createCardEditorState(fighter, false), {
      ...fighter,
      stats: { ...fighter.stats, attack: undefined },
    });
    expect(edited.clearedNumericFields).toContain("attack");

    const replacement = replaceCardEditorContent(getCardKindReferenceCard("order", "zh"));
    const selected = selectCardKind(replacement, "fighter", "zh");

    expect(selected.card.stats.attack).toBe(3);
    expect(selected.card.stats.defense).toBe(3);
  });
});
