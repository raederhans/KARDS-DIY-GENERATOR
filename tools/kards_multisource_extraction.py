#!/usr/bin/env python3
"""Build a private multi-source KARDS asset inventory and calibration pack."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageStat


OUTPUT_MARKER_FILE = ".kards-stage6-multisource-output"
DEFAULT_OUTPUT = Path(".runtime/kards-private-assets/stage6-multisource-clean-extraction")
DEFAULT_STAGE5_PACK = Path(".runtime/kards-private-assets/stage5-card-face-elements")
DEFAULT_REPOS_ROOT = Path(".runtime/research/subagents/repos")
DEFAULT_KARDS_INSTALL = Path(r"C:\Program Files (x86)\Steam\steamapps\common\KARDS")

CURRENT_SMOKE_SAFE_SLOTS = {"nation-mark", "type-icon", "rarity-pip", "set-mark"}
FORBIDDEN_OUTPUT_SEGMENTS = {"public", "dist", "src"}
SET_MARK_CANVAS_SIZE = (30, 28)
SET_MARK_BASELINE_Y = 26

KARDSGEN_SET_MARK_SOURCES = {
    "allegiance": "set/png/Allegiance.png",
    "base": "set/png/Base.png",
    "blood-and-iron": "set/png/Blood.png",
    "breakthrough": "set/png/Breakthrough.png",
    "brothers-in-arms": "set/png/Brothers.png",
    "covert-ops": "set/png/Covert.png",
    "homefront": "set/png/Homefront.png",
    "legions": "set/png/Legions.png",
    "naval-warfare": "set/png/Naval.png",
    "oceania-storm": "set/png/Oceania.png",
    "special": "set/png/FanMade.png",
    "theaters-of-war": "set/png/Theaters.png",
    "winter-war": "set/png/Winter.png",
    "world-at-war": "set/png/World.png",
}

KARDSGEN_LOADABLE_ASSETS = [
    ("frame", "frame.png", "frame"),
    ("cost-board", "kredit-board(12,13).png", "cost-board"),
    ("command-border", "extra-border(0,402).png", "command-border"),
    ("attack-board", "icon/board(88,468)(330,473).png", "attack-board"),
    ("defense-board", "icon/board(88,468)(330,473).png", "defense-board"),
    ("special-attack-board", "icon/special-board(82,468).png", "special-attack-board"),
    ("hq-defense-board", "icon/HQ-board(166,343).png", "hq-defense-board"),
]

KARDSGEN_REFERENCE_DIRS = [
    ("nation-icons", "nation"),
    ("type-icons", "type"),
    ("rarity-icons", "rarity"),
    ("set-icons", "set"),
    ("boards-and-frame", "icon"),
]

EXPECTED_RENDER_SLOT_SIZE = {
    "frame": (500, 702),
    "cost-board": (86, 86),
    "command-border": (500, 64),
    "attack-board": (82, 82),
    "defense-board": (82, 82),
    "special-attack-board": (94, 94),
    "hq-defense-board": (168, 112),
}

CARD_BACK_PATTERNS = [
    ("base", r"base.*card.*back.*a|basic.*a"),
    ("allegiance", r"allegiance.*a"),
    ("blood-and-iron", r"blood.*iron.*a|blood_and_iron.*a"),
    ("breakthrough", r"breakthrough.*a"),
    ("brothers-in-arms", r"bia.*a|brothers.*a"),
    ("covert-ops", r"covert.*a"),
    ("homefront", r"homefront.*a"),
    ("legions", r"legions.*a"),
    ("naval-warfare", r"naval.*a"),
    ("winter-war", r"winter.*war.*a"),
    ("world-at-war", r"world.*a"),
    ("usa", r"usa.*a|usabasic.*a"),
    ("britain", r"britain.*a"),
    ("germany", r"german.*a"),
    ("soviet", r"soviet.*a|ussr.*a"),
    ("japan", r"jap.*a|japan.*a"),
]

PAK_MANIFEST_PATTERNS = {
    "engine-fonts": re.compile(r"Engine/Content/Slate/Fonts/.*\.(ttf|tps)$", re.I),
    "kards-fonts": re.compile(r"kards/Content/.*/Fonts?/.*", re.I),
    "card-materials": re.compile(r"kards/Content/Assets/Materials/(Card|card).*", re.I),
    "card-textures": re.compile(
        r"kards/Content/Assets/Textures/.*"
        r"(card|frame|board|kredit|cost|rarity|nation|faction|set|type|icon|shadow|glow|zoom).*",
        re.I,
    ),
    "card-art-images": re.compile(r"kards/Content/Assets/Textures/Images/.*\.(uasset|uexp|ubulk)$", re.I),
    "ui-card-widgets": re.compile(r"kards/Content/.*(UI|Widget|WBP|HUD|Card).*\.(uasset|uexp)$", re.I),
    "effects-excluded": re.compile(r"kards/Content/.*Effects/.*\.(uasset|uexp|ubulk)$", re.I),
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--stage5-pack", type=Path, default=DEFAULT_STAGE5_PACK)
    parser.add_argument("--repos-root", type=Path, default=DEFAULT_REPOS_ROOT)
    parser.add_argument("--kards-install", type=Path, default=DEFAULT_KARDS_INSTALL)
    parser.add_argument("--cardback-sample-limit", type=int, default=40)
    parser.add_argument(
        "--allow-outside-runtime",
        action="store_true",
        help="Allow writing private official-derived files outside a .runtime folder.",
    )
    args = parser.parse_args()

    output_dir = args.output.resolve()
    prepare_output(output_dir, args.allow_outside_runtime)

    extracted_assets: list[dict[str, Any]] = []
    renderer_manifest_images: list[dict[str, str]] = []
    source_inventory: dict[str, Any] = {}

    stage5 = copy_stage5_clean_assets(args.stage5_pack, output_dir, extracted_assets, renderer_manifest_images)
    source_inventory["stage5PrivatePack"] = stage5

    repos_root = args.repos_root
    kardsgen_root = repos_root / "KardsGen"
    kards_assets_root = repos_root / "KARDS-Assets"
    craftsoul_root = repos_root / "kards-image-tool"

    source_inventory["kardsGen"] = process_kardsgen(
        kardsgen_root,
        output_dir,
        extracted_assets,
        renderer_manifest_images,
    )
    source_inventory["kardsAssets"] = process_kards_assets(
        kards_assets_root,
        output_dir,
        extracted_assets,
        args.cardback_sample_limit,
    )
    source_inventory["craftSoulImageTool"] = process_craftsoul(craftsoul_root, output_dir, extracted_assets)
    source_inventory["localKardsInstall"] = scan_local_kards_install(args.kards_install)

    asset_pack = {
        "version": 1,
        "name": "KARDS private Stage6 smoke-safe clean slots",
        "rightsNotice": (
            "Private local validation only. Official-derived KARDS assets remain owned by their respective rights holders "
            "and must not be committed, bundled, or redistributed."
        ),
        "images": renderer_manifest_images,
        "fonts": [],
    }
    write_json(output_dir / "kards-asset-pack.json", asset_pack)

    report = {
        "profile": "stage6",
        "scope": "multi-source-card-face-font-view-extraction",
        "generatedAt": utc_now(),
        "output": str(output_dir),
        "sourceRoutes": build_source_routes(source_inventory),
        "rendererManifest": {
            "manifest": "kards-asset-pack.json",
            "imageCount": len(renderer_manifest_images),
            "smokeSafeSlots": sorted(CURRENT_SMOKE_SAFE_SLOTS),
            "policy": (
                "This manifest intentionally contains only the current Stage4/5 smoke-safe icon slots. "
                "KardsGen boards, frames, card backs, HQ images, fonts, and pak candidates are cataloged separately."
            ),
        },
        "extractedAssets": extracted_assets,
        "summary": summarize_assets(extracted_assets, source_inventory, renderer_manifest_images),
        "sourceInventory": source_inventory,
    }

    write_json(output_dir / "stage6-multisource-report.json", report)
    write_json(output_dir / "stage6-source-inventory.json", source_inventory)
    write_json(output_dir / "stage6-private-assets-manifest.json", {"assets": extracted_assets})
    write_summary(output_dir / "stage6-multisource-summary.md", report)

    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))


def prepare_output(output_dir: Path, allow_outside_runtime: bool) -> None:
    validate_output_dir(output_dir, allow_outside_runtime)
    output_dir.mkdir(parents=True, exist_ok=True)
    marker = output_dir / OUTPUT_MARKER_FILE
    owned = marker.exists()

    for relative in ["images", "references", "samples", "source-snapshots"]:
        path = output_dir / relative
        if path.exists() and not owned:
            raise SystemExit(
                f"Refusing to clean {path}: {output_dir} is missing {OUTPUT_MARKER_FILE}. "
                "Choose an empty .runtime output folder or a folder created by this tool."
            )
        if path.exists():
            remove_tree_contents(path)

    for filename in [
        "kards-asset-pack.json",
        "stage6-multisource-report.json",
        "stage6-multisource-summary.md",
        "stage6-source-inventory.json",
        "stage6-private-assets-manifest.json",
        "calibration-report.json",
    ]:
        path = output_dir / filename
        if path.exists() and not owned:
            raise SystemExit(f"Refusing to overwrite {path}: {output_dir} is missing {OUTPUT_MARKER_FILE}.")
        if path.exists():
            path.unlink()

    marker.write_text(
        "Generated by tools/kards_multisource_extraction.py. Private official-derived assets only.\n",
        encoding="utf-8",
    )


def validate_output_dir(output_dir: Path, allow_outside_runtime: bool) -> None:
    resolved = output_dir.resolve()
    lower_parts = {part.lower() for part in resolved.parts}
    forbidden = sorted(lower_parts & FORBIDDEN_OUTPUT_SEGMENTS)
    if forbidden:
        raise SystemExit(
            f"Refusing to write private official-derived assets under public build/source folders: {resolved}"
        )
    if allow_outside_runtime:
        return
    if ".runtime" not in lower_parts:
        raise SystemExit(
            f"Refusing to write private official-derived assets outside .runtime: {resolved}"
        )


def copy_stage5_clean_assets(
    stage5_pack: Path,
    output_dir: Path,
    extracted_assets: list[dict[str, Any]],
    renderer_manifest_images: list[dict[str, str]],
) -> dict[str, Any]:
    manifest_path = stage5_pack / "kards-asset-pack.json"
    report_path = stage5_pack / "stage5-card-face-elements-report.json"
    calibration_report_path = stage5_pack / "calibration-report.json"
    samples_path = stage5_pack / "samples"
    inventory = {
        "path": str(stage5_pack),
        "manifestExists": manifest_path.exists(),
        "reportExists": report_path.exists(),
        "calibrationReportExists": calibration_report_path.exists(),
        "sampleFilesCopied": 0,
        "copiedImages": 0,
        "setMarksDelegatedToKardsGen": 0,
        "status": "missing",
    }
    if not manifest_path.exists():
        return inventory

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for entry in manifest.get("images", []):
        slot = entry.get("slot")
        file_name = entry.get("file")
        if slot not in CURRENT_SMOKE_SAFE_SLOTS or not file_name:
            continue
        if slot == "set-mark" and entry.get("setId") in KARDSGEN_SET_MARK_SOURCES:
            inventory["setMarksDelegatedToKardsGen"] += 1
            continue
        source_path = resolve_pack_file(stage5_pack, file_name)
        if not source_path.exists():
            continue
        target_path = output_dir / "images" / "stage5-clean" / slot
        if entry.get("template"):
            target_path /= entry["template"]
        if entry.get("kind"):
            target_path /= entry["kind"]
        target_path /= source_path.name
        copy_file(source_path, target_path)
        new_entry = {key: value for key, value in entry.items() if key != "file"}
        new_entry["file"] = relpath(target_path, output_dir)
        renderer_manifest_images.append(new_entry)
        extracted_assets.append(
            asset_record(
                asset_id=":".join(filter(None, ["stage5", slot, entry.get("template"), entry.get("kind"), source_path.stem])),
                category="renderer-smoke-safe-slot",
                source_route="stage5-private-official-crop",
                source_path=source_path,
                output_path=target_path,
                output_root=output_dir,
                source_status="official-card-crop-private",
                renderer_readiness="renderer-ready-current-smoke",
                rights="official-derived-private-validation-only",
                slot=slot,
                notes="Copied from the Stage5 pack because Stage4/5 visual smoke already proved this slot geometry.",
            )
        )
        inventory["copiedImages"] += 1

    inventory["status"] = "copied-clean-slots" if inventory["copiedImages"] else "manifest-empty"
    if calibration_report_path.exists():
        copy_file(calibration_report_path, output_dir / "calibration-report.json")
    if samples_path.exists():
        for sample_path in sorted(samples_path.glob("*.card.json")):
            copy_file(sample_path, output_dir / "samples" / sample_path.name)
            inventory["sampleFilesCopied"] += 1
    if report_path.exists():
        report = json.loads(report_path.read_text(encoding="utf-8"))
        inventory["stage5Coverage"] = report.get("coverage", {})
        inventory["stage5ReferenceCropCount"] = report.get("referenceElements", {}).get("cropCount")
        inventory["stage5LocalCandidateCount"] = report.get("localAssetIndex", {}).get("summary", {}).get("totalCandidates")
    return inventory


def process_kardsgen(
    root: Path,
    output_dir: Path,
    extracted_assets: list[dict[str, Any]],
    renderer_manifest_images: list[dict[str, str]],
) -> dict[str, Any]:
    material_root = root / "Material"
    canonical_material_root = root / "KardsGen" / "Material"
    source_root = material_root if material_root.exists() else canonical_material_root
    inventory: dict[str, Any] = {
        "path": str(root),
        "exists": root.exists(),
        "materialRoot": str(source_root),
        "license": "MIT for software; official-style/material rights remain source-specific",
        "rendererSlotCandidateCount": 0,
        "referenceCopyCount": 0,
        "promotedSetMarkCount": 0,
        "fileCounts": {},
    }
    if not source_root.exists():
        raise SystemExit(f"KardsGen material is required for clean set marks: {source_root}")

    material_files = [
        path for path in source_root.rglob("*") if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".svg"}
    ]
    inventory["fileCounts"] = dict(Counter(path.suffix.lower() for path in material_files))

    for slot, relative, category in KARDSGEN_LOADABLE_ASSETS:
        source_path = source_root / relative
        if not source_path.exists():
            continue
        target_path = output_dir / "references" / "kardsgen" / "renderer-slot-candidates" / category / source_path.name
        copy_file(source_path, target_path)
        extracted_assets.append(
            asset_record(
                asset_id=f"kardsgen:{slot}",
                category=category,
                source_route="kardsgen-material",
                source_path=source_path,
                output_path=target_path,
                output_root=output_dir,
                source_status="external-fan-tool-material",
                renderer_readiness="renderer-slot-candidate-unwired-needs-smoke",
                rights="KardsGen code is MIT; official-style material assets require private/non-commercial handling",
                slot=slot,
                notes="Kept outside kards-asset-pack.json until board/frame smoke supports this slot.",
                extra=slot_fit_metadata(source_path, slot),
            )
        )
        inventory["rendererSlotCandidateCount"] += 1

    for category, relative_dir in KARDSGEN_REFERENCE_DIRS:
        source_dir = source_root / relative_dir
        if not source_dir.exists():
            continue
        for source_path in sorted(source_dir.rglob("*")):
            if not source_path.is_file() or source_path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".svg"}:
                continue
            target_path = output_dir / "references" / "kardsgen" / category / source_path.relative_to(source_dir)
            copy_file(source_path, target_path)
            extracted_assets.append(
                asset_record(
                    asset_id=f"kardsgen-reference:{category}:{source_path.stem}",
                    category=category,
                    source_route="kardsgen-material-reference",
                    source_path=source_path,
                    output_path=target_path,
                    output_root=output_dir,
                    source_status="external-fan-tool-material",
                    renderer_readiness="reference-only-duplicate-or-needs-dedup",
                    rights="KardsGen code is MIT; material assets need private/non-commercial handling",
                    notes="Copied for cross-source comparison and future deduplication.",
                )
            )
            inventory["referenceCopyCount"] += 1

    inventory["promotedSetMarkCount"] = promote_kardsgen_set_marks(
        source_root,
        output_dir,
        extracted_assets,
        renderer_manifest_images,
    )

    inventory["status"] = "copied-private-reference-candidates"
    return inventory


def normalize_kardsgen_set_mark(source: Image.Image) -> Image.Image:
    mark = source.convert("RGBA")
    canvas_width = SET_MARK_CANVAS_SIZE[0]
    if mark.width > canvas_width or mark.height > SET_MARK_BASELINE_Y:
        raise ValueError(
            f"KardsGen set mark exceeds the {canvas_width}x{SET_MARK_BASELINE_Y} anchored area: {mark.size}"
        )

    output = Image.new("RGBA", SET_MARK_CANVAS_SIZE, (0, 0, 0, 0))
    output.alpha_composite(mark, (canvas_width - mark.width, SET_MARK_BASELINE_Y - mark.height))
    return output


def promote_kardsgen_set_marks(
    source_root: Path,
    output_dir: Path,
    extracted_assets: list[dict[str, Any]],
    renderer_manifest_images: list[dict[str, str]],
) -> int:
    sources = {
        set_id: source_root / relative_path
        for set_id, relative_path in KARDSGEN_SET_MARK_SOURCES.items()
    }
    missing = [str(path) for path in sources.values() if not path.is_file()]
    if missing:
        raise SystemExit("Missing required KardsGen set marks: " + ", ".join(missing))

    for set_id, source_path in sources.items():
        with Image.open(source_path) as source:
            normalized = normalize_kardsgen_set_mark(source)
        target_path = output_dir / "images" / "stage5-clean" / "set-mark" / f"{set_id}.png"
        target_path.parent.mkdir(parents=True, exist_ok=True)
        normalized.save(target_path)
        renderer_manifest_images.append({
            "slot": "set-mark",
            "setId": set_id,
            "file": relpath(target_path, output_dir),
        })
        extracted_assets.append(
            asset_record(
                asset_id=f"kardsgen:set-mark:{set_id}",
                category="renderer-smoke-safe-slot",
                source_route="kardsgen-clean-set-material",
                source_path=source_path,
                output_path=target_path,
                output_root=output_dir,
                source_status="external-fan-tool-material",
                renderer_readiness="renderer-ready-clean-set-mark",
                rights="KardsGen repository MIT; KARDS-derived marks remain reference-pack restricted",
                slot="set-mark",
                notes="Placed at KardsGen's native bottom-right anchor without card-paper extraction.",
            )
        )
    return len(sources)


def process_kards_assets(
    root: Path,
    output_dir: Path,
    extracted_assets: list[dict[str, Any]],
    cardback_sample_limit: int,
) -> dict[str, Any]:
    inventory: dict[str, Any] = {
        "path": str(root),
        "exists": root.exists(),
        "license": "official static assets owned by 1939 Games; private non-commercial validation only",
        "cardBackCount": 0,
        "cardBackCopied": 0,
        "hqCount": 0,
        "hqCopied": 0,
    }
    if not root.exists():
        inventory["status"] = "missing"
        return inventory

    cardbacks = sorted((root / "CardBacks_Resized").glob("*")) if (root / "CardBacks_Resized").exists() else []
    cardbacks = [path for path in cardbacks if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}]
    inventory["cardBackCount"] = len(cardbacks)
    selected_cardbacks = select_cardbacks(cardbacks, cardback_sample_limit)
    for source_path in selected_cardbacks:
        target_path = output_dir / "references" / "kards-assets" / "cardbacks-sampled" / source_path.name
        copy_file(source_path, target_path)
        extracted_assets.append(
            asset_record(
                asset_id=f"kards-assets:cardback:{source_path.stem}",
                category="card-back",
                source_route="kards-assets-cardback",
                source_path=source_path,
                output_path=target_path,
                output_root=output_dir,
                source_status="official-static-asset-private",
                renderer_readiness="future-renderer-candidate-card-back-not-current-slot",
                rights="1939 Games official asset; private validation only",
                notes="Sampled from all indexed card backs; current card-face renderer has no card-back slot.",
            )
        )
        inventory["cardBackCopied"] += 1

    hq_dir = root / "HQ2_unknown-id_Resized"
    hq_files = sorted(hq_dir.glob("*.png")) if hq_dir.exists() else []
    inventory["hqCount"] = len(hq_files)
    for source_path in hq_files:
        target_path = output_dir / "references" / "kards-assets" / "hq2" / source_path.name
        copy_file(source_path, target_path)
        extracted_assets.append(
            asset_record(
                asset_id=f"kards-assets:hq:{source_path.stem}",
                category="hq-reference",
                source_route="kards-assets-hq2",
                source_path=source_path,
                output_path=target_path,
                output_root=output_dir,
                source_status="official-static-asset-private",
                renderer_readiness="reference-only-hq-full-card-or-hq-art",
                rights="1939 Games official asset; private validation only",
                notes="Used to replace Stage5 synthetic-only HQ evidence with private static HQ references.",
            )
        )
        inventory["hqCopied"] += 1

    hq_names = hq_dir / "hq_names.json"
    if hq_names.exists():
        target_path = output_dir / "source-snapshots" / "kards-assets" / "hq_names.json"
        copy_file(hq_names, target_path)
        inventory["hqNamesSnapshot"] = relpath(target_path, output_dir)

    inventory["status"] = "copied-private-reference-samples"
    return inventory


def process_craftsoul(root: Path, output_dir: Path, extracted_assets: list[dict[str, Any]]) -> dict[str, Any]:
    inventory: dict[str, Any] = {
        "path": str(root),
        "exists": root.exists(),
        "license": "MIT for software; official card images fetched by the tool remain official-derived",
        "nationSvgCount": 0,
        "backgroundCount": 0,
        "cardDataCount": 0,
    }
    if not root.exists():
        inventory["status"] = "missing"
        return inventory

    for source_path in sorted(root.glob("*.svg")):
        target_path = output_dir / "references" / "craftsoul" / "nation-svg" / source_path.name
        copy_file(source_path, target_path)
        inventory["nationSvgCount"] += 1
        extracted_assets.append(
            asset_record(
                asset_id=f"craftsoul:nation-svg:{source_path.stem}",
                category="nation-icon-reference-svg",
                source_route="craftsoul-image-tool",
                source_path=source_path,
                output_path=target_path,
                output_root=output_dir,
                source_status="external-tool-static-reference",
                renderer_readiness="reference-only-not-current-smoke-source",
                rights="Tool is MIT; icon style still needs source review before redistribution",
                notes="Useful as a vector comparison source for nation marks.",
            )
        )

    for source_path in sorted(root.glob("*.jpg")) + sorted(root.glob("*.png")):
        target_path = output_dir / "references" / "craftsoul" / "backgrounds" / source_path.name
        copy_file(source_path, target_path)
        inventory["backgroundCount"] += 1
        extracted_assets.append(
            asset_record(
                asset_id=f"craftsoul:background:{source_path.stem}",
                category="tool-background-or-reserve-image",
                source_route="craftsoul-image-tool",
                source_path=source_path,
                output_path=target_path,
                output_root=output_dir,
                source_status="external-tool-static-reference",
                renderer_readiness="reference-only-not-card-face-slot",
                rights="Tool is MIT; background/icon source needs separate review",
                notes="Reference for existing card collection/deck-builder UI, not a card-face renderer asset.",
            )
        )

    data_path = root / "data.json"
    if data_path.exists():
        data = json.loads(data_path.read_text(encoding="utf-8"))
        cards = data.get("cards", []) if isinstance(data, dict) else []
        inventory["cardDataCount"] = len(cards)
        target_path = output_dir / "source-snapshots" / "craftsoul" / "data-summary.json"
        write_json(
            target_path,
            {
                "source": str(data_path),
                "cardCount": len(cards),
                "keys": sorted(cards[0].keys()) if cards and isinstance(cards[0], dict) else [],
            },
        )
        inventory["dataSummary"] = relpath(target_path, output_dir)

    inventory["status"] = "copied-reference-snapshots"
    return inventory


def scan_local_kards_install(kards_install: Path) -> dict[str, Any]:
    manifest_path = kards_install / "Manifest_UFSFiles_Win64.txt"
    pak_path = kards_install / "kards" / "Content" / "Paks" / "kards-Windows.pak"
    inventory: dict[str, Any] = {
        "path": str(kards_install),
        "manifest": str(manifest_path),
        "manifestExists": manifest_path.exists(),
        "pak": str(pak_path),
        "pakExists": pak_path.exists(),
        "pakSizeBytes": pak_path.stat().st_size if pak_path.exists() else None,
        "status": "indexed-only-no-extractor",
        "groups": {},
        "looseFileProbe": {},
    }
    if not manifest_path.exists():
        inventory["status"] = "manifest-missing"
        return inventory

    counts: Counter[str] = Counter()
    examples: dict[str, list[str]] = defaultdict(list)
    loose_probe: dict[str, bool] = {}
    for raw_line in manifest_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        path = raw_line.split("\t", 1)[0].strip().replace("\\", "/")
        for name, pattern in PAK_MANIFEST_PATTERNS.items():
            if not pattern.search(path):
                continue
            counts[name] += 1
            if len(examples[name]) < 20:
                examples[name].append(path)
                loose_probe[path] = (kards_install / path).exists()

    for name in sorted(PAK_MANIFEST_PATTERNS):
        inventory["groups"][name] = {
            "count": counts[name],
            "examples": examples[name],
        }
    inventory["looseFileProbe"] = loose_probe
    return inventory


def select_cardbacks(cardbacks: list[Path], limit: int) -> list[Path]:
    selected: list[Path] = []
    selected_names: set[str] = set()
    lower_map = [(path, path.name.lower()) for path in cardbacks]
    for _label, pattern in CARD_BACK_PATTERNS:
        regex = re.compile(pattern, re.I)
        match = next((path for path, name in lower_map if regex.search(name) and path.name not in selected_names), None)
        if match is not None:
            selected.append(match)
            selected_names.add(match.name)
        if len(selected) >= limit:
            return selected

    for path in cardbacks:
        if path.name in selected_names:
            continue
        selected.append(path)
        selected_names.add(path.name)
        if len(selected) >= limit:
            break
    return selected


def build_source_routes(source_inventory: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {
            "id": "stage5-private-official-crop",
            "status": source_inventory["stage5PrivatePack"].get("status", "unknown"),
            "rendererReadiness": "current smoke-safe renderer-ready for nation/type/rarity/set slots",
        },
        {
            "id": "kardsgen-material",
            "status": source_inventory["kardsGen"].get("status", "unknown"),
            "rendererReadiness": "renderer slot candidates only; unwired until slot-level smoke exists",
        },
        {
            "id": "kards-assets",
            "status": source_inventory["kardsAssets"].get("status", "unknown"),
            "rendererReadiness": "private card-back/HQ reference; no current card-face slot",
        },
        {
            "id": "craftsoul-image-tool",
            "status": source_inventory["craftSoulImageTool"].get("status", "unknown"),
            "rendererReadiness": "data and SVG/reference route; not direct card-face renderer output",
        },
        {
            "id": "local-kards-pak",
            "status": source_inventory["localKardsInstall"].get("status", "unknown"),
            "rendererReadiness": "indexed-only until a pak plus uasset-to-image/font extraction tool is installed",
        },
    ]


def summarize_assets(
    extracted_assets: list[dict[str, Any]],
    source_inventory: dict[str, Any],
    renderer_manifest_images: list[dict[str, str]],
) -> dict[str, Any]:
    by_route = Counter(asset["sourceRoute"] for asset in extracted_assets)
    by_readiness = Counter(asset["rendererReadiness"] for asset in extracted_assets)
    by_category = Counter(asset["category"] for asset in extracted_assets)
    local_groups = source_inventory["localKardsInstall"].get("groups", {})
    return {
        "extractedAssetCount": len(extracted_assets),
        "rendererManifestImageCount": len(renderer_manifest_images),
        "rendererManifestSlots": sorted({entry["slot"] for entry in renderer_manifest_images}),
        "bySourceRoute": dict(sorted(by_route.items())),
        "byRendererReadiness": dict(sorted(by_readiness.items())),
        "byCategory": dict(sorted(by_category.items())),
        "kardsPakIndexedCandidateCount": sum(group.get("count", 0) for group in local_groups.values()),
        "kardsPakStatus": source_inventory["localKardsInstall"].get("status"),
    }


def asset_record(
    *,
    asset_id: str,
    category: str,
    source_route: str,
    source_path: Path,
    output_path: Path,
    output_root: Path,
    source_status: str,
    renderer_readiness: str,
    rights: str,
    notes: str,
    slot: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    record: dict[str, Any] = {
        "id": asset_id,
        "category": category,
        "sourceRoute": source_route,
        "sourcePath": str(source_path),
        "file": relpath(output_path, output_root),
        "sourceStatus": source_status,
        "rendererReadiness": renderer_readiness,
        "rights": rights,
        "notes": notes,
    }
    if slot is not None:
        record["slot"] = slot
    record.update(media_metadata(output_path))
    if extra:
        record.update(extra)
    return record


def slot_fit_metadata(path: Path, slot: str) -> dict[str, Any]:
    expected = EXPECTED_RENDER_SLOT_SIZE.get(slot)
    if expected is None or path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
        return {}
    try:
        with Image.open(path) as image:
            source_size = image.size
    except Exception:
        return {"expectedRendererSize": list(expected), "slotSizeStatus": "unknown"}
    return {
        "expectedRendererSize": list(expected),
        "sourceSize": list(source_size),
        "slotSizeStatus": "exact" if source_size == expected else "needs-calibration-or-scaling",
    }


def media_metadata(path: Path) -> dict[str, Any]:
    suffix = path.suffix.lower()
    metadata: dict[str, Any] = {"extension": suffix, "bytes": path.stat().st_size if path.exists() else 0}
    if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        return metadata
    try:
        with Image.open(path) as image:
            rgba = image.convert("RGBA")
            alpha = rgba.getchannel("A")
            histogram = alpha.histogram()
            opaque_pixels = sum(histogram[1:])
            total_pixels = rgba.width * rgba.height
            stat = ImageStat.Stat(rgba)
            metadata.update(
                {
                    "width": rgba.width,
                    "height": rgba.height,
                    "mode": image.mode,
                    "opaquePixelRatio": round(opaque_pixels / total_pixels, 6) if total_pixels else 0,
                    "alphaBoundingBox": list(alpha.getbbox() or (0, 0, 0, 0)),
                    "averageRgba": [round(value, 3) for value in stat.mean],
                }
            )
    except Exception as exc:  # pragma: no cover - metadata only
        metadata["metadataError"] = str(exc)
    return metadata


def write_summary(path: Path, report: dict[str, Any]) -> None:
    summary = report["summary"]
    local_inventory = report["sourceInventory"]["localKardsInstall"]
    lines = [
        "# KARDS Stage6 Multi-Source Extraction Summary",
        "",
        "## Result",
        "",
        f"- Extracted/cataloged private files: `{summary['extractedAssetCount']}`",
        f"- Current smoke-safe renderer manifest images: `{summary['rendererManifestImageCount']}`",
        f"- Current manifest slots: `{', '.join(summary['rendererManifestSlots'])}`",
        f"- Local pak indexed candidates: `{summary['kardsPakIndexedCandidateCount']}`",
        f"- Local pak status: `{summary['kardsPakStatus']}`",
        "",
        "## Source Routes",
        "",
    ]
    for route in report["sourceRoutes"]:
        lines.append(f"- `{route['id']}`: {route['status']} | {route['rendererReadiness']}")
    lines.extend(["", "## Readiness Counts", ""])
    for key, value in summary["byRendererReadiness"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Local Pak Candidate Groups", ""])
    for group, data in local_inventory.get("groups", {}).items():
        lines.append(f"- `{group}`: `{data.get('count', 0)}`")
    lines.extend(
        [
            "",
            "## Boundary",
            "",
            "- `kards-asset-pack.json` deliberately stays smoke-safe and contains only current Stage4/5 icon slots.",
            "- KardsGen frames/boards are renderer-slot candidates only; they remain outside the smoke-safe manifest until slot-level visual smoke supports them.",
            "- KARDS-Assets card backs and HQ images are private official static references, not public distributable assets.",
            "- Local KARDS pak/font/view-effect entries are indexed only until a pak extractor plus uasset texture/font exporter is available.",
        ]
    )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def copy_file(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def remove_tree_contents(path: Path) -> None:
    for child in path.iterdir():
        is_junction = getattr(child, "is_junction", lambda: False)
        if child.is_symlink():
            child.unlink()
        elif is_junction():
            child.rmdir()
        elif child.is_dir():
            remove_tree_contents(child)
            child.rmdir()
        else:
            child.unlink()


def resolve_pack_file(root: Path, relative_path: str) -> Path:
    if not relative_path:
        raise SystemExit("Asset manifest contains an empty file path.")
    candidate = Path(relative_path)
    if candidate.is_absolute() or any(part == ".." for part in candidate.parts):
        raise SystemExit(f"Asset manifest path must stay inside the source pack: {relative_path}")
    root_resolved = root.resolve()
    resolved = (root_resolved / candidate).resolve()
    try:
        resolved.relative_to(root_resolved)
    except ValueError as exc:
        raise SystemExit(f"Asset manifest path escapes the source pack: {relative_path}") from exc
    return resolved


def relpath(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    main()
