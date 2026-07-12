from __future__ import annotations

import json
import sys
import tempfile
import unittest
from collections import deque
from pathlib import Path
from unittest.mock import patch

from PIL import Image, ImageDraw

TOOLS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS_DIR))

import kards_multisource_extraction as multisource
import kards_private_calibration as calibration
from kards_multisource_extraction import copy_stage5_clean_assets
from kards_private_calibration import (
    add_manifest_crop,
    download_bytes,
    extract_nation_mark_subject,
    extract_set_mark_subject,
    remove_tree_contents,
    validate_output_dir,
)


class PrivateCalibrationContractTest(unittest.TestCase):
    def test_special_attack_board_keeps_its_native_square_geometry(self) -> None:
        self.assertEqual(calibration.UNIT_LAYOUT["special-attack-board"], (82, 468, 94, 94))
        self.assertEqual(multisource.EXPECTED_RENDER_SLOT_SIZE["special-attack-board"], (94, 94))

    def test_authorized_high_rarity_assets_are_complete_marks(self) -> None:
        rarity_dir = TOOLS_DIR.parent / "public" / "reference-pack" / "v1" / "images" / "rarity-pip"
        with Image.open(rarity_dir / "standard-pip.png") as standard_source:
            standard = standard_source.convert("RGBA")
        with Image.open(rarity_dir / "elite-pip.png") as elite_source:
            elite = elite_source.convert("RGBA")
        with Image.open(rarity_dir / "special-pip.png") as special_source:
            special = special_source.convert("RGBA")

        self.assertGreater(elite.width, standard.width * 3)
        self.assertGreater(elite.height, standard.height)
        self.assertLessEqual(elite.width, 48)
        self.assertLessEqual(elite.height, 20)
        elite_alpha = elite.getchannel("A")
        elite_thirds = (
            elite_alpha.crop((0, 0, elite.width // 3, elite.height)),
            elite_alpha.crop((elite.width // 3, 0, 2 * elite.width // 3, elite.height)),
            elite_alpha.crop((2 * elite.width // 3, 0, elite.width, elite.height)),
        )
        elite_counts = [sum(alpha >= 64 for alpha in third.get_flattened_data()) for third in elite_thirds]
        wing_minimum = standard.width * standard.height // 2
        self.assertGreater(elite_counts[0], wing_minimum)
        self.assertGreater(elite_counts[2], wing_minimum)
        self.assertGreater(elite_counts[1], max(elite_counts[0], elite_counts[2]))

        self.assertGreater(special.width, standard.width * 2)
        self.assertGreater(special.height, standard.height)
        self.assertLessEqual(special.width, 34)
        self.assertLessEqual(special.height, 20)
        special_alpha = special.getchannel("A")
        special_left = special_alpha.crop((0, 0, special.width // 2, special.height))
        special_right = special_alpha.crop((special.width // 2, 0, special.width, special.height))
        self.assertGreater(sum(alpha >= 64 for alpha in special_left.get_flattened_data()), standard.width * standard.height)
        self.assertGreater(sum(alpha >= 64 for alpha in special_right.get_flattened_data()), standard.width * standard.height)
        middle_columns = range(special.width // 3, 2 * special.width // 3)
        self.assertTrue(any(
            sum(special_alpha.getpixel((x, y)) >= 64 for y in range(special.height)) <= 2
            for x in middle_columns
        ))

    def test_private_generator_rejects_source_and_public_output_paths(self) -> None:
        workspace = TOOLS_DIR.parent
        for segment in ("src", "public", "dist"):
            with self.subTest(segment=segment):
                with self.assertRaises(SystemExit):
                    validate_output_dir(workspace / segment / ".runtime" / "private-assets", allow_outside_runtime=False)

    def test_private_generator_cleanup_does_not_follow_links(self) -> None:
        symlink = FakePath("symlink", is_symlink=True, is_dir=True)
        junction = FakePath("junction", is_junction=True, is_dir=True)
        normal_file = FakePath("file")
        root = FakePath("root", children=[symlink, junction, normal_file])

        remove_tree_contents(root)  # type: ignore[arg-type]

        self.assertEqual(symlink.calls, ["unlink"])
        self.assertEqual(junction.calls, ["rmdir"])
        self.assertEqual(normal_file.calls, ["unlink"])

    def test_private_generator_cleanup_does_not_follow_top_level_links(self) -> None:
        symlink = FakePath("references", is_symlink=True, is_dir=True)
        junction = FakePath("images", is_junction=True, is_dir=True)

        remove_tree_contents(symlink)  # type: ignore[arg-type]
        remove_tree_contents(junction)  # type: ignore[arg-type]

        self.assertEqual(symlink.calls, ["unlink"])
        self.assertEqual(junction.calls, ["rmdir"])

    def test_nation_mark_manifest_keeps_kind_and_template_entries(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir)
            manifest_images: list[dict[str, str]] = []
            manifest_seen: set[tuple[str, tuple[tuple[str, str], ...]]] = set()
            image = Image.new("RGBA", (2, 2), (255, 0, 0, 255))

            add_manifest_crop(
                output_dir,
                manifest_images,
                manifest_seen,
                slot="nation-mark",
                file_path=Path("images/nations/unit/fighter/france.png"),
                crop_image=image,
                filters={"nationId": "france", "kind": "fighter", "template": "unit"},
            )
            add_manifest_crop(
                output_dir,
                manifest_images,
                manifest_seen,
                slot="nation-mark",
                file_path=Path("images/nations/command/order/france.png"),
                crop_image=image,
                filters={"nationId": "france", "kind": "order", "template": "command"},
            )

            self.assertEqual(len(manifest_images), 2)
            self.assertEqual({entry["template"] for entry in manifest_images}, {"unit", "command"})
            self.assertEqual({entry["kind"] for entry in manifest_images}, {"fighter", "order"})

    def test_stage6_copy_preserves_template_and_kind_paths(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            stage5_pack = root / "stage5"
            output_dir = root / "stage6"
            (stage5_pack / "images/nations/unit/fighter").mkdir(parents=True)
            (stage5_pack / "images/nations/command/order").mkdir(parents=True)
            Image.new("RGBA", (2, 2), (255, 0, 0, 255)).save(stage5_pack / "images/nations/unit/fighter/france.png")
            Image.new("RGBA", (2, 2), (0, 0, 255, 255)).save(stage5_pack / "images/nations/command/order/france.png")
            (stage5_pack / "kards-asset-pack.json").write_text(
                json.dumps(
                    {
                        "images": [
                            {
                                "slot": "nation-mark",
                                "file": "images/nations/unit/fighter/france.png",
                                "nationId": "france",
                                "kind": "fighter",
                                "template": "unit",
                            },
                            {
                                "slot": "nation-mark",
                                "file": "images/nations/command/order/france.png",
                                "nationId": "france",
                                "kind": "order",
                                "template": "command",
                            },
                        ]
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )

            extracted_assets: list[dict[str, object]] = []
            renderer_manifest_images: list[dict[str, str]] = []
            inventory = copy_stage5_clean_assets(stage5_pack, output_dir, extracted_assets, renderer_manifest_images)

            self.assertEqual(inventory["copiedImages"], 2)
            entries_by_file = {entry["file"]: entry for entry in renderer_manifest_images}
            unit_file = "images/stage5-clean/nation-mark/unit/fighter/france.png"
            command_file = "images/stage5-clean/nation-mark/command/order/france.png"
            self.assertIn(unit_file, entries_by_file)
            self.assertIn(command_file, entries_by_file)
            self.assertEqual(entries_by_file[unit_file]["kind"], "fighter")
            self.assertEqual(entries_by_file[unit_file]["template"], "unit")
            self.assertEqual(entries_by_file[command_file]["kind"], "order")
            self.assertEqual(entries_by_file[command_file]["template"], "command")

    def test_subject_protection_keeps_britain_command_outer_ring(self) -> None:
        image, rect = make_mark_fixture()
        draw_roundel(image, rect, outer=(37, 56, 118), middle=(245, 245, 235), inner=(171, 42, 43))

        output = extract_nation_mark_subject(image, rect, "britain", "order")

        assert_outer_ring_and_clear_corners(self, output)

    def test_subject_protection_keeps_france_air_outer_ring(self) -> None:
        image, rect = make_mark_fixture()
        draw_roundel(image, rect, outer=(37, 56, 118), middle=(245, 245, 235), inner=(171, 42, 43))

        output = extract_nation_mark_subject(image, rect, "france", "fighter")

        assert_outer_ring_and_clear_corners(self, output)

    def test_nation_mark_extraction_clips_mismatched_command_background(self) -> None:
        image, rect = make_mark_fixture()
        x, y, width, height = rect
        draw = ImageDraw.Draw(image)
        draw.rectangle((x, y, x + width - 1, y + height - 1), fill=(151, 84, 38, 255))
        draw.rectangle((x + 20, y, x + 33, y + height - 1), fill=(210, 214, 205, 255))
        draw.rectangle((x, y + 20, x + width - 1, y + 33), fill=(210, 214, 205, 255))

        output = extract_nation_mark_subject(image, rect, "germany", "countermeasure")

        output_pixels = output.load()
        for point in ((27, 0), (27, 53), (0, 27), (53, 27)):
            with self.subTest(point=point):
                self.assertGreaterEqual(output_pixels[point][3], 200)
        for point in ((0, 0), (53, 0), (0, 53), (53, 53)):
            with self.subTest(point=point):
                self.assertEqual(output_pixels[point][3], 0)

    def test_nation_mark_extraction_preserves_low_contrast_neutral_diamond(self) -> None:
        image, rect = make_mark_fixture()
        x, y, width, height = rect
        draw = ImageDraw.Draw(image)
        diamond = ((x + 27, y + 2), (x + 51, y + 27), (x + 27, y + 51), (x + 2, y + 27))
        draw.polygon(diamond, fill=(68, 62, 56, 255))
        draw.rectangle((x, y + 48, x + width - 1, y + height - 1), fill=(151, 84, 38, 255))

        output = extract_nation_mark_subject(image, rect, "neutral", "infantry")
        pixels = output.load()

        for point in ((27, 2), (51, 27), (27, 51), (2, 27)):
            with self.subTest(point=point):
                self.assertGreaterEqual(pixels[point][3], 200)
        self.assertGreaterEqual(pixels[27, 27][3], 200)
        for point in ((0, 0), (53, 53)):
            with self.subTest(point=point):
                self.assertEqual(pixels[point][3], 0)

    def test_nation_mark_extraction_preserves_japan_flag_field(self) -> None:
        image, rect = make_mark_fixture()
        x, y, width, height = rect
        draw = ImageDraw.Draw(image)
        draw.rectangle((x + 5, y + 2, x + width - 6, y + height - 3), fill=(67, 61, 55, 255))
        draw.ellipse((x + 17, y + 17, x + 36, y + 36), fill=(188, 34, 42, 255))

        output = extract_nation_mark_subject(image, rect, "japan", "order")
        pixels = output.load()

        self.assertGreaterEqual(pixels[6, 6][3], 200)
        self.assertGreaterEqual(pixels[27, 27][3], 200)
        self.assertEqual(pixels[0, 0][3], 0)

    def test_nation_mark_extraction_clips_soviet_order_artwork(self) -> None:
        image, rect = make_mark_fixture()
        x, y, width, height = rect
        draw = ImageDraw.Draw(image)
        draw.rectangle((x, y, x + width - 1, y + height - 1), fill=(172, 64, 40, 255))
        draw.line((x, y + 53, x + 53, y), fill=(230, 156, 64, 255), width=3)
        draw.polygon(
            ((x + 27, y), (x + 33, y + 18), (x + 53, y + 20), (x + 36, y + 32),
             (x + 43, y + 53), (x + 27, y + 40), (x + 11, y + 53), (x + 18, y + 32),
             (x, y + 20), (x + 21, y + 18)),
            fill=(198, 35, 41, 255),
        )

        output = extract_nation_mark_subject(image, rect, "soviet", "order")
        alpha = output.getchannel("A")

        self.assertTrue(all(alpha.getpixel(point) >= 200 for point in ((27, 5), (47, 21), (38, 42), (17, 42), (7, 21))))
        self.assertTrue(all(alpha.getpixel(point) == 0 for point in ((0, 0), (53, 0), (0, 53), (53, 53))))

    def test_nation_mark_extraction_rejects_opaque_crop_without_palette(self) -> None:
        image = Image.new("RGBA", (54, 54), (88, 74, 63, 255))

        with self.assertRaisesRegex(ValueError, "missing background palette"):
            extract_nation_mark_subject(image, (0, 0, 54, 54), "poland", "infantry")

    def test_authorized_nation_marks_follow_family_alpha_contracts(self) -> None:
        pack_root = TOOLS_DIR.parent / "public" / "reference-pack" / "v1"
        nation_root = pack_root / "images" / "nation-mark"
        affected_assets = {
            "command/countermeasure/britain.png": ("britain", "command", "countermeasure"),
            "command/countermeasure/germany.png": ("germany", "command", "countermeasure"),
            "command/countermeasure/us.png": ("us", "command", "countermeasure"),
            "command/order/japan.png": ("japan", "command", "order"),
            "command/order/neutral.png": ("neutral", "command", "order"),
            "command/order/soviet.png": ("soviet", "command", "order"),
            "unit/bomber/france.png": ("france", "unit", "bomber"),
            "unit/fighter/anzac.png": ("anzac", "unit", "fighter"),
            "unit/fighter/france.png": ("france", "unit", "fighter"),
            "unit/infantry/anzac.png": ("anzac", "unit", "infantry"),
            "unit/infantry/neutral.png": ("neutral", "unit", "infantry"),
            "unit/tank/anzac.png": ("anzac", "unit", "tank"),
        }
        manifest = json.loads((pack_root / "kards-asset-pack.json").read_text(encoding="utf-8"))
        published = {
            entry["file"].removeprefix("images/nation-mark/"): (
                entry["nationId"], entry["template"], entry["kind"]
            )
            for entry in manifest["images"]
            if entry["slot"] == "nation-mark"
            and entry["file"].removeprefix("images/nation-mark/") in affected_assets
        }
        self.assertEqual(published, affected_assets)
        self.assertEqual(len(published), len(affected_assets))

        circle_assets = (
            "command/countermeasure/britain.png",
            "unit/fighter/france.png",
            "unit/bomber/france.png",
            "unit/fighter/anzac.png",
            "unit/infantry/anzac.png",
            "unit/tank/anzac.png",
        )
        for relative_path in circle_assets:
            with self.subTest(relative_path=relative_path), Image.open(nation_root / relative_path) as source:
                alpha = source.convert("RGBA").getchannel("A")
                self.assertEqual(opaque_pixels_outside_circle(alpha, radius=26.0), 0)
                self.assertGreaterEqual(strong_alpha_pixel_count(alpha), 1000)

        with Image.open(nation_root / "command/countermeasure/germany.png") as source:
            alpha = source.convert("RGBA").getchannel("A")
            self.assertEqual(opaque_pixels_outside_plus(alpha, half_width=13.0), 0)
            self.assertGreaterEqual(strong_alpha_pixel_count(alpha), 1000)

        with Image.open(nation_root / "command/countermeasure/us.png") as source:
            mark = source.convert("RGBA")
            alpha = mark.getchannel("A")
            self.assertLessEqual(opaque_pixels_outside_us_reference_mask(alpha), 100)
            self.assertGreaterEqual(strong_alpha_pixel_count(alpha), 1000)
            self.assertLessEqual(strong_alpha_pixel_count(alpha), 1700)
            self.assertEqual(off_reference_color_pixels(mark, (224, 230, 220), tolerance=0), 0)

        for relative_path in ("command/order/neutral.png", "unit/infantry/neutral.png"):
            with self.subTest(relative_path=relative_path), Image.open(nation_root / relative_path) as source:
                alpha = source.convert("RGBA").getchannel("A")
                self.assertGreaterEqual(alpha.getpixel((27, 27)), 200)
                self.assertEqual(opaque_pixels_outside_diamond(alpha, radius=26.0), 0)
                self.assertGreaterEqual(strong_alpha_pixel_count(alpha), 1000)
                self.assertTrue(all(alpha.getpixel(point) >= 200 for point in ((27, 2), (51, 27), (27, 51), (2, 27))))

        with Image.open(nation_root / "command/order/japan.png") as source:
            alpha = source.convert("RGBA").getchannel("A")
            self.assertGreaterEqual(alpha.getpixel((6, 6)), 200)
            self.assertEqual(opaque_pixels_outside_rect(alpha, 4, 2, 50, 52), 0)
            self.assertGreaterEqual(strong_alpha_pixel_count(alpha), 1500)

        with Image.open(nation_root / "command/order/soviet.png") as source:
            alpha = source.convert("RGBA").getchannel("A")
            star = ((27, 0), (33, 18), (53, 20), (36, 32), (43, 53), (27, 40), (11, 53), (18, 32), (0, 20), (21, 18))
            self.assertLessEqual(opaque_pixels_outside_polygon(alpha, star), 150)
            self.assertGreaterEqual(strong_alpha_pixel_count(alpha), 500)
            self.assertLessEqual(strong_alpha_pixel_count(alpha), 1100)

        for relative_path in (
            "command/order/soviet.png",
            "unit/fighter/anzac.png",
            "unit/infantry/anzac.png",
            "unit/tank/anzac.png",
        ):
            with self.subTest(relative_path=relative_path), Image.open(nation_root / relative_path) as source:
                alpha = source.convert("RGBA").getchannel("A")
                self.assertEqual(len(alpha_components(alpha)), 1)

    def test_stage6_normalizes_clean_set_marks_to_the_original_bottom_right_anchor(self) -> None:
        source = Image.new("RGBA", (18, 17), (0, 0, 0, 0))
        ImageDraw.Draw(source).rectangle((0, 0, 17, 16), fill=(150, 145, 132, 255))

        output = multisource.normalize_kardsgen_set_mark(source)

        self.assertEqual(output.size, (30, 28))
        self.assertEqual(output.getchannel("A").getbbox(), (12, 9, 30, 26))

    def test_stage6_delegates_clean_set_marks_instead_of_copying_card_crops(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            stage5_pack = root / "stage5"
            output_dir = root / "stage6"
            source_dir = stage5_pack / "images" / "set-mark"
            source_dir.mkdir(parents=True)
            Image.new("RGBA", (28, 28), (0, 0, 0, 0)).save(source_dir / "only-spawnable.png")
            delegated_entries = [
                {"slot": "set-mark", "setId": set_id, "file": f"images/set-mark/{set_id}.png"}
                for set_id in multisource.KARDSGEN_SET_MARK_SOURCES
            ]
            (stage5_pack / "kards-asset-pack.json").write_text(
                json.dumps({
                    "images": delegated_entries + [
                        {"slot": "set-mark", "setId": "only-spawnable", "file": "images/set-mark/only-spawnable.png"}
                    ],
                }),
                encoding="utf-8",
            )
            extracted_assets: list[dict[str, object]] = []
            renderer_manifest_images: list[dict[str, str]] = []

            inventory = copy_stage5_clean_assets(
                stage5_pack,
                output_dir,
                extracted_assets,
                renderer_manifest_images,
            )

            self.assertEqual(inventory["setMarksDelegatedToKardsGen"], len(delegated_entries))
            self.assertEqual(inventory["copiedImages"], 1)
            self.assertEqual([entry["setId"] for entry in renderer_manifest_images], ["only-spawnable"])
            for entry in delegated_entries:
                self.assertFalse((output_dir / "images" / "stage5-clean" / "set-mark" / Path(entry["file"]).name).exists())

    def test_stage6_promotes_clean_set_mark_with_source_provenance(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source_root = root / "KardsGen"
            source_path = source_root / "set" / "png" / "Homefront.png"
            source_path.parent.mkdir(parents=True)
            Image.new("RGBA", (20, 18), (154, 149, 137, 255)).save(source_path)
            extracted_assets: list[dict[str, object]] = []
            renderer_manifest_images: list[dict[str, str]] = []

            with patch.object(
                multisource,
                "KARDSGEN_SET_MARK_SOURCES",
                {"homefront": "set/png/Homefront.png"},
            ):
                promoted = multisource.promote_kardsgen_set_marks(
                    source_root,
                    root / "output",
                    extracted_assets,
                    renderer_manifest_images,
                )

            self.assertEqual(promoted, 1)
            self.assertEqual(renderer_manifest_images, [{
                "slot": "set-mark",
                "setId": "homefront",
                "file": "images/stage5-clean/set-mark/homefront.png",
            }])
            self.assertEqual(extracted_assets[0]["sourceRoute"], "kardsgen-clean-set-material")
            self.assertEqual(extracted_assets[0]["sourcePath"], str(source_path))
            self.assertEqual(extracted_assets[0]["sourceStatus"], "external-fan-tool-material")
            self.assertEqual(extracted_assets[0]["rendererReadiness"], "renderer-ready-clean-set-mark")
            self.assertEqual(extracted_assets[0]["slot"], "set-mark")
            with Image.open(root / "output" / renderer_manifest_images[0]["file"]) as promoted_image:
                self.assertEqual(promoted_image.size, (30, 28))

    def test_stage6_rejects_incomplete_clean_set_mark_source(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir, patch.object(
            multisource,
            "KARDSGEN_SET_MARK_SOURCES",
            {"homefront": "set/png/Homefront.png"},
        ):
            with self.assertRaisesRegex(SystemExit, "Missing required KardsGen set marks"):
                multisource.promote_kardsgen_set_marks(
                    Path(temp_dir),
                    Path(temp_dir) / "output",
                    [],
                    [],
                )

    def test_authorized_set_marks_use_clean_antialiased_subjects(self) -> None:
        pack_root = TOOLS_DIR.parent / "public" / "reference-pack" / "v1"
        set_root = pack_root / "images" / "set-mark"
        visible_set_ids = {
            "allegiance",
            "base",
            "blood-and-iron",
            "breakthrough",
            "brothers-in-arms",
            "covert-ops",
            "homefront",
            "legions",
            "naval-warfare",
            "oceania-storm",
            "special",
            "theaters-of-war",
            "winter-war",
            "world-at-war",
        }
        expected_paths = {
            set_id: f"images/set-mark/{set_id}.png"
            for set_id in visible_set_ids | {"only-spawnable"}
        }
        manifest = json.loads((pack_root / "kards-asset-pack.json").read_text(encoding="utf-8"))
        set_entries = [
            entry
            for entry in manifest["images"]
            if entry["slot"] == "set-mark"
        ]
        published = {
            entry["setId"]: entry["file"]
            for entry in set_entries
        }

        self.assertEqual(set(multisource.KARDSGEN_SET_MARK_SOURCES), visible_set_ids)
        self.assertEqual(len(set_entries), 15)
        self.assertEqual(len({entry["setId"] for entry in set_entries}), 15)
        self.assertEqual(len({entry["file"] for entry in set_entries}), 15)
        self.assertEqual(published, expected_paths)
        for set_id in sorted(visible_set_ids):
            with self.subTest(set_id=set_id), Image.open(set_root / f"{set_id}.png") as source:
                alpha = source.convert("RGBA").getchannel("A")
                alpha_values = list(alpha.get_flattened_data())
                self.assertEqual(source.size, (30, 28))
                self.assertEqual(alpha.getbbox()[3], 26)
                self.assertEqual(len(alpha_components(alpha)), 1)
                self.assertGreaterEqual(alpha_values.count(0), 300)
                self.assertTrue(any(0 < value < 255 for value in alpha_values))
                self.assertGreaterEqual(sum(value >= 8 for value in alpha_values), 100)

        with Image.open(set_root / "only-spawnable.png") as source:
            self.assertEqual(source.convert("RGBA").getchannel("A").getbbox(), None)

    def test_set_mark_extraction_clears_paper_background(self) -> None:
        rect = (8, 8, 28, 28)
        image = Image.new("RGBA", (44, 44), (210, 202, 176, 255))
        draw = ImageDraw.Draw(image)
        draw.polygon(
            (
                (rect[0] + 14, rect[1] + 3),
                (rect[0] + 18, rect[1] + 11),
                (rect[0] + 26, rect[1] + 12),
                (rect[0] + 20, rect[1] + 18),
                (rect[0] + 22, rect[1] + 26),
                (rect[0] + 14, rect[1] + 21),
                (rect[0] + 6, rect[1] + 26),
                (rect[0] + 8, rect[1] + 18),
                (rect[0] + 2, rect[1] + 12),
                (rect[0] + 10, rect[1] + 11),
            ),
            fill=(75, 76, 70, 255),
        )

        output = extract_set_mark_subject(image, rect)
        pixels = output.load()

        self.assertEqual(pixels[0, 0][3], 0)
        self.assertEqual(pixels[27, 27][3], 0)
        self.assertGreaterEqual(pixels[14, 14][3], 200)

    def test_set_mark_extraction_preserves_small_light_subject(self) -> None:
        rect = (8, 8, 28, 28)
        image = Image.new("RGBA", (44, 44), (210, 202, 176, 255))
        draw = ImageDraw.Draw(image)
        draw.line(
            (
                (rect[0] + 8, rect[1] + 14),
                (rect[0] + 20, rect[1] + 14),
                (rect[0] + 14, rect[1] + 8),
                (rect[0] + 14, rect[1] + 20),
            ),
            fill=(145, 145, 130, 255),
            width=2,
        )

        output = extract_set_mark_subject(image, rect)
        alpha_values = list(output.getchannel("A").tobytes())

        self.assertGreater(sum(1 for alpha in alpha_values if alpha >= 200), 0)
        self.assertGreater(sum(1 for alpha in alpha_values if alpha == 0), 600)

    def test_detailed_set_mark_extraction_preserves_faint_linework(self) -> None:
        rect = (8, 8, 28, 28)
        image = Image.new("RGBA", (44, 44), (210, 202, 176, 255))
        draw = ImageDraw.Draw(image)
        draw.ellipse(
            (
                rect[0] + 5,
                rect[1] + 5,
                rect[0] + 23,
                rect[1] + 23,
            ),
            outline=(190, 190, 170, 255),
            width=2,
        )
        draw.line(
            (
                (rect[0] + 14, rect[1] + 5),
                (rect[0] + 14, rect[1] + 23),
                (rect[0] + 5, rect[1] + 14),
                (rect[0] + 23, rect[1] + 14),
            ),
            fill=(190, 190, 170, 255),
            width=1,
        )

        output = extract_set_mark_subject(image, rect, "world-at-war")
        alpha_values = list(output.getchannel("A").tobytes())

        self.assertGreater(sum(1 for alpha in alpha_values if alpha >= 200), 40)
        self.assertGreater(sum(1 for alpha in alpha_values if alpha == 0), 500)

    def test_set_mark_extraction_clears_empty_paper_crop(self) -> None:
        rect = (8, 8, 28, 28)
        image = Image.new("RGBA", (44, 44), (210, 202, 176, 255))

        output = extract_set_mark_subject(image, rect)
        alpha_values = list(output.getchannel("A").tobytes())

        self.assertEqual(sum(1 for alpha in alpha_values if alpha > 0), 0)

    def test_download_bytes_allows_known_https_sources_only(self) -> None:
        with patch("kards_private_calibration.urlopen", return_value=FakeResponse(b"ok")) as urlopen:
            self.assertEqual(
                download_bytes("https://raw.githubusercontent.com/CraftSoul/kards-image-tool/main/data.json"),
                b"ok",
            )
            urlopen.assert_called_once()

        with self.assertRaises(SystemExit):
            download_bytes("https://example.com/data.json")

        with self.assertRaises(SystemExit):
            download_bytes("http://www.kards.com/images/card/v52/en-EN/sample.png")

    def test_download_bytes_rejects_bad_status_and_oversized_responses(self) -> None:
        with patch("kards_private_calibration.urlopen", return_value=FakeResponse(b"nope", status=404)):
            with self.assertRaises(SystemExit):
                download_bytes("https://www.kards.com/images/card/v52/en-EN/sample.png")

        with patch(
            "kards_private_calibration.urlopen",
            return_value=FakeResponse(b"ok", headers={"Content-Length": str(12 * 1024 * 1024 + 1)}),
        ):
            with self.assertRaises(SystemExit):
                download_bytes("https://www.kards.com/images/card/v52/en-EN/sample.png")

        with patch("kards_private_calibration.urlopen", return_value=FakeResponse(b"x" * (12 * 1024 * 1024 + 1))):
            with self.assertRaises(SystemExit):
                download_bytes("https://www.kards.com/images/card/v52/en-EN/sample.png")


def make_mark_fixture() -> tuple[Image.Image, tuple[int, int, int, int]]:
    rect = (8, 8, 54, 54)
    image = Image.new("RGBA", (70, 70), (58, 52, 47, 255))
    return image, rect


def draw_roundel(
    image: Image.Image,
    rect: tuple[int, int, int, int],
    outer: tuple[int, int, int],
    middle: tuple[int, int, int],
    inner: tuple[int, int, int],
) -> None:
    x, y, width, height = rect
    draw = ImageDraw.Draw(image)
    draw.ellipse((x + 3, y + 3, x + width - 4, y + height - 4), fill=(*outer, 255))
    draw.ellipse((x + 11, y + 11, x + width - 12, y + height - 12), fill=(*middle, 255))
    draw.ellipse((x + 20, y + 20, x + width - 21, y + height - 21), fill=(*inner, 255))


def assert_outer_ring_and_clear_corners(test: unittest.TestCase, output: Image.Image) -> None:
    pixels = output.load()
    for point in ((3, 27), (50, 27), (27, 3), (27, 50)):
        with test.subTest(point=point):
            test.assertGreaterEqual(pixels[point][3], 200)
    for point in ((0, 0), (53, 0), (0, 53), (53, 53)):
        with test.subTest(point=point):
            test.assertEqual(pixels[point][3], 0)


def opaque_pixels_outside_circle(alpha: Image.Image, radius: float) -> int:
    center_x = (alpha.width - 1) / 2
    center_y = (alpha.height - 1) / 2
    radius_sq = radius * radius
    return sum(
        alpha.getpixel((x, y)) >= 8
        for y in range(alpha.height)
        for x in range(alpha.width)
        if ((x - center_x) ** 2) + ((y - center_y) ** 2) > radius_sq
    )


def strong_alpha_pixel_count(alpha: Image.Image) -> int:
    return sum(pixel >= 200 for pixel in alpha.get_flattened_data())


def opaque_pixels_outside_plus(alpha: Image.Image, half_width: float) -> int:
    center_x = (alpha.width - 1) / 2
    center_y = (alpha.height - 1) / 2
    return sum(
        alpha.getpixel((x, y)) >= 8
        for y in range(alpha.height)
        for x in range(alpha.width)
        if abs(x - center_x) > half_width and abs(y - center_y) > half_width
    )


def opaque_pixels_outside_diamond(alpha: Image.Image, radius: float) -> int:
    center_x = (alpha.width - 1) / 2
    center_y = (alpha.height - 1) / 2
    return sum(
        alpha.getpixel((x, y)) >= 8
        for y in range(alpha.height)
        for x in range(alpha.width)
        if abs(x - center_x) + abs(y - center_y) > radius
    )


def opaque_pixels_outside_rect(alpha: Image.Image, left: int, top: int, right: int, bottom: int) -> int:
    return sum(
        alpha.getpixel((x, y)) >= 8
        for y in range(alpha.height)
        for x in range(alpha.width)
        if not (left <= x < right and top <= y < bottom)
    )


def opaque_pixels_outside_polygon(alpha: Image.Image, polygon: tuple[tuple[int, int], ...]) -> int:
    mask = Image.new("1", alpha.size, 0)
    ImageDraw.Draw(mask).polygon(polygon, fill=1)
    return sum(
        alpha.getpixel((x, y)) >= 8 and not mask.getpixel((x, y))
        for y in range(alpha.height)
        for x in range(alpha.width)
    )


def opaque_pixels_outside_us_reference_mask(alpha: Image.Image) -> int:
    mask = Image.new("1", alpha.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((-1, -1, 54, 54), fill=1)
    draw.ellipse((4, 4, 49, 49), fill=0)
    draw.rectangle((22, 0, 31, 53), fill=0)
    draw.rectangle((0, 22, 53, 31), fill=0)
    draw.polygon(
        ((27, 0), (33, 18), (52, 18), (36, 30), (42, 48),
         (27, 37), (11, 48), (17, 30), (1, 18), (20, 18)),
        fill=1,
    )
    return sum(
        alpha.getpixel((x, y)) >= 8 and not mask.getpixel((x, y))
        for y in range(alpha.height)
        for x in range(alpha.width)
    )


def off_reference_color_pixels(
    mark: Image.Image,
    reference: tuple[int, int, int],
    tolerance: int,
) -> int:
    return sum(
        alpha >= 200 and max(abs(red - reference[0]), abs(green - reference[1]), abs(blue - reference[2])) > tolerance
        for red, green, blue, alpha in mark.get_flattened_data()
    )


def alpha_components(alpha: Image.Image) -> list[set[tuple[int, int]]]:
    seen: set[tuple[int, int]] = set()
    components: list[set[tuple[int, int]]] = []
    for y in range(alpha.height):
        for x in range(alpha.width):
            if (x, y) in seen or alpha.getpixel((x, y)) < 8:
                continue
            component: set[tuple[int, int]] = set()
            queue = deque([(x, y)])
            seen.add((x, y))
            while queue:
                current_x, current_y = queue.popleft()
                component.add((current_x, current_y))
                for next_y in range(max(0, current_y - 1), min(alpha.height, current_y + 2)):
                    for next_x in range(max(0, current_x - 1), min(alpha.width, current_x + 2)):
                        point = (next_x, next_y)
                        if point in seen or alpha.getpixel(point) < 8:
                            continue
                        seen.add(point)
                        queue.append(point)
            components.append(component)
    return components


class FakePath:
    def __init__(
        self,
        name: str,
        *,
        children: list["FakePath"] | None = None,
        is_symlink: bool = False,
        is_junction: bool = False,
        is_dir: bool = False,
    ) -> None:
        self.name = name
        self.children = children or []
        self._is_symlink = is_symlink
        self._is_junction = is_junction
        self._is_dir = is_dir or bool(children)
        self.calls: list[str] = []

    def iterdir(self) -> list["FakePath"]:
        return self.children

    def is_symlink(self) -> bool:
        return self._is_symlink

    def is_junction(self) -> bool:
        return self._is_junction

    def is_dir(self) -> bool:
        return self._is_dir

    def unlink(self) -> None:
        self.calls.append("unlink")

    def rmdir(self) -> None:
        self.calls.append("rmdir")


class FakeResponse:
    def __init__(self, data: bytes, *, status: int = 200, headers: dict[str, str] | None = None) -> None:
        self.data = data
        self.status = status
        self.headers = headers or {}

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, _exc_type: object, _exc_value: object, _traceback: object) -> None:
        return None

    def getcode(self) -> int:
        return self.status

    def read(self, size: int = -1) -> bytes:
        return self.data if size < 0 else self.data[:size]


if __name__ == "__main__":
    unittest.main()
