import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertExactFileNames, findMarker } from "./verify_dist_private_boundary.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND_MARK_PATH = path.join(REPO_ROOT, "public", "brand", "card-forge-mark.png");
const THIRD_PARTY_NOTICES_PATH = path.join(REPO_ROOT, "public", "THIRD-PARTY-NOTICES.txt");
const RESOURCE_RIGHTS_PATH = path.join(REPO_ROOT, "RESOURCE-RIGHTS.md");
const SPEED_INSIGHTS_LICENSE_PATH = path.join(REPO_ROOT, "node_modules", "@vercel", "speed-insights", "LICENSE");
const REFERENCE_PACK_ROOT = path.join(REPO_ROOT, "public", "reference-pack", "v1");
const REFERENCE_PACK_MANIFEST_PATH = path.join(REFERENCE_PACK_ROOT, "kards-asset-pack.json");
const REFERENCE_PACK_RIGHTS_PATH = path.join(REFERENCE_PACK_ROOT, "RIGHTS-NOTICE.txt");

const CHINESE_FACTION_MARKS = [
  ["roc", "infantry", "unit", "images/nation-mark/unit/infantry/roc.png"],
  ["roc", "tank", "unit", "images/nation-mark/unit/tank/roc.png"],
  ["roc", "fighter", "unit", "images/nation-mark/unit/fighter/roc.png"],
  ["roc", "bomber", "unit", "images/nation-mark/unit/bomber/roc.png"],
  ["roc", "artillery", "unit", "images/nation-mark/unit/artillery/roc.png"],
  ["roc", "order", "command", "images/nation-mark/command/order/roc.png"],
  ["roc", "countermeasure", "command", "images/nation-mark/command/countermeasure/roc.png"],
  ["ccp", "infantry", "unit", "images/nation-mark/unit/infantry/ccp.png"],
  ["ccp", "tank", "unit", "images/nation-mark/unit/tank/ccp.png"],
  ["ccp", "fighter", "unit", "images/nation-mark/unit/fighter/ccp.png"],
  ["ccp", "bomber", "unit", "images/nation-mark/unit/bomber/ccp.png"],
  ["ccp", "artillery", "unit", "images/nation-mark/unit/artillery/ccp.png"],
  ["ccp", "order", "command", "images/nation-mark/command/order/ccp.png"],
  ["ccp", "countermeasure", "command", "images/nation-mark/command/countermeasure/ccp.png"],
];

function normalizeLineEndings(text) {
  return text.replace(/\r\n?/g, "\n");
}

describe("dist private boundary contracts", () => {
  it("recognizes forbidden private markers", () => {
    expect(findMarker("assets/.runtime/private.json")).toBe(".runtime");
    expect(findMarker("assets/public.json")).toBeNull();
  });

  it("rejects undeclared files in an exact reference-pack closure", () => {
    expect(() => assertExactFileNames(
      ["declared.png", "undeclared.png"],
      ["declared.png"],
      "manifest images",
    )).toThrow(/reference catalog/i);
  });

  it("keeps the header brand mark sized for its rendered slot", () => {
    const brandMark = fs.readFileSync(BRAND_MARK_PATH);

    expect(brandMark.byteLength).toBeLessThanOrEqual(64 * 1024);
    expect(brandMark.toString("ascii", 1, 4)).toBe("PNG");
    expect(brandMark.readUInt32BE(16)).toBeLessThanOrEqual(176);
    expect(brandMark.readUInt32BE(20)).toBeLessThanOrEqual(176);
  });

  it("ships the Speed Insights Apache 2.0 license with the deployed notices", () => {
    const notices = normalizeLineEndings(fs.readFileSync(THIRD_PARTY_NOTICES_PATH, "utf8"));
    const upstreamLicense = normalizeLineEndings(fs.readFileSync(SPEED_INSIGHTS_LICENSE_PATH, "utf8")).trim();

    expect(notices).toContain("@vercel/speed-insights 2.0.0");
    expect(notices).toContain("Copyright 2023 Vercel, Inc.");
    expect(notices).toContain("Apache License");
    expect(notices).toContain("Version 2.0, January 2004");
    expect(notices).toContain("9. Accepting Warranty or Additional Liability.");
    expect(notices).toContain(upstreamLicense);
    expect(notices).not.toMatch(/^\+\s*Apache License$/m);
  });

  it("keeps bundled placeholder artwork outside the software-license boundary", () => {
    const resourceRights = fs.readFileSync(RESOURCE_RIGHTS_PATH, "utf8");

    expect(resourceRights).toContain("`public/artwork/**`");
  });

  it("ships a complete non-HQ nation-mark matrix for both Chinese factions", () => {
    const manifest = JSON.parse(fs.readFileSync(REFERENCE_PACK_MANIFEST_PATH, "utf8"));
    const rightsNotice = fs.readFileSync(REFERENCE_PACK_RIGHTS_PATH, "utf8");
    const thirdPartyNotices = fs.readFileSync(THIRD_PARTY_NOTICES_PATH, "utf8");
    const factionEntries = manifest.images.filter(
      (entry) => entry.slot === "nation-mark" && (entry.nationId === "roc" || entry.nationId === "ccp"),
    );

    expect(factionEntries).toHaveLength(CHINESE_FACTION_MARKS.length);
    expect(factionEntries.some((entry) => entry.kind === "hq" || entry.template === "hq")).toBe(false);

    const contentDigests = new Map();
    for (const [nationId, kind, template, file] of CHINESE_FACTION_MARKS) {
      expect(factionEntries).toContainEqual({ slot: "nation-mark", nationId, kind, template, file });

      const bytes = fs.readFileSync(path.join(REFERENCE_PACK_ROOT, file));
      expect(bytes.toString("ascii", 1, 4)).toBe("PNG");
      expect(bytes.readUInt32BE(16)).toBe(54);
      expect(bytes.readUInt32BE(20)).toBe(54);
      expect(bytes[24]).toBe(8);
      expect(bytes[25]).toBe(6);
      expect(bytes.byteLength).toBeLessThanOrEqual(32 * 1024);
      contentDigests.set(`${nationId}:${kind}`, createHash("sha256").update(bytes).digest("hex"));
    }

    expect(new Set(factionEntries.map((entry) => entry.file)).size).toBe(CHINESE_FACTION_MARKS.length);
    expect(contentDigests.get("roc:infantry")).not.toBe(contentDigests.get("roc:fighter"));
    expect(contentDigests.get("roc:infantry")).not.toBe(contentDigests.get("roc:bomber"));
    expect(contentDigests.get("ccp:infantry")).not.toBe(contentDigests.get("ccp:fighter"));
    expect(contentDigests.get("ccp:infantry")).not.toBe(contentDigests.get("ccp:bomber"));
    expect(contentDigests.get("ccp:artillery")).not.toBe(contentDigests.get("ccp:infantry"));
    expect(contentDigests.get("ccp:artillery")).not.toBe(contentDigests.get("ccp:fighter"));
    expect(rightsNotice).toContain("images/nation-mark/**/roc.png");
    expect(rightsNotice).toContain("images/nation-mark/**/ccp.png");
    expect(thirdPartyNotices).toContain("File:Roundel_of_the_Republic_of_China.svg");
    expect(thirdPartyNotices).toContain("File:Roundel_of_China.svg");
    expect(thirdPartyNotices).toContain("hammer-and-sickle details and the later \"八一\" text were not retained");
  });
});
