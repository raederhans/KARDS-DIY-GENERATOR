#!/usr/bin/env python3
"""Build a private local KARDS calibration slice pack from official card images."""

from __future__ import annotations

import argparse
import base64
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

from PIL import Image


CARD_WIDTH = 500
CARD_HEIGHT = 702
DATA_URL_TEXT_LIMIT = 180
RAW_DATA_URL = "https://raw.githubusercontent.com/CraftSoul/kards-image-tool/main/data.json"
OFFICIAL_CARD_BASE_URL = "https://www.kards.com/images/card/v52"
OUTPUT_MARKER_FILE = ".kards-private-calibration-output"

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

RARITY_TO_ID = {
    "Standard": "standard",
    "Limited": "limited",
    "Special": "special",
    "Elite": "elite",
}


@dataclass(frozen=True)
class Requirement:
    group: str
    value: str


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-file", type=Path, default=Path(".runtime/stage3/sources/craftsoul-data.json"))
    parser.add_argument("--output", type=Path, default=Path(".runtime/kards-private-assets/stage3-official-coverage-pack"))
    parser.add_argument("--language", default="en-EN")
    parser.add_argument("--card-base-url", default=OFFICIAL_CARD_BASE_URL)
    parser.add_argument("--data-url", default=RAW_DATA_URL)
    parser.add_argument(
        "--allow-outside-runtime",
        action="store_true",
        help="Allow official-derived output outside a .runtime directory. Use only for disposable private paths.",
    )
    args = parser.parse_args()

    cards = load_cards(args.data_file, args.data_url)
    selected_cards, requirements = select_coverage_cards(cards)
    result = build_private_pack(
        selected_cards=selected_cards,
        requirements=requirements,
        output_dir=args.output,
        language=args.language,
        card_base_url=args.card_base_url.rstrip("/"),
        data_file=args.data_file,
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
    manifest_seen: set[tuple[str, str, str]] = set()
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
    if allow_outside_runtime:
        return
    if ".runtime" not in {part.lower() for part in resolved.parts}:
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
    manifest_seen: set[tuple[str, str, str]],
    card: dict[str, Any],
    image: Image.Image,
    layout: dict[str, tuple[int, int, int, int]],
) -> None:
    nation_id = faction_to_nation_id(card["faction"])
    kind = card["type"]
    rarity_id = rarity_to_id(card["rarity"])
    set_id = set_to_id(card["set"])

    add_manifest_crop(
        output_dir,
        manifest_images,
        manifest_seen,
        slot="nation-mark",
        file_path=Path("images") / "nations" / f"{nation_id}.png",
        crop_image=crop(image, layout["nation-mark"]),
        filters={"nationId": nation_id},
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
        crop_image=crop(image, rarity_pip_rect(layout["rarity"], rarity_id)),
        filters={"rarityId": rarity_id},
    )
    add_manifest_crop(
        output_dir,
        manifest_images,
        manifest_seen,
        slot="set-mark",
        file_path=Path("images") / "sets" / f"{set_id}.png",
        crop_image=crop(image, layout["set-mark"]),
        filters={"setId": set_id},
    )


def add_manifest_crop(
    output_dir: Path,
    manifest_images: list[dict[str, str]],
    manifest_seen: set[tuple[str, str, str]],
    slot: str,
    file_path: Path,
    crop_image: Image.Image,
    filters: dict[str, str],
) -> None:
    filter_key = next(iter(filters.items()))
    key = (slot, filter_key[0], filter_key[1])
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
    save_png(crop(image, rarity_pip_rect(layout["rarity"], rarity_to_id(card["rarity"]))), target_dir / "rarity-pip.png")


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


def rarity_pip_rect(rarity_rect: tuple[int, int, int, int], rarity_id: str) -> tuple[int, int, int, int]:
    pip_count = {"elite": 1, "special": 2, "limited": 3}.get(rarity_id, 4)
    pip_width = 9
    gap = 4
    x, y, width, height = rarity_rect
    total_width = pip_count * pip_width + (pip_count - 1) * gap
    start_x = x + (width - total_width) / 2
    return (round(start_x), y + 4, pip_width, height - 8)


def layout_for_kind(kind: str) -> dict[str, tuple[int, int, int, int]]:
    return UNIT_LAYOUT if kind in UNIT_KINDS else COMMAND_LAYOUT


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
    order = {"faction": 0, "type": 1, "rarity": 2, "set": 3}
    return (order.get(requirement.group, 99), requirement.value)


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
