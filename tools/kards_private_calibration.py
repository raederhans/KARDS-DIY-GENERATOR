#!/usr/bin/env python3
"""Build a private local KARDS calibration slice pack from official card images."""

from __future__ import annotations

import argparse
import base64
import json
import re
from collections import Counter, deque
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

from PIL import Image, ImageStat


CARD_WIDTH = 500
CARD_HEIGHT = 702
DATA_URL_TEXT_LIMIT = 180
RAW_DATA_URL = "https://raw.githubusercontent.com/CraftSoul/kards-image-tool/main/data.json"
OFFICIAL_CARD_BASE_URL = "https://www.kards.com/images/card/v52"
OUTPUT_MARKER_FILE = ".kards-private-calibration-output"
NATION_BACKGROUND_SAMPLE_MARGIN = 6
NATION_BACKGROUND_DISTANCE_THRESHOLD = 30
NATION_BACKGROUND_RETRY_DISTANCE_THRESHOLD = 18
NATION_MIN_SUBJECT_OPAQUE_RATIO = 0.14
SET_MARK_BACKGROUND_DISTANCE_THRESHOLD = 42
SET_MARK_SUBJECT_DISTANCE_THRESHOLD = 32
SET_MARK_MIN_SUBJECT_PIXEL_COUNT = 24
RARITY_MARK_BACKGROUND_DISTANCE_THRESHOLD = 18
DETAILED_SET_MARK_SUBJECT_DISTANCE_THRESHOLD = 16
DETAILED_SET_MARK_IDS = {
    "legions",
    "naval-warfare",
    "special",
    "theaters-of-war",
    "winter-war",
    "world-at-war",
}
FORBIDDEN_OUTPUT_SEGMENTS = {"dist", "public", "src"}
DEFAULT_DATA_FILE = Path(".runtime/stage3/sources/craftsoul-data.json")
DEFAULT_STAGE3_OUTPUT = Path(".runtime/kards-private-assets/stage3-official-coverage-pack")
DEFAULT_STAGE5_OUTPUT = Path(".runtime/kards-private-assets/stage5-card-face-elements")
DEFAULT_KARDS_INSTALL = Path(r"C:\Program Files (x86)\Steam\steamapps\common\KARDS")

FACTION_TO_NATION_ID = {
    "USA": "us",
    "Britain": "britain",
    "Germany": "germany",
    "Soviet": "soviet",
    "Japan": "japan",
    "France": "france",
    "Italy": "italy",
    "Poland": "poland",
    "Finland": "finland",
    "Neutral": "neutral",
    "Anzac": "anzac",
}

UNIT_KINDS = {"infantry", "tank", "fighter", "bomber", "artillery"}
KIND_ORDER = ["infantry", "tank", "fighter", "bomber", "artillery", "order", "countermeasure"]

UNIT_LAYOUT = {
    "artwork": (12, 99, 476, 426),
    "name-bar": (98, 13, 390, 86),
    "cost-board": (12, 13, 86, 86),
    "nation-mark": (423, 25, 54, 54),
    "rarity": (222, 675, 56, 20),
    "set-mark": (460, 666, 28, 28),
    "attack-board": (88, 468, 82, 82),
    "special-attack-board": (82, 468, 96, 82),
    "defense-board": (330, 473, 82, 82),
    "type-icon": (208, 473, 84, 72),
}

COMMAND_LAYOUT = {
    "artwork": (12, 13, 476, 476),
    "command-border": (0, 489, 500, 64),
    "cost-board": (12, 13, 86, 86),
    "nation-mark": (423, 25, 54, 54),
    "rarity": (222, 675, 56, 20),
    "set-mark": (460, 666, 28, 28),
    "type-icon": (222, 448, 56, 56),
}

HQ_SYNTHETIC_LAYOUT = {
    "artwork": (12, 13, 476, 476),
    "command-border": (0, 489, 500, 64),
    "nation-mark": (423, 25, 54, 54),
    "hq-defense-board": (166, 343, 168, 112),
    "title-zone": (80, 500, 340, 44),
    "keyword-line": (55, 546, 390, 30),
    "body-text": (55, 578, 390, 100),
    "text-panel": (40, 500, 420, 178),
}

RARITY_TO_ID = {
    "Standard": "standard",
    "Limited": "limited",
    "Special": "special",
    "Elite": "elite",
}

SPECIAL_ATTACK_KINDS = {"fighter", "bomber", "artillery"}
GROUND_UNIT_KINDS = {"infantry", "tank"}

STAGE5_FOCUS_CARD_IDS = (
    "b29_superfortress",
    "maus",
    "jet_prototype",
    "gordon_highlanders",
    "heroes_of_the_soviet_union",
    "front_formation",
    "641st_rifles",
)

ASSET_CANDIDATE_EXCLUDE_TERMS = (
    "combat",
    "hit",
    "projectile",
    "impact",
    "explosion",
    "muzzle",
    "bullet",
    "shell",
    "damage",
    "blood",
    "fire",
    "smoke",
    "vfx",
    "particle",
)


@dataclass(frozen=True)
class Requirement:
    group: str
    value: str


STAGE5_FIXED_OUTPUT_REQUIREMENTS = {
    Requirement("view-state", "official-full-card-reference"),
    Requirement("view-state", "official-element-slice-reference"),
    Requirement("view-state", "official-artwork-crop-reference"),
    Requirement("view-state", "renderer-full-card-sample"),
    Requirement("view-state", "renderer-slot-isolated-smoke-input"),
    Requirement("view-state", "private-export-png-ready"),
}

STAGE5_SYNTHETIC_REQUIREMENTS = {
    Requirement("layout", "hq"),
    Requirement("number", "hq-defense-min"),
    Requirement("number", "hq-defense-mid"),
    Requirement("number", "hq-defense-max"),
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", choices=["stage3", "stage5"], default="stage3")
    parser.add_argument("--data-file", type=Path, default=None)
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--language", default="en-EN")
    parser.add_argument("--card-base-url", default=OFFICIAL_CARD_BASE_URL)
    parser.add_argument("--data-url", default=RAW_DATA_URL)
    parser.add_argument("--kards-install", type=Path, default=DEFAULT_KARDS_INSTALL)
    parser.add_argument("--manifest-candidate-limit", type=int, default=240)
    parser.add_argument(
        "--allow-outside-runtime",
        action="store_true",
        help="Allow official-derived output outside a .runtime directory. Use only for disposable private paths.",
    )
    args = parser.parse_args()

    data_file = args.data_file or DEFAULT_DATA_FILE
    output_dir = args.output or (DEFAULT_STAGE5_OUTPUT if args.profile == "stage5" else DEFAULT_STAGE3_OUTPUT)
    cards = load_cards(data_file, args.data_url)

    if args.profile == "stage5":
        selected_cards, requirements, selection_report = select_stage5_cards(cards, args.language)
        result = build_stage5_private_pack(
            selected_cards=selected_cards,
            requirements=requirements,
            selection_report=selection_report,
            output_dir=output_dir,
            language=args.language,
            card_base_url=args.card_base_url.rstrip("/"),
            data_file=data_file,
            allow_outside_runtime=args.allow_outside_runtime,
            kards_install=args.kards_install,
            manifest_candidate_limit=args.manifest_candidate_limit,
        )
        print(json.dumps(result["summary"], ensure_ascii=False, indent=2))
        return

    selected_cards, requirements = select_coverage_cards(cards)
    result = build_private_pack(
        selected_cards=selected_cards,
        requirements=requirements,
        output_dir=output_dir,
        language=args.language,
        card_base_url=args.card_base_url.rstrip("/"),
        data_file=data_file,
        allow_outside_runtime=args.allow_outside_runtime,
    )
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))


def load_cards(data_file: Path, data_url: str) -> list[dict[str, Any]]:
    if not data_file.exists():
        data_file.parent.mkdir(parents=True, exist_ok=True)
        data_file.write_bytes(download_bytes(data_url))

    data = json.loads(data_file.read_text(encoding="utf-8"))
    raw_cards = data.get("cards", [])
    cards = [entry["json"] for entry in raw_cards if isinstance(entry, dict) and isinstance(entry.get("json"), dict)]
    if not cards:
        raise SystemExit(f"No cards found in {data_file}")
    return cards


def select_coverage_cards(cards: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], set[Requirement]]:
    requirements = build_requirements(cards)
    remaining = set(requirements)
    selected: list[dict[str, Any]] = []
    pool = sorted(cards, key=stable_card_id)

    while remaining:
        best = max(pool, key=lambda card: (len(card_coverage(card) & remaining), card_preference(card)))
        gained = card_coverage(best) & remaining
        if not gained:
            missing = ", ".join(f"{item.group}:{item.value}" for item in sorted(remaining, key=sort_requirement))
            raise SystemExit(f"Could not cover requirements: {missing}")
        selected.append(best)
        remaining -= gained
        pool.remove(best)

    return sorted(selected, key=lambda card: (card["faction"], type_sort(card["type"]), stable_card_id(card))), requirements


def build_requirements(cards: list[dict[str, Any]]) -> set[Requirement]:
    requirements: set[Requirement] = set()
    for card in cards:
        requirements.add(Requirement("faction", card["faction"]))
        requirements.add(Requirement("type", card["type"]))
        requirements.add(Requirement("rarity", card["rarity"]))
        requirements.add(Requirement("set", card["set"]))
    return requirements


def card_coverage(card: dict[str, Any]) -> set[Requirement]:
    return {
        Requirement("faction", card["faction"]),
        Requirement("type", card["type"]),
        Requirement("rarity", card["rarity"]),
        Requirement("set", card["set"]),
    }


def card_preference(card: dict[str, Any]) -> tuple[int, int, int, int, int, str]:
    return (
        int(card["set"] != "OnlySpawnable"),
        int(card["set"] == "Base"),
        int(card["rarity"] == "Standard"),
        int(card["type"] in UNIT_KINDS),
        -len(localized(card.get("title"), "en-EN")),
        stable_card_id(card),
    )


def build_private_pack(
    selected_cards: list[dict[str, Any]],
    requirements: set[Requirement],
    output_dir: Path,
    language: str,
    card_base_url: str,
    data_file: Path,
    allow_outside_runtime: bool,
) -> dict[str, Any]:
    ensure_clean_output_dirs(output_dir, allow_outside_runtime)

    manifest_images: list[dict[str, str]] = []
    manifest_seen: set[tuple[str, tuple[tuple[str, str], ...]]] = set()
    samples: list[dict[str, Any]] = []
    covered: set[Requirement] = set()

    for card in selected_cards:
        image = load_official_card_image(card, language, card_base_url)
        image = normalize_card_image(image)
        card_id = stable_card_id(card)
        layout = layout_for_kind(card["type"])

        reference_path = output_dir / "references" / "cards" / f"{card_id}.png"
        save_png(image, reference_path)

        artwork = crop(image, layout["artwork"])
        artwork_path = output_dir / "references" / "artwork" / f"{card_id}.png"
        save_png(artwork, artwork_path)

        write_calibration_slices(output_dir, card, image, layout)
        add_manifest_images(output_dir, manifest_images, manifest_seen, card, image, layout)
        write_sample_card(output_dir, card, artwork_path, language)

        sample_coverage = card_coverage(card)
        covered |= sample_coverage
        samples.append(
            {
                "id": card_id,
                "title": localized(card.get("title"), language),
                "faction": card["faction"],
                "nationId": faction_to_nation_id(card["faction"]),
                "kind": card["type"],
                "rarity": card["rarity"],
                "rarityId": rarity_to_id(card["rarity"]),
                "set": card["set"],
                "setId": set_to_id(card["set"]),
                "image": card.get("image"),
                "covers": [requirement_to_json(item) for item in sorted(sample_coverage, key=sort_requirement)],
            }
        )

    manifest = {
        "version": 1,
        "name": "KARDS private official coverage pack",
        "rightsNotice": (
            "Personal local validation only. Official card images and slices are owned by 1939 Games; "
            "do not commit, bundle, or redistribute this folder."
        ),
        "images": manifest_images,
    }
    write_json(output_dir / "kards-asset-pack.json", manifest)

    missing = sorted(requirements - covered, key=sort_requirement)
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceDataFile": str(data_file),
        "officialCardBaseUrl": card_base_url,
        "language": language,
        "cardSize": {"width": CARD_WIDTH, "height": CARD_HEIGHT},
        "coverage": {
            "requiredCount": len(requirements),
            "coveredCount": len(covered),
            "missing": [requirement_to_json(item) for item in missing],
            "groups": summarize_requirements(covered),
        },
        "selectedSampleCount": len(selected_cards),
        "samples": samples,
        "assetPack": {
            "manifest": "kards-asset-pack.json",
            "manifestImageCount": len(manifest_images),
            "referenceCardFolder": "references/cards",
            "sampleCardFolder": "samples",
            "calibrationSliceFolder": "references/slices",
            "manifestPolicy": (
                "Only nation marks, type icons, rarity pips, and set marks are loaded by the manifest. "
                "Crops with baked text or numbers are kept as measurement references only."
            ),
        },
    }
    write_json(output_dir / "calibration-report.json", report)
    write_summary_markdown(output_dir / "coverage-summary.md", report)

    return {
        "summary": {
            "output": str(output_dir.resolve()),
            "selectedSampleCount": len(selected_cards),
            "requiredCount": len(requirements),
            "coveredCount": len(covered),
            "missingCount": len(missing),
            "manifestImageCount": len(manifest_images),
        },
        "report": report,
    }


def select_stage5_cards(
    cards: list[dict[str, Any]],
    language: str,
) -> tuple[list[dict[str, Any]], set[Requirement], dict[str, Any]]:
    base_selected, base_requirements = select_coverage_cards(cards)
    profile = build_stage5_profile(cards, language)
    requirements = set(base_requirements) | set(profile["requirements"])
    official_requirements = {
        requirement
        for requirement in requirements
        if requirement not in STAGE5_SYNTHETIC_REQUIREMENTS
        and requirement not in STAGE5_FIXED_OUTPUT_REQUIREMENTS
        and requirement.group != "asset-slot-reference"
    }

    selected: list[dict[str, Any]] = []
    selected_ids: set[str] = set()

    def add_card(card: dict[str, Any]) -> None:
        card_id = stable_card_id(card)
        if card_id not in selected_ids:
            selected_ids.add(card_id)
            selected.append(card)

    for card in base_selected:
        add_card(card)

    focus_missing: list[str] = []
    for focus_id in STAGE5_FOCUS_CARD_IDS:
        card = find_card_by_id(cards, focus_id)
        if card is None:
            focus_missing.append(focus_id)
            continue
        add_card(card)

    covered = stage5_coverage_for_cards(selected, language, profile)
    pool = [card for card in sorted(cards, key=stable_card_id) if stable_card_id(card) not in selected_ids]
    while official_requirements - covered:
        missing = official_requirements - covered
        if not pool:
            break
        best = max(pool, key=lambda card: (len(stage5_card_coverage(card, language, profile) & missing), card_preference(card)))
        gained = stage5_card_coverage(best, language, profile) & missing
        if not gained:
            break
        add_card(best)
        pool.remove(best)
        covered |= stage5_card_coverage(best, language, profile)

    return selected, requirements, {
        "profile": profile,
        "baseSampleIds": [stable_card_id(card) for card in base_selected],
        "focusSampleIds": [stable_card_id(card) for card in selected if stable_card_id(card) in STAGE5_FOCUS_CARD_IDS],
        "focusMissingIds": focus_missing,
        "officialRequirementCount": len(official_requirements),
        "officialMissingBeforeSynthetic": [
            requirement_to_json(item) for item in sorted(official_requirements - covered, key=sort_requirement)
        ],
    }


def build_stage5_private_pack(
    selected_cards: list[dict[str, Any]],
    requirements: set[Requirement],
    selection_report: dict[str, Any],
    output_dir: Path,
    language: str,
    card_base_url: str,
    data_file: Path,
    allow_outside_runtime: bool,
    kards_install: Path,
    manifest_candidate_limit: int,
) -> dict[str, Any]:
    ensure_clean_output_dirs(output_dir, allow_outside_runtime)

    manifest_images: list[dict[str, str]] = []
    manifest_seen: set[tuple[str, tuple[tuple[str, str], ...]]] = set()
    samples: list[dict[str, Any]] = []
    crop_entries: list[dict[str, Any]] = []
    element_definitions = stage5_element_definitions()
    profile = selection_report["profile"]

    for card in selected_cards:
        image = load_official_card_image(card, language, card_base_url)
        image = normalize_card_image(image)
        card_id = stable_card_id(card)
        layout = layout_for_kind(card["type"])

        reference_path = output_dir / "references" / "cards" / f"{card_id}.png"
        save_png(image, reference_path)

        artwork = crop(image, layout["artwork"])
        artwork_path = output_dir / "references" / "artwork" / f"{card_id}.png"
        save_png(artwork, artwork_path)

        write_calibration_slices(output_dir, card, image, layout)
        crop_entries.extend(write_stage5_reference_elements(output_dir, card, image, language))
        add_manifest_images(output_dir, manifest_images, manifest_seen, card, image, layout)
        write_sample_card(output_dir, card, artwork_path, language)

        sample_coverage = stage5_card_coverage(card, language, profile)
        samples.append(
            {
                "id": card_id,
                "title": localized(card.get("title"), language),
                "faction": card["faction"],
                "nationId": faction_to_nation_id(card["faction"]),
                "kind": card["type"],
                "rarity": card["rarity"],
                "rarityId": rarity_to_id(card["rarity"]),
                "set": card["set"],
                "setId": set_to_id(card["set"]),
                "image": card.get("image"),
                "numbers": numeric_profile_for_card(card),
                "textMetrics": text_profile_for_card(card, language),
                "covers": [requirement_to_json(item) for item in sorted(sample_coverage, key=sort_requirement)],
            }
        )

    synthetic_samples = write_stage5_hq_samples(output_dir)
    generated_slot_requirements = {
        Requirement("asset-slot-reference", definition["id"])
        for definition in element_definitions
            if is_official_card_crop_definition(definition)
    }
    covered = (
        stage5_coverage_for_cards(selected_cards, language, profile)
        | STAGE5_SYNTHETIC_REQUIREMENTS
        | STAGE5_FIXED_OUTPUT_REQUIREMENTS
        | generated_slot_requirements
    )
    missing = sorted(requirements - covered, key=sort_requirement)
    local_asset_index = scan_local_asset_candidates(kards_install, manifest_candidate_limit)

    manifest = {
        "version": 1,
        "name": "KARDS private official stage5 card-face element pack",
        "rightsNotice": (
            "Personal local validation only. Official card images and slices are owned by 1939 Games; "
            "do not commit, bundle, or redistribute this folder."
        ),
        "images": manifest_images,
    }
    write_json(output_dir / "kards-asset-pack.json", manifest)

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "profile": "stage5",
        "scope": "card-face-and-view-state-variables",
        "excludes": [
            "gameplay effects",
            "battle resolution effects",
            "projectiles",
            "impact or combat VFX",
            "deck logic",
        ],
        "sourceDataFile": str(data_file),
        "officialCardBaseUrl": card_base_url,
        "language": language,
        "cardSize": {"width": CARD_WIDTH, "height": CARD_HEIGHT},
        "selectionPolicy": {
            "baseCoverage": "Retains one representative for every official faction, card type, rarity, and set.",
            "variableCoverage": (
                "Adds representatives for cost/stat extremes, long title/body pressure, keyword pressure, "
                "layout templates, and synthetic HQ defense samples."
            ),
            "focusSampleIds": selection_report["focusSampleIds"],
            "focusMissingIds": selection_report["focusMissingIds"],
            "officialMissingBeforeSynthetic": selection_report["officialMissingBeforeSynthetic"],
        },
        "coverage": {
            "requiredCount": len(requirements),
            "coveredCount": len(covered),
            "missing": [requirement_to_json(item) for item in missing],
            "groups": summarize_requirements(covered),
            "requiredGroups": summarize_requirements(requirements),
        },
        "selectedSampleCount": len(selected_cards),
        "samples": samples,
        "syntheticSamples": synthetic_samples,
        "referenceElements": {
            "definitionCount": len(element_definitions),
            "cropCount": len(crop_entries),
            "folder": "references/stage5-elements",
            "definitions": element_definitions,
            "indexedOnlyDefinitions": [
                definition for definition in element_definitions if definition.get("sourceStatus") == "indexed-only-unextracted"
            ],
            "syntheticOnlyDefinitions": [
                definition for definition in element_definitions if definition.get("sourceStatus") == "synthetic-layout-only"
            ],
            "crops": crop_entries,
        },
        "assetPack": {
            "manifest": "kards-asset-pack.json",
            "manifestImageCount": len(manifest_images),
            "referenceCardFolder": "references/cards",
            "sampleCardFolder": "samples",
            "calibrationSliceFolder": "references/slices",
            "stage5ElementFolder": "references/stage5-elements",
            "manifestPolicy": (
                "Only nation marks, type icons, rarity pips, and set marks are renderer-ready in the manifest. "
                "Full-card, board, title, number, text, and view-state crops are reference-only because official "
                "card images bake dynamic text and numbers into those pixels."
            ),
        },
        "localAssetIndex": local_asset_index,
    }
    write_json(output_dir / "calibration-report.json", report)
    write_json(output_dir / "stage5-card-face-elements-report.json", report)
    write_stage5_coverage_manifest(output_dir / "stage5-coverage-manifest.json", report)
    write_stage5_summary_markdown(output_dir / "stage5-card-face-elements-summary.md", report)
    write_summary_markdown(output_dir / "coverage-summary.md", report)

    if missing:
        missing_text = ", ".join(f"{item.group}:{item.value}" for item in missing)
        raise SystemExit(f"Stage 5 coverage is incomplete: {missing_text}")

    return {
        "summary": {
            "output": str(output_dir.resolve()),
            "selectedSampleCount": len(selected_cards),
            "syntheticSampleCount": len(synthetic_samples),
            "requiredCount": len(requirements),
            "coveredCount": len(covered),
            "missingCount": len(missing),
            "manifestImageCount": len(manifest_images),
            "referenceCropCount": len(crop_entries),
            "localAssetCandidateCount": local_asset_index["summary"]["totalCandidates"],
        },
        "report": report,
    }


def build_stage5_profile(cards: list[dict[str, Any]], language: str) -> dict[str, Any]:
    ints = {
        "deployment": [value for value in (sanitize_int(card.get("kredits")) for card in cards) if value is not None],
        "operation": [value for value in (sanitize_int(card.get("operationCost")) for card in cards) if value is not None],
        "attack": [value for value in (sanitize_int(card.get("attack")) for card in cards) if value is not None],
        "defense": [value for value in (sanitize_int(card.get("defense")) for card in cards) if value is not None],
    }
    title_lengths = {stable_card_id(card): len(localized(card.get("title"), language)) for card in cards}
    body_lengths = {stable_card_id(card): len(localized(card.get("text"), language)) for card in cards}
    longest_title_length = max(title_lengths.values(), default=0)
    longest_body_length = max(body_lengths.values(), default=0)

    profile = {
        "extremes": {
            "deploymentMin": min(ints["deployment"]) if ints["deployment"] else None,
            "deploymentMax": max(ints["deployment"]) if ints["deployment"] else None,
            "operationMax": max(ints["operation"]) if ints["operation"] else None,
            "attackMax": max(ints["attack"]) if ints["attack"] else None,
            "defenseMax": max(ints["defense"]) if ints["defense"] else None,
            "longestTitleLength": longest_title_length,
            "longestBodyLength": longest_body_length,
        },
        "requirements": set(STAGE5_FIXED_OUTPUT_REQUIREMENTS)
        | set(STAGE5_SYNTHETIC_REQUIREMENTS)
        | {
            Requirement("asset-slot-reference", definition["id"])
            for definition in stage5_element_definitions()
            if is_official_card_crop_definition(definition)
        },
    }

    requirements: set[Requirement] = profile["requirements"]
    add_if_any(requirements, cards, lambda card: card["type"] in GROUND_UNIT_KINDS, Requirement("layout", "unit-ground"))
    add_if_any(requirements, cards, lambda card: card["type"] in SPECIAL_ATTACK_KINDS, Requirement("layout", "unit-special-attack"))
    add_if_any(requirements, cards, lambda card: card["type"] == "order", Requirement("layout", "order"))
    add_if_any(requirements, cards, lambda card: card["type"] == "countermeasure", Requirement("layout", "countermeasure"))
    for faction, kind in sorted({(card["faction"], card["type"]) for card in cards}):
        add_if_any(
            requirements,
            cards,
            lambda card, faction=faction, kind=kind: card["faction"] == faction and card["type"] == kind,
            Requirement("nation-kind", f"{faction}:{kind}"),
        )

    if profile["extremes"]["deploymentMin"] is not None:
        requirements.add(Requirement("number", "deployment-min"))
        requirements.add(Requirement("number", "deployment-max"))
    if any(value >= 10 for value in ints["deployment"]):
        requirements.add(Requirement("number", "deployment-double-digit"))
    if profile["extremes"]["operationMax"] is not None:
        requirements.add(Requirement("number", "operation-max"))
    if profile["extremes"]["attackMax"] is not None:
        requirements.add(Requirement("number", "attack-max"))
    if any(value >= 10 for value in ints["attack"]):
        requirements.add(Requirement("number", "attack-double-digit"))
    if profile["extremes"]["defenseMax"] is not None:
        requirements.add(Requirement("number", "defense-max"))
    if any(value >= 10 for value in ints["defense"]):
        requirements.add(Requirement("number", "defense-double-digit"))

    add_if_any(requirements, cards, lambda card: len(localized(card.get("title"), language)) <= 4, Requirement("text", "title-short"))
    add_if_any(requirements, cards, lambda card: len(localized(card.get("title"), language)) >= 19, Requirement("text", "title-long"))
    if longest_title_length:
        requirements.add(Requirement("text", "title-longest"))
    add_if_any(requirements, cards, lambda card: len(localized(card.get("text"), language)) == 0, Requirement("text", "body-empty"))
    add_if_any(requirements, cards, lambda card: 1 <= len(localized(card.get("text"), language)) <= 40, Requirement("text", "body-short"))
    add_if_any(requirements, cards, lambda card: 41 <= len(localized(card.get("text"), language)) <= 80, Requirement("text", "body-medium"))
    add_if_any(requirements, cards, lambda card: 81 <= len(localized(card.get("text"), language)) <= 120, Requirement("text", "body-long"))
    add_if_any(requirements, cards, lambda card: len(localized(card.get("text"), language)) >= 121, Requirement("text", "body-extra-long"))
    if longest_body_length:
        requirements.add(Requirement("text", "body-longest"))

    add_if_any(requirements, cards, lambda card: len(normalize_attributes(card.get("attributes"))) == 0, Requirement("keyword", "none"))
    add_if_any(requirements, cards, lambda card: len(normalize_attributes(card.get("attributes"))) == 1, Requirement("keyword", "single"))
    add_if_any(requirements, cards, lambda card: len(normalize_attributes(card.get("attributes"))) >= 2, Requirement("keyword", "multiple"))
    add_if_any(requirements, cards, card_has_numeric_keyword, Requirement("keyword", "numeric"))
    add_if_any(requirements, cards, card_has_veteran_keyword, Requirement("keyword", "veteran"))

    return profile


def add_if_any(
    requirements: set[Requirement],
    cards: list[dict[str, Any]],
    predicate: Any,
    requirement: Requirement,
) -> None:
    if any(predicate(card) for card in cards):
        requirements.add(requirement)


def stage5_coverage_for_cards(
    cards: list[dict[str, Any]],
    language: str,
    profile: dict[str, Any],
) -> set[Requirement]:
    covered: set[Requirement] = set()
    for card in cards:
        covered |= stage5_card_coverage(card, language, profile)
    return covered


def stage5_card_coverage(card: dict[str, Any], language: str, profile: dict[str, Any]) -> set[Requirement]:
    covered = set(card_coverage(card))
    kind = card["type"]
    covered.add(Requirement("nation-kind", f"{card['faction']}:{kind}"))
    if kind in GROUND_UNIT_KINDS:
        covered.add(Requirement("layout", "unit-ground"))
    if kind in SPECIAL_ATTACK_KINDS:
        covered.add(Requirement("layout", "unit-special-attack"))
    if kind == "order":
        covered.add(Requirement("layout", "order"))
    if kind == "countermeasure":
        covered.add(Requirement("layout", "countermeasure"))

    extremes = profile["extremes"]
    deployment = sanitize_int(card.get("kredits"))
    operation = sanitize_int(card.get("operationCost"))
    attack = sanitize_int(card.get("attack"))
    defense = sanitize_int(card.get("defense"))
    if deployment == extremes["deploymentMin"]:
        covered.add(Requirement("number", "deployment-min"))
    if deployment == extremes["deploymentMax"]:
        covered.add(Requirement("number", "deployment-max"))
    if deployment is not None and deployment >= 10:
        covered.add(Requirement("number", "deployment-double-digit"))
    if operation == extremes["operationMax"]:
        covered.add(Requirement("number", "operation-max"))
    if attack == extremes["attackMax"]:
        covered.add(Requirement("number", "attack-max"))
    if attack is not None and attack >= 10:
        covered.add(Requirement("number", "attack-double-digit"))
    if defense == extremes["defenseMax"]:
        covered.add(Requirement("number", "defense-max"))
    if defense is not None and defense >= 10:
        covered.add(Requirement("number", "defense-double-digit"))

    title_length = len(localized(card.get("title"), language))
    body_length = len(localized(card.get("text"), language))
    if title_length <= 4:
        covered.add(Requirement("text", "title-short"))
    if title_length >= 19:
        covered.add(Requirement("text", "title-long"))
    if title_length == extremes["longestTitleLength"]:
        covered.add(Requirement("text", "title-longest"))
    if body_length == 0:
        covered.add(Requirement("text", "body-empty"))
    if 1 <= body_length <= 40:
        covered.add(Requirement("text", "body-short"))
    if 41 <= body_length <= 80:
        covered.add(Requirement("text", "body-medium"))
    if 81 <= body_length <= 120:
        covered.add(Requirement("text", "body-long"))
    if body_length >= 121:
        covered.add(Requirement("text", "body-extra-long"))
    if body_length == extremes["longestBodyLength"]:
        covered.add(Requirement("text", "body-longest"))

    attributes = normalize_attributes(card.get("attributes"))
    if len(attributes) == 0:
        covered.add(Requirement("keyword", "none"))
    if len(attributes) == 1:
        covered.add(Requirement("keyword", "single"))
    if len(attributes) >= 2:
        covered.add(Requirement("keyword", "multiple"))
    if card_has_numeric_keyword(card):
        covered.add(Requirement("keyword", "numeric"))
    if card_has_veteran_keyword(card):
        covered.add(Requirement("keyword", "veteran"))

    return covered


def stage5_element_definitions() -> list[dict[str, Any]]:
    unit_specs = [
        stage5_definition("full-card", "unit", (0, 0, CARD_WIDTH, CARD_HEIGHT), "view", ["all-visible"]),
        stage5_definition("card-mat", "unit", (0, 0, CARD_WIDTH, CARD_HEIGHT), "frame", ["template"]),
        stage5_definition("frame", "unit", (0, 0, CARD_WIDTH, CARD_HEIGHT), "frame", ["template"]),
        stage5_definition("print-wear", "unit", (0, 0, CARD_WIDTH, CARD_HEIGHT), "view-effect", ["print-treatment"]),
        stage5_definition("view-glow", "unit", (0, 0, CARD_WIDTH, CARD_HEIGHT), "view-effect", ["inspect-state"]),
        stage5_definition("zoom-shadow", "unit", (0, 0, CARD_WIDTH, CARD_HEIGHT), "view-effect", ["inspect-state"]),
        stage5_definition("artwork-window", "unit", UNIT_LAYOUT["artwork"], "artwork", ["artwork-crop"]),
        stage5_definition("unit-name-bar", "unit", UNIT_LAYOUT["name-bar"], "surface", ["title", "nation-accent"]),
        stage5_definition("unit-title-zone", "unit", (105, 24, 320, 60), "text", ["title-length", "font-fit"]),
        stage5_definition("cost-board", "unit", UNIT_LAYOUT["cost-board"], "number-surface", ["deployment-cost", "operation-cost"]),
        stage5_definition("nation-mark", "unit", UNIT_LAYOUT["nation-mark"], "icon", ["nation"]),
        stage5_definition("rarity-band", "unit", UNIT_LAYOUT["rarity"], "icon", ["rarity"]),
        stage5_definition("rarity-pip", "unit", UNIT_LAYOUT["rarity"], "icon", ["rarity"]),
        stage5_definition("set-mark", "unit", UNIT_LAYOUT["set-mark"], "icon", ["set"]),
        stage5_definition("attack-board", "unit", UNIT_LAYOUT["attack-board"], "number-surface", ["attack"]),
        stage5_definition("special-attack-board", "unit", UNIT_LAYOUT["special-attack-board"], "number-surface", ["attack", "unit-special-attack"]),
        stage5_definition("defense-board", "unit", UNIT_LAYOUT["defense-board"], "number-surface", ["defense"]),
        stage5_definition("unit-stat-row", "unit", (80, 468, 340, 88), "number-surface", ["attack", "defense", "type"]),
        stage5_definition("type-icon", "unit", UNIT_LAYOUT["type-icon"], "icon", ["kind"]),
        stage5_definition("unit-keyword-line", "unit", (55, 536, 390, 34), "text", ["keyword-count", "keyword-length"]),
        stage5_definition("unit-body-text", "unit", (55, 570, 390, 88), "text", ["body-length", "wrap"]),
        stage5_definition("unit-text-panel", "unit", (40, 532, 420, 128), "text-panel", ["keyword", "body"]),
    ]
    command_specs = [
        stage5_definition("full-card", "command", (0, 0, CARD_WIDTH, CARD_HEIGHT), "view", ["all-visible"]),
        stage5_definition("card-mat", "command", (0, 0, CARD_WIDTH, CARD_HEIGHT), "frame", ["template"]),
        stage5_definition("frame", "command", (0, 0, CARD_WIDTH, CARD_HEIGHT), "frame", ["template"]),
        stage5_definition("print-wear", "command", (0, 0, CARD_WIDTH, CARD_HEIGHT), "view-effect", ["print-treatment"]),
        stage5_definition("view-glow", "command", (0, 0, CARD_WIDTH, CARD_HEIGHT), "view-effect", ["inspect-state"]),
        stage5_definition("zoom-shadow", "command", (0, 0, CARD_WIDTH, CARD_HEIGHT), "view-effect", ["inspect-state"]),
        stage5_definition("artwork-window", "command", COMMAND_LAYOUT["artwork"], "artwork", ["artwork-crop"]),
        stage5_definition("command-border", "command", COMMAND_LAYOUT["command-border"], "surface", ["template"]),
        stage5_definition("cost-board", "command", COMMAND_LAYOUT["cost-board"], "number-surface", ["deployment-cost"]),
        stage5_definition("nation-mark", "command", COMMAND_LAYOUT["nation-mark"], "icon", ["nation"]),
        stage5_definition("rarity-band", "command", COMMAND_LAYOUT["rarity"], "icon", ["rarity"]),
        stage5_definition("rarity-pip", "command", COMMAND_LAYOUT["rarity"], "icon", ["rarity"]),
        stage5_definition("set-mark", "command", COMMAND_LAYOUT["set-mark"], "icon", ["set"]),
        stage5_definition("type-icon", "command", COMMAND_LAYOUT["type-icon"], "icon", ["kind"]),
        stage5_definition("command-title-zone", "command", (80, 500, 340, 44), "text", ["title-length", "font-fit"]),
        stage5_definition("command-keyword-line", "command", (55, 546, 390, 30), "text", ["keyword-count", "keyword-length"]),
        stage5_definition("command-body-text", "command", (55, 578, 390, 82), "text", ["body-length", "wrap"]),
        stage5_definition("command-text-panel", "command", (40, 500, 420, 160), "text-panel", ["title", "keyword", "body"]),
    ]
    hq_specs = [
        stage5_definition("full-card", "hq", (0, 0, CARD_WIDTH, CARD_HEIGHT), "view", ["all-visible"]),
        stage5_definition("frame", "hq", (0, 0, CARD_WIDTH, CARD_HEIGHT), "frame", ["template"]),
        stage5_definition("print-wear", "hq", (0, 0, CARD_WIDTH, CARD_HEIGHT), "view-effect", ["print-treatment"]),
        stage5_definition("view-glow", "hq", (0, 0, CARD_WIDTH, CARD_HEIGHT), "view-effect", ["inspect-state"]),
        stage5_definition("zoom-shadow", "hq", (0, 0, CARD_WIDTH, CARD_HEIGHT), "view-effect", ["inspect-state"]),
        stage5_definition("artwork-window", "hq", HQ_SYNTHETIC_LAYOUT["artwork"], "artwork", ["artwork-crop"]),
        stage5_definition("command-border", "hq", HQ_SYNTHETIC_LAYOUT["command-border"], "surface", ["template"]),
        stage5_definition("nation-mark", "hq", HQ_SYNTHETIC_LAYOUT["nation-mark"], "icon", ["nation"]),
        stage5_definition("hq-defense-board", "hq", HQ_SYNTHETIC_LAYOUT["hq-defense-board"], "number-surface", ["hq-defense"]),
        stage5_definition("hq-title-zone", "hq", HQ_SYNTHETIC_LAYOUT["title-zone"], "text", ["title-length", "font-fit"]),
        stage5_definition("hq-keyword-line", "hq", HQ_SYNTHETIC_LAYOUT["keyword-line"], "text", ["keyword-count", "keyword-length"]),
        stage5_definition("hq-body-text", "hq", HQ_SYNTHETIC_LAYOUT["body-text"], "text", ["body-length", "wrap"]),
        stage5_definition("hq-text-panel", "hq", HQ_SYNTHETIC_LAYOUT["text-panel"], "text-panel", ["title", "keyword", "body"]),
    ]
    return dedupe_definitions(unit_specs + command_specs + hq_specs)


def stage5_definition(
    element_id: str,
    template: str,
    rect: tuple[int, int, int, int],
    category: str,
    variable_axes: list[str],
) -> dict[str, Any]:
    synthetic_only = template == "hq"
    indexed_only = element_id in {"view-glow", "zoom-shadow"}
    renderer_ready = element_id in {"nation-mark", "rarity-pip", "set-mark", "type-icon"} and not synthetic_only
    source_status = (
        "synthetic-layout-only"
        if synthetic_only
        else "indexed-only-unextracted"
        if indexed_only
        else "official-card-crop"
    )
    return {
        "id": element_id,
        "template": template,
        "category": category,
        "rect": rect_to_json(rect),
        "sourceStatus": source_status,
        "rendererReadiness": "renderer-ready" if renderer_ready else "reference-only",
        "reason": (
            "Clean icon crop used by the private asset manifest."
            if renderer_ready
            else (
                "Local synthetic HQ layout coverage only; no official HQ reference crop is produced by the CraftSoul card-image route."
                if synthetic_only
                else "Needs pak extraction or an official inspect-view capture; current output records manifest candidates only."
                if indexed_only
                else "Official full-card crop bakes dynamic text, numbers, artwork, or print/view treatment into the pixels."
            )
        ),
        "variableAxes": variable_axes,
    }


def dedupe_definitions(definitions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str]] = set()
    result: list[dict[str, Any]] = []
    for definition in definitions:
        key = (definition["template"], definition["id"])
        if key in seen:
            continue
        seen.add(key)
        result.append(definition)
    return result


def write_stage5_reference_elements(
    output_dir: Path,
    card: dict[str, Any],
    image: Image.Image,
    language: str,
) -> list[dict[str, Any]]:
    card_id = stable_card_id(card)
    template = "unit" if card["type"] in UNIT_KINDS else "command"
    target_dir = output_dir / "references" / "stage5-elements" / card_id
    entries: list[dict[str, Any]] = []

    for definition in stage5_element_definitions():
        if definition["template"] != template:
            continue
        if not is_official_card_crop_definition(definition):
            continue
        element_id = definition["id"]
        if element_id == "attack-board" and card["type"] in SPECIAL_ATTACK_KINDS:
            continue
        if element_id == "special-attack-board" and card["type"] not in SPECIAL_ATTACK_KINDS:
            continue
        rect = json_rect_to_tuple(definition["rect"])
        cropped = extract_rarity_mark_subject(image, rect) if element_id == "rarity-pip" else crop(image, rect)
        file_path = target_dir / f"{element_id}.png"
        save_png(cropped, file_path)
        entries.append(
            {
                "cardId": card_id,
                "title": localized(card.get("title"), language),
                "kind": card["type"],
                "template": template,
                "elementId": element_id,
                "file": path_for_manifest(file_path.relative_to(output_dir)),
                "rect": rect_to_json(rect),
                "rendererReadiness": definition["rendererReadiness"],
                "pixelStats": image_pixel_stats(cropped),
            }
        )

    return entries


def is_official_card_crop_definition(definition: dict[str, Any]) -> bool:
    return definition.get("sourceStatus") == "official-card-crop"


def write_stage5_hq_samples(output_dir: Path) -> list[dict[str, Any]]:
    specs = [
        ("stage5_hq_defense_min", 1, Requirement("number", "hq-defense-min")),
        ("stage5_hq_defense_mid", 20, Requirement("number", "hq-defense-mid")),
        ("stage5_hq_defense_max", 40, Requirement("number", "hq-defense-max")),
    ]
    samples: list[dict[str, Any]] = []
    for sample_id, defense, number_requirement in specs:
        sample = {
            "version": 1,
            "kind": "hq",
            "nation": "custom",
            "rarity": "standard",
            "set": "custom",
            "title": f"HQ DEFENSE {defense}",
            "body": "Synthetic local sample for renderer layout stress only.",
            "keywordLine": "HQ",
            "costs": {},
            "stats": {"hqDefense": defense},
            "artwork": {
                "source": "none",
                "crop": {"x": 0, "y": 0, "scale": 1},
            },
        }
        write_json(output_dir / "samples" / f"{sample_id}.card.json", sample)
        samples.append(
            {
                "id": sample_id,
                "source": "project-model",
                "kind": "hq",
                "rendererReadiness": "local-layout-only",
                "covers": [
                    requirement_to_json(Requirement("layout", "hq")),
                    requirement_to_json(number_requirement),
                ],
            }
        )
    return samples


def scan_local_asset_candidates(kards_install: Path, limit: int) -> dict[str, Any]:
    manifest_path = kards_install / "Manifest_UFSFiles_Win64.txt"
    pak_path = kards_install / "kards" / "Content" / "Paks" / "kards-Windows.pak"
    groups = {
        "materials": [],
        "textures": [],
        "fonts": [],
        "meshes": [],
        "blueprintsOrWidgets": [],
        "ui": [],
    }
    if not manifest_path.exists():
        return {
            "status": "manifest-missing",
            "manifest": str(manifest_path),
            "pak": str(pak_path),
            "summary": {"totalCandidates": 0},
            "groups": groups,
        }

    for raw_line in manifest_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        path_part = raw_line.split("\t", 1)[0].replace("\\", "/")
        lower = path_part.lower()
        if not is_stage5_asset_candidate(lower):
            continue
        group = stage5_asset_candidate_group(lower)
        if len(groups[group]) < limit:
            groups[group].append(path_part)

    total = sum(len(items) for items in groups.values())
    return {
        "status": "indexed-only-pak-not-extracted",
        "manifest": str(manifest_path),
        "pak": str(pak_path),
        "pakExists": pak_path.exists(),
        "looseFilesChecked": "manifest paths are inside pak; no loose card-face texture files were assumed",
        "summary": {
            "totalCandidates": total,
            "limitPerGroup": limit,
            "groups": {group: len(items) for group, items in groups.items()},
        },
        "groups": groups,
    }


def is_stage5_asset_candidate(lower_path: str) -> bool:
    if any(term in lower_path for term in ASSET_CANDIDATE_EXCLUDE_TERMS):
        return False
    if "kards/content/assets" not in lower_path and "engine/content/slate/fonts" not in lower_path:
        return False
    return any(
        term in lower_path
        for term in (
            "card",
            "kard",
            "rarity",
            "national",
            "nation",
            "pack_",
            "font",
            "header",
            "title",
            "shadow",
            "glow",
            "deck",
            "widget",
            "ui/",
        )
    )


def stage5_asset_candidate_group(lower_path: str) -> str:
    if "/fonts/" in lower_path or "slate/fonts" in lower_path:
        return "fonts"
    if "/materials/" in lower_path:
        return "materials"
    if "/textures/" in lower_path:
        return "textures"
    if "/meshes/" in lower_path:
        return "meshes"
    if "/blueprints/" in lower_path:
        return "blueprintsOrWidgets"
    return "ui"


def write_stage5_coverage_manifest(path: Path, report: dict[str, Any]) -> None:
    value = {
        "version": 1,
        "scope": report["scope"],
        "excludes": report["excludes"],
        "sourceDataFile": report["sourceDataFile"],
        "referencePack": ".runtime/kards-private-assets/stage5-card-face-elements",
        "cardSize": report["cardSize"],
        "coverageAxes": report["coverage"]["groups"],
        "requiredAxes": report["coverage"]["requiredGroups"],
        "samples": [
            {
                "id": sample["id"],
                "source": "craftsoul-official-card-image",
                "kind": sample["kind"],
                "covers": sample["covers"],
            }
            for sample in report["samples"]
        ],
        "syntheticSamples": report["syntheticSamples"],
        "acceptance": {
            "allRequiredAxesCovered": not report["coverage"]["missing"],
            "missingRepresentativesAllowed": False,
            "officialDerivedAssetsStayUnderRuntime": True,
            "rendererManifestContainsOnlyCleanSlots": True,
        },
    }
    write_json(path, value)


def write_stage5_summary_markdown(path: Path, report: dict[str, Any]) -> None:
    missing = report["coverage"]["missing"]
    lines = [
        "# KARDS Stage 5 Card-Face Element Coverage",
        "",
        f"- Generated: `{report['generatedAt']}`",
        f"- Official samples: `{report['selectedSampleCount']}`",
        f"- Synthetic HQ samples: `{len(report['syntheticSamples'])}`",
        f"- Required axes covered: `{report['coverage']['coveredCount']}/{report['coverage']['requiredCount']}`",
        f"- Renderer-ready manifest images: `{report['assetPack']['manifestImageCount']}`",
        f"- Reference-only crops: `{report['referenceElements']['cropCount']}`",
        f"- Local manifest candidates: `{report['localAssetIndex']['summary']['totalCandidates']}`",
        "",
        "## Boundary",
        "",
        "- Card-face and inspect/view-state references are included.",
        "- Gameplay/combat effects, projectiles, impacts, and battle resolution effects are excluded.",
        "- Full-card, text, number, board, and view-state crops are reference-only because the official images bake dynamic pixels.",
        "",
        "## Missing",
        "",
    ]
    if missing:
        for item in missing:
            lines.append(f"- `{item['group']}:{item['value']}`")
    else:
        lines.append("- None")
    lines.extend(["", "## Samples", ""])
    for sample in report["samples"]:
        lines.append(
            f"- `{sample['id']}`: {sample['title']} | {sample['faction']} | "
            f"{sample['kind']} | {sample['rarity']} | {sample['set']}"
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def ensure_clean_output_dirs(output_dir: Path, allow_outside_runtime: bool) -> None:
    validate_output_dir(output_dir, allow_outside_runtime)
    output_dir.mkdir(parents=True, exist_ok=True)
    marker_path = output_dir / OUTPUT_MARKER_FILE
    owned_output = marker_path.exists()

    for relative in ["references", "images", "samples"]:
        path = output_dir / relative
        if path.exists() and not owned_output:
            raise SystemExit(
                f"Refusing to clean {path}: {output_dir} is missing {OUTPUT_MARKER_FILE}. "
                "Choose an empty .runtime output folder or pass a folder previously generated by this tool."
            )
        if path.exists():
            remove_tree_contents(path)

    marker_path.write_text(
        "Generated by tools/kards_private_calibration.py. Official-derived files in this folder are private only.\n",
        encoding="utf-8",
    )


def validate_output_dir(output_dir: Path, allow_outside_runtime: bool) -> None:
    resolved = output_dir.resolve()
    lower_parts = {part.lower() for part in resolved.parts}
    forbidden = sorted(lower_parts & FORBIDDEN_OUTPUT_SEGMENTS)
    if forbidden:
        raise SystemExit(
            "Refusing to write official-derived assets under source or public output folders "
            f"({', '.join(forbidden)}): {resolved}"
        )
    if allow_outside_runtime:
        return
    if ".runtime" not in lower_parts:
        raise SystemExit(
            f"Refusing to write official-derived assets outside a .runtime directory: {resolved}. "
            "Use a .runtime output path, or pass --allow-outside-runtime for a disposable private folder."
        )


def remove_tree_contents(path: Path) -> None:
    for child in path.iterdir():
        if child.is_dir():
            remove_tree_contents(child)
            child.rmdir()
        else:
            child.unlink()


def load_official_card_image(card: dict[str, Any], language: str, card_base_url: str) -> Image.Image:
    url = f"{card_base_url}/{language}/{card['image']}"
    data = download_bytes(url)
    return Image.open(BytesIO(data))


def download_bytes(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "KARDS private calibration tool"})
    with urlopen(request, timeout=45) as response:
        return response.read()


def normalize_card_image(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    if image.size != (CARD_WIDTH, CARD_HEIGHT):
        image = image.resize((CARD_WIDTH, CARD_HEIGHT), Image.Resampling.LANCZOS)
    return image


def add_manifest_images(
    output_dir: Path,
    manifest_images: list[dict[str, str]],
    manifest_seen: set[tuple[str, tuple[tuple[str, str], ...]]],
    card: dict[str, Any],
    image: Image.Image,
    layout: dict[str, tuple[int, int, int, int]],
) -> None:
    nation_id = faction_to_nation_id(card["faction"])
    template = card_template(card)
    kind = card["type"]
    rarity_id = rarity_to_id(card["rarity"])
    set_id = set_to_id(card["set"])

    add_manifest_crop(
        output_dir,
        manifest_images,
        manifest_seen,
        slot="nation-mark",
        file_path=Path("images") / "nations" / template / kind / f"{nation_id}.png",
        crop_image=extract_nation_mark_subject(image, layout["nation-mark"], nation_id, kind),
        filters={"nationId": nation_id, "kind": kind, "template": template},
    )
    add_manifest_crop(
        output_dir,
        manifest_images,
        manifest_seen,
        slot="type-icon",
        file_path=Path("images") / "types" / f"{kind}.png",
        crop_image=crop(image, layout["type-icon"]),
        filters={"kind": kind},
    )
    add_manifest_crop(
        output_dir,
        manifest_images,
        manifest_seen,
        slot="rarity-pip",
        file_path=Path("images") / "rarity" / f"{rarity_id}-pip.png",
        crop_image=extract_rarity_mark_subject(image, layout["rarity"]),
        filters={"rarityId": rarity_id},
    )
    add_manifest_crop(
        output_dir,
        manifest_images,
        manifest_seen,
        slot="set-mark",
        file_path=Path("images") / "sets" / f"{set_id}.png",
        crop_image=extract_set_mark_subject(image, layout["set-mark"], set_id),
        filters={"setId": set_id},
    )


def add_manifest_crop(
    output_dir: Path,
    manifest_images: list[dict[str, str]],
    manifest_seen: set[tuple[str, tuple[tuple[str, str], ...]]],
    slot: str,
    file_path: Path,
    crop_image: Image.Image,
    filters: dict[str, str],
) -> None:
    key = (slot, tuple(sorted(filters.items())))
    if key in manifest_seen:
        return

    manifest_seen.add(key)
    save_png(crop_image, output_dir / file_path)
    entry: dict[str, str] = {"slot": slot, "file": path_for_manifest(file_path)}
    entry.update(filters)
    manifest_images.append(entry)


def write_calibration_slices(
    output_dir: Path,
    card: dict[str, Any],
    image: Image.Image,
    layout: dict[str, tuple[int, int, int, int]],
) -> None:
    card_id = stable_card_id(card)
    target_dir = output_dir / "references" / "slices" / card_id
    for name, rect in layout.items():
        if name == "rarity":
            continue
        save_png(crop(image, rect), target_dir / f"{name}.png")
    save_png(extract_rarity_mark_subject(image, layout["rarity"]), target_dir / "rarity-pip.png")


def write_sample_card(output_dir: Path, card: dict[str, Any], artwork_path: Path, language: str) -> None:
    kind = card["type"]
    sample = {
        "version": 1,
        "kind": kind,
        "nation": faction_to_nation_id(card["faction"]),
        "rarity": rarity_to_id(card["rarity"]),
        "set": set_to_id(card["set"]),
        "title": localized(card.get("title"), language),
        "body": localized(card.get("text"), language)[:DATA_URL_TEXT_LIMIT],
        "keywordLine": attributes_to_keyword_line(card.get("attributes")),
        "costs": {
            "deployment": sanitize_int(card.get("kredits")),
        },
        "stats": {},
        "artwork": {
            "source": "upload",
            "crop": {"x": 0, "y": 0, "scale": 1},
            "dataUrl": image_data_url(artwork_path),
        },
    }

    if kind in UNIT_KINDS:
        sample["costs"]["operation"] = sanitize_int(card.get("operationCost"))
        sample["stats"]["attack"] = sanitize_int(card.get("attack"))
        sample["stats"]["defense"] = sanitize_int(card.get("defense"))

    write_json(output_dir / "samples" / f"{stable_card_id(card)}.card.json", sample)


def image_data_url(path: Path) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def crop(image: Image.Image, rect: tuple[int, int, int, int]) -> Image.Image:
    x, y, width, height = rect
    return image.crop((x, y, x + width, y + height))


def extract_nation_mark_subject(
    image: Image.Image,
    rect: tuple[int, int, int, int],
    nation_id: str,
    kind: str,
) -> Image.Image:
    mark = crop(image, rect).convert("RGBA")
    palette = sample_nation_mark_background_palette(image.convert("RGBA"), rect)
    if not palette:
        return mark

    protected = protected_nation_mark_pixels(mark.size, nation_id, kind)
    transparent = collect_connected_background_pixels(mark, palette, NATION_BACKGROUND_DISTANCE_THRESHOLD, protected)
    if subject_opaque_ratio(mark, transparent) < NATION_MIN_SUBJECT_OPAQUE_RATIO:
        transparent = collect_connected_background_pixels(mark, palette, NATION_BACKGROUND_RETRY_DISTANCE_THRESHOLD, protected)
    if subject_opaque_ratio(mark, transparent) < NATION_MIN_SUBJECT_OPAQUE_RATIO:
        return mark

    output = mark.copy()
    output_pixels = output.load()
    for x, y in transparent:
        red, green, blue, _alpha = output_pixels[x, y]
        output_pixels[x, y] = (red, green, blue, 0)
    return output


def extract_set_mark_subject(
    image: Image.Image,
    rect: tuple[int, int, int, int],
    set_id: str = "",
) -> Image.Image:
    mark = crop(image, rect).convert("RGBA")
    palette = sample_set_mark_background_palette(mark)
    if not palette:
        return mark

    protected = protected_set_mark_subject_pixels(mark, palette, set_id)
    transparent = collect_connected_background_pixels(mark, palette, SET_MARK_BACKGROUND_DISTANCE_THRESHOLD, protected)
    if not transparent:
        return mark

    output = mark.copy()
    output_pixels = output.load()
    for x, y in transparent:
        red, green, blue, _alpha = output_pixels[x, y]
        output_pixels[x, y] = (red, green, blue, 0)
    return output


def extract_rarity_mark_subject(image: Image.Image, rect: tuple[int, int, int, int]) -> Image.Image:
    mark = crop(image, rect).convert("RGBA")
    palette = sample_set_mark_background_palette(mark)
    if not palette:
        return mark

    transparent = collect_connected_background_pixels(
        mark,
        palette,
        RARITY_MARK_BACKGROUND_DISTANCE_THRESHOLD,
        protected=set(),
    )
    if not transparent:
        return mark

    output = mark.copy()
    output_pixels = output.load()
    for x, y in transparent:
        red, green, blue, _alpha = output_pixels[x, y]
        output_pixels[x, y] = (red, green, blue, 0)
    return output


def sample_set_mark_background_palette(mark: Image.Image) -> list[tuple[int, int, int]]:
    width, height = mark.size
    pixels = mark.load()
    corner_size = min(5, width, height)
    samples: list[tuple[int, int, int]] = []

    for y in range(height):
        for x in range(width):
            in_left_corner = x < corner_size
            in_right_corner = x >= width - corner_size
            in_top_corner = y < corner_size
            in_bottom_corner = y >= height - corner_size
            if not ((in_left_corner or in_right_corner) and (in_top_corner or in_bottom_corner)):
                continue
            red, green, blue, alpha = pixels[x, y]
            if alpha >= 200:
                samples.append((red, green, blue))

    if not samples:
        return []

    buckets = Counter((red // 16, green // 16, blue // 16) for red, green, blue in samples)
    return [((red * 16) + 8, (green * 16) + 8, (blue * 16) + 8) for (red, green, blue), _count in buckets.most_common(3)]


def protected_set_mark_subject_pixels(
    mark: Image.Image,
    palette: list[tuple[int, int, int]],
    set_id: str = "",
) -> set[tuple[int, int]]:
    threshold = (
        DETAILED_SET_MARK_SUBJECT_DISTANCE_THRESHOLD
        if set_id in DETAILED_SET_MARK_IDS
        else SET_MARK_SUBJECT_DISTANCE_THRESHOLD
    )
    threshold_sq = threshold * threshold
    protected: set[tuple[int, int]] = set()
    pixels = mark.load()
    width, height = mark.size

    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha < 8:
                continue
            if min(color_distance_sq((red, green, blue), color) for color in palette) > threshold_sq:
                protected.add((x, y))

    return protected if len(protected) >= SET_MARK_MIN_SUBJECT_PIXEL_COUNT else set()


def collect_connected_background_pixels(
    mark: Image.Image,
    palette: list[tuple[int, int, int]],
    threshold: int,
    protected: set[tuple[int, int]],
) -> set[tuple[int, int]]:
    threshold_sq = threshold * threshold
    width, height = mark.size
    pixels = mark.load()
    transparent: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    def is_background_like(x: int, y: int) -> bool:
        if (x, y) in protected:
            return False
        red, green, blue, alpha = pixels[x, y]
        if alpha < 8:
            return True
        return min(color_distance_sq((red, green, blue), color) for color in palette) <= threshold_sq

    for x in range(width):
        for y in (0, height - 1):
            if is_background_like(x, y):
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if is_background_like(x, y):
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in transparent or not is_background_like(x, y):
            continue
        transparent.add((x, y))
        for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= next_x < width and 0 <= next_y < height and (next_x, next_y) not in transparent:
                queue.append((next_x, next_y))
    return transparent


def subject_opaque_ratio(mark: Image.Image, transparent: set[tuple[int, int]]) -> float:
    width, height = mark.size
    return (width * height - len(transparent)) / (width * height) if width and height else 0


def protected_nation_mark_pixels(size: tuple[int, int], nation_id: str, kind: str) -> set[tuple[int, int]]:
    width, height = size
    protected: set[tuple[int, int]] = set()
    center_x = (width - 1) / 2
    center_y = (height - 1) / 2

    def protect_circle(radius: float, x_scale: float = 1.0, y_scale: float = 1.0) -> None:
        for y in range(height):
            for x in range(width):
                dx = (x - center_x) / x_scale
                dy = (y - center_y) / y_scale
                if (dx * dx) + (dy * dy) <= radius * radius:
                    protected.add((x, y))

    def protect_rect(left: int, top: int, right: int, bottom: int) -> None:
        for y in range(max(0, top), min(height, bottom)):
            for x in range(max(0, left), min(width, right)):
                protected.add((x, y))

    if nation_id == "france":
        if kind in {"fighter", "bomber"}:
            protect_circle(24.5)
        else:
            protect_circle(23.5, x_scale=0.92, y_scale=1.0)
    elif nation_id == "britain":
        if kind in {"order", "countermeasure"}:
            protect_circle(24.5)
        else:
            protect_circle(23.5)
    elif nation_id == "japan":
        if kind in {"fighter", "bomber"}:
            protect_circle(22.5)
        else:
            protect_circle(20.5)
    elif nation_id == "germany":
        protect_rect(19, 0, 35, height)
        protect_rect(0, 19, width, 35)
    elif nation_id == "italy":
        protect_rect(8, 1, 46, height - 1)
    elif nation_id == "us":
        protect_circle(22.5)
    elif nation_id == "anzac":
        if kind == "tank":
            protect_circle(19.5)
        elif kind in {"fighter", "infantry", "order"}:
            protect_circle(22.5)

    return protected


def sample_nation_mark_background_palette(
    image: Image.Image,
    rect: tuple[int, int, int, int],
) -> list[tuple[int, int, int]]:
    x, y, width, height = rect
    margin = NATION_BACKGROUND_SAMPLE_MARGIN
    left = max(0, x - margin)
    right = min(image.width, x + width + margin)
    top = max(0, y - margin)
    bottom = min(image.height, y + height + margin)
    samples: list[tuple[int, int, int]] = []

    for sample_y in range(top, bottom):
        for sample_x in range(left, right):
            inside_crop = x <= sample_x < x + width and y <= sample_y < y + height
            if inside_crop:
                continue
            red, green, blue, alpha = image.getpixel((sample_x, sample_y))
            if alpha >= 200:
                samples.append((red, green, blue))

    if not samples:
        return []

    buckets = Counter((red // 16, green // 16, blue // 16) for red, green, blue in samples)
    return [((red * 16) + 8, (green * 16) + 8, (blue * 16) + 8) for (red, green, blue), _count in buckets.most_common(6)]


def color_distance_sq(left: tuple[int, int, int], right: tuple[int, int, int]) -> int:
    return sum((left[channel] - right[channel]) ** 2 for channel in range(3))


def layout_for_kind(kind: str) -> dict[str, tuple[int, int, int, int]]:
    return UNIT_LAYOUT if kind in UNIT_KINDS else COMMAND_LAYOUT


def card_template(card: dict[str, Any]) -> str:
    return "unit" if card["type"] in UNIT_KINDS else "command"


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG")


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_summary_markdown(path: Path, report: dict[str, Any]) -> None:
    lines = [
        "# KARDS Private Calibration Coverage",
        "",
        f"- Generated: `{report['generatedAt']}`",
        f"- Selected samples: `{report['selectedSampleCount']}`",
        f"- Requirements covered: `{report['coverage']['coveredCount']}/{report['coverage']['requiredCount']}`",
        f"- Manifest images: `{report['assetPack']['manifestImageCount']}`",
        "",
        "## Samples",
        "",
    ]
    for sample in report["samples"]:
        lines.append(
            f"- `{sample['id']}`: {sample['title']} | {sample['faction']} | "
            f"{sample['kind']} | {sample['rarity']} | {sample['set']}"
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def summarize_requirements(requirements: set[Requirement]) -> dict[str, list[str]]:
    groups: dict[str, list[str]] = {}
    for requirement in sorted(requirements, key=sort_requirement):
        groups.setdefault(requirement.group, []).append(requirement.value)
    return groups


def requirement_to_json(requirement: Requirement) -> dict[str, str]:
    return {"group": requirement.group, "value": requirement.value}


def sort_requirement(requirement: Requirement) -> tuple[int, str]:
    order = {
        "faction": 0,
        "type": 1,
        "rarity": 2,
        "set": 3,
        "nation-kind": 4,
        "layout": 5,
        "number": 6,
        "text": 7,
        "keyword": 8,
        "asset-slot-reference": 9,
        "view-state": 10,
    }
    return (order.get(requirement.group, 99), requirement.value)


def find_card_by_id(cards: list[dict[str, Any]], card_id: str) -> dict[str, Any] | None:
    wanted = card_id.lower()
    for card in cards:
        if stable_card_id(card).lower() == wanted:
            return card
    return None


def numeric_profile_for_card(card: dict[str, Any]) -> dict[str, int | None]:
    return {
        "deployment": sanitize_int(card.get("kredits")),
        "operation": sanitize_int(card.get("operationCost")),
        "attack": sanitize_int(card.get("attack")),
        "defense": sanitize_int(card.get("defense")),
    }


def text_profile_for_card(card: dict[str, Any], language: str) -> dict[str, Any]:
    title = localized(card.get("title"), language)
    body = localized(card.get("text"), language)
    attributes = normalize_attributes(card.get("attributes"))
    return {
        "titleLength": len(title),
        "bodyLength": len(body),
        "attributeCount": len(attributes),
        "attributes": attributes,
        "hasNumericKeyword": card_has_numeric_keyword(card),
        "hasVeteranKeyword": card_has_veteran_keyword(card),
    }


def normalize_attributes(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item)]


def card_has_numeric_keyword(card: dict[str, Any]) -> bool:
    haystack = " ".join(normalize_attributes(card.get("attributes")))
    return bool(re.search(r"\d", haystack))


def card_has_veteran_keyword(card: dict[str, Any]) -> bool:
    haystack = " ".join(normalize_attributes(card.get("attributes")) + [localized(card.get("text"), "en-EN")]).lower()
    return "veteran" in haystack


def rect_to_json(rect: tuple[int, int, int, int]) -> dict[str, int]:
    x, y, width, height = rect
    return {"x": x, "y": y, "width": width, "height": height}


def json_rect_to_tuple(rect: dict[str, int]) -> tuple[int, int, int, int]:
    return (rect["x"], rect["y"], rect["width"], rect["height"])


def image_pixel_stats(image: Image.Image) -> dict[str, Any]:
    rgba = image.convert("RGBA")
    stat = ImageStat.Stat(rgba)
    alpha = rgba.getchannel("A")
    alpha_histogram = alpha.histogram()
    opaque_pixels = sum(alpha_histogram[1:])
    total_pixels = rgba.width * rgba.height
    return {
        "width": rgba.width,
        "height": rgba.height,
        "opaquePixelRatio": round(opaque_pixels / total_pixels, 6) if total_pixels else 0,
        "averageRgba": [round(value, 3) for value in stat.mean],
        "alphaBoundingBox": list(alpha.getbbox() or (0, 0, 0, 0)),
    }


def localized(value: Any, language: str) -> str:
    if isinstance(value, dict):
        return str(value.get(language) or value.get("en-EN") or next(iter(value.values()), ""))
    if value is None:
        return ""
    return str(value)


def attributes_to_keyword_line(value: Any) -> str:
    if not isinstance(value, list):
        return ""
    return ", ".join(str(item).replace("_", " ").upper() for item in value)


def sanitize_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def faction_to_nation_id(value: str) -> str:
    return FACTION_TO_NATION_ID.get(value, slugify(value))


def rarity_to_id(value: str) -> str:
    return RARITY_TO_ID.get(value, slugify(value))


def set_to_id(value: str) -> str:
    return slugify(value)


def slugify(value: str) -> str:
    spaced = re.sub(r"(?<!^)(?=[A-Z])", "-", value)
    spaced = re.sub(r"[^A-Za-z0-9]+", "-", spaced)
    return spaced.strip("-").lower()


def type_sort(value: str) -> int:
    try:
        return KIND_ORDER.index(value)
    except ValueError:
        return len(KIND_ORDER)


def stable_card_id(card: dict[str, Any]) -> str:
    return str(card.get("id") or card.get("image") or "")


def path_for_manifest(path: Path) -> str:
    return path.as_posix()


if __name__ == "__main__":
    main()
