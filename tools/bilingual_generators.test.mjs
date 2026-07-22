import { describe, expect, it } from "vitest";
import {
  assertReferenceManifest,
  readLocalizedField,
  shouldReuseExistingReference,
} from "./generate_bilingual_sample_assets.mjs";
import { assertMatchingRenderedReference } from "./generate_bilingual_hq_references.mjs";

describe("bilingual sample generator contracts", () => {
  it("fails closed instead of using English when Chinese copy is missing", () => {
    expect(() => readLocalizedField(
      { "en-EN": "English only" },
      "zh-Hans",
      "sample-a",
      "title",
      true,
    )).toThrow(/Missing zh-Hans title/);
    expect(readLocalizedField({}, "zh-Hans", "textless", "text", false)).toBe("");
  });

  it("requires an exact sample-to-source-and-hash manifest", () => {
    const records = [{ id: "sample-a", image: "expected.avif" }];
    const valid = {
      version: 1,
      references: {
        "sample-a": { source: "expected.avif", sha256: "a".repeat(64) },
      },
    };

    expect(() => assertReferenceManifest(valid, records)).not.toThrow();
    expect(() => assertReferenceManifest({
      ...valid,
      references: {
        "sample-a": { source: "other.avif", sha256: "a".repeat(64) },
      },
    }, records)).toThrow(/Invalid Chinese reference hash manifest entry/);
  });

  it("never self-signs an existing image when the trusted manifest is missing", () => {
    const bytes = Buffer.from("existing-but-untrusted");
    const record = { id: "sample-a", image: "expected.avif" };
    const entry = { source: "expected.avif", sha256: "a".repeat(64) };

    expect(shouldReuseExistingReference(null, entry, record, bytes)).toBe(false);
  });
});

describe("bilingual HQ generator contracts", () => {
  it("rejects a valid PNG whose bytes drift from the current renderer", () => {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const committed = Buffer.concat([signature, Buffer.from("old")]);
    const rendered = Buffer.concat([signature, Buffer.from("new")]);

    expect(() => assertMatchingRenderedReference("London.png", rendered, rendered)).not.toThrow();
    expect(() => assertMatchingRenderedReference("London.png", committed, rendered)).toThrow(
      /Stale or mismatched English HQ reference/,
    );
  });
});
