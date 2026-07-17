from __future__ import annotations

import base64
import csv
import json
import mimetypes
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, Field


# =============================================================================
# CONFIGURATION
# =============================================================================

load_dotenv()

MODEL = os.getenv("REFERENCE_RESCAN_MODEL", "gpt-5")
MAX_RETRIES = int(os.getenv("REFERENCE_RESCAN_MAX_RETRIES", "3"))
MIN_CONFIDENCE = float(os.getenv("REFERENCE_RESCAN_MIN_CONFIDENCE", "0.70"))
SKIP_EXISTING = os.getenv("REFERENCE_RESCAN_SKIP_EXISTING", "true").lower() == "true"

INPUT_IMAGES_DIRECTORY = Path(
    os.getenv("INPUT_DIRECTORY", "input_images")
)
MANIFESTS_DIRECTORY = Path(
    os.getenv("JSON_DIRECTORY", "manifests")
)

# CSV produit par la première passe de matching.
PRODUCTS_INPUT_CSV = Path(
    "output/consolidation-produits-avec-images.csv"
)

OUTPUT_DIRECTORY = Path("output/reference-rescan-gpt5")
CHECKPOINT_DIRECTORY = OUTPUT_DIRECTORY / "checkpoints"

CORRECTIONS_CSV = OUTPUT_DIRECTORY / "references-corrigees-gpt5.csv"
UPDATED_PRODUCTS_CSV = (
    OUTPUT_DIRECTORY / "consolidation-produits-references-gpt5.csv"
)
ERRORS_CSV = OUTPUT_DIRECTORY / "erreurs-rescan-gpt5.csv"
SUMMARY_JSON = OUTPUT_DIRECTORY / "resume-rescan-gpt5.json"

# Le script ne rescane que les sources dont au moins une ligne n'a pas d'image.
ONLY_ROWS_WITHOUT_IMAGES = True

# Noms des colonnes existantes.
SOURCE_JSON_COLUMN = "source_json"
IMAGE_INDEX_COLUMN = "image_index"
PRODUCT_INDEX_COLUMN = "product_index"
REFERENCE_COLUMN = "reference"
SIZE_COLUMN = "size"
PRICE_COLUMN = "price"
IMAGES_COLUMN = "images"
IMAGE_COUNT_COLUMN = "image_count"


# =============================================================================
# SCHÉMA DE SORTIE GPT
# =============================================================================

class ExtractedProduct(BaseModel):
    reference: str = Field(
        description=(
            "Référence commerciale exacte visible sur l'image. "
            "Conserver les lettres, chiffres, slashs et suffixes utiles."
        )
    )
    size: str = Field(
        default="",
        description="Taille ou dimension associée à cette référence."
    )
    price: str = Field(
        default="",
        description="Prix visible associé à cette référence."
    )
    confidence_reference: float = Field(
        ge=0,
        le=1,
        description="Confiance sur la lecture de la référence."
    )
    evidence: str = Field(
        default="",
        description=(
            "Très court indice visuel expliquant où la référence a été lue."
        )
    )


class ReferenceScanResult(BaseModel):
    products: list[ExtractedProduct]
    warnings: list[str] = []


PROMPT = """
Tu analyses une image de catalogue de mobilier, luminaires ou décoration.

OBJECTIF UNIQUE
Extraire avec une très grande précision toutes les références commerciales
visibles et les associer à leur taille et à leur prix éventuels.

RÈGLES
1. Ne crée jamais de référence qui n'est pas visible.
2. Lis attentivement les petites zones de texte, tableaux, encadrés de prix,
   légendes et variantes.
3. Une image peut contenir plusieurs références ou plusieurs variantes.
4. Une même référence peut apparaître avec plusieurs tailles et prix :
   retourne alors une entrée par variante.
5. Préserve les lettres significatives et les séparateurs utiles :
   exemples "SR 4013/60", "11813/1 GD", "C 922 A".
6. Ne transforme pas une taille en référence.
7. Ne transforme pas un prix en référence.
8. Ignore les logos, numéros de page et coordonnées commerciales.
9. L'ordre des produits doit suivre leur ordre visuel dans l'image,
   de haut en bas puis de gauche à droite.
10. Quand la référence est illisible ou absente, retourne une chaîne vide
    et une confiance faible. N'invente rien.

La sortie doit respecter exactement le schéma structuré demandé.
""".strip()


# =============================================================================
# OUTILS
# =============================================================================

@dataclass
class ExistingRow:
    row_position: int
    row: dict[str, str]


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    if not path.exists():
        raise FileNotFoundError(f"Fichier introuvable : {path.resolve()}")

    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        if not reader.fieldnames:
            raise ValueError(f"Le CSV ne contient pas d'en-têtes : {path}")
        return list(reader.fieldnames), list(reader)


def write_csv(
    path: Path,
    fieldnames: list[str],
    rows: list[dict[str, Any]],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(rows)


def parse_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return default


def parse_number(value: Any) -> float | None:
    if value is None:
        return None

    raw = str(value).strip()
    if not raw:
        return None

    raw = raw.replace("\u00a0", " ")
    raw = re.sub(r"[^\d,.\-]", "", raw)

    if not raw:
        return None

    if "," in raw and "." in raw:
        if raw.rfind(",") > raw.rfind("."):
            raw = raw.replace(".", "").replace(",", ".")
        else:
            raw = raw.replace(",", "")
    else:
        raw = raw.replace(",", ".")

    try:
        return float(raw)
    except ValueError:
        return None


def normalize_text(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())


def has_images(row: dict[str, str]) -> bool:
    count = parse_int(row.get(IMAGE_COUNT_COLUMN), 0)
    if count > 0:
        return True

    raw = str(row.get(IMAGES_COLUMN) or "").strip()
    if not raw:
        return False

    try:
        value = json.loads(raw)
        return isinstance(value, list) and len(value) > 0
    except json.JSONDecodeError:
        return bool(raw.strip("[] "))


def load_manifest_source_map() -> dict[str, str]:
    mapping: dict[str, str] = {}

    if not MANIFESTS_DIRECTORY.exists():
        return mapping

    for path in MANIFESTS_DIRECTORY.glob("*.json"):
        try:
            with path.open("r", encoding="utf-8-sig") as file:
                data = json.load(file)
        except (OSError, json.JSONDecodeError):
            continue

        candidates: list[str] = []

        for key in ("source_file", "original_file", "input_file", "filename"):
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                candidates.append(value.strip())

        images = data.get("images")
        if isinstance(images, list):
            for image in images:
                if not isinstance(image, dict):
                    continue
                for key in (
                    "source_file",
                    "original_file",
                    "input_file",
                    "filename",
                ):
                    value = image.get(key)
                    if isinstance(value, str) and value.strip():
                        candidates.append(value.strip())

        if candidates:
            mapping[path.name] = candidates[0]

    return mapping


def detect_mime_type(path: Path) -> str:
    try:
        with path.open("rb") as file:
            header = file.read(16)
    except OSError:
        header = b""

    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "image/webp"
    if header.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"

    guessed, _ = mimetypes.guess_type(path.name)
    return guessed or "image/jpeg"


def build_input_image_indexes() -> tuple[
    dict[str, list[Path]],
    dict[str, list[Path]],
]:
    exact: dict[str, list[Path]] = {}
    stem: dict[str, list[Path]] = {}

    if not INPUT_IMAGES_DIRECTORY.exists():
        raise FileNotFoundError(
            f"Dossier input_images introuvable : "
            f"{INPUT_IMAGES_DIRECTORY.resolve()}"
        )

    for path in INPUT_IMAGES_DIRECTORY.rglob("*"):
        if not path.is_file():
            continue

        exact.setdefault(path.name.lower(), []).append(path)
        stem.setdefault(normalize_text(path.stem), []).append(path)

    return exact, stem


def resolve_original_image(
    source_json: str,
    manifest_source_map: dict[str, str],
    exact_index: dict[str, list[Path]],
    stem_index: dict[str, list[Path]],
) -> Path | None:
    candidates: list[str] = []

    manifest_source = manifest_source_map.get(source_json)
    if manifest_source:
        candidates.append(Path(manifest_source).name)

    json_stem = Path(source_json).stem
    candidates.extend([json_stem, source_json])

    for candidate in candidates:
        paths = exact_index.get(candidate.lower(), [])
        if len(paths) == 1:
            return paths[0]

    for candidate in candidates:
        key = normalize_text(Path(candidate).stem)
        paths = stem_index.get(key, [])
        if len(paths) == 1:
            return paths[0]

    return None


def image_to_data_url(path: Path) -> str:
    content = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{detect_mime_type(path)};base64,{content}"


def checkpoint_path(source_json: str) -> Path:
    safe_name = re.sub(r"[^a-zA-Z0-9._-]+", "_", source_json)
    return CHECKPOINT_DIRECTORY / f"{safe_name}.json"


def load_checkpoint(source_json: str) -> ReferenceScanResult | None:
    path = checkpoint_path(source_json)
    if not SKIP_EXISTING or not path.exists():
        return None

    try:
        with path.open("r", encoding="utf-8") as file:
            return ReferenceScanResult.model_validate(json.load(file))
    except (OSError, json.JSONDecodeError, ValueError):
        return None


def save_checkpoint(
    source_json: str,
    result: ReferenceScanResult,
) -> None:
    path = checkpoint_path(source_json)
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as file:
        json.dump(
            result.model_dump(),
            file,
            ensure_ascii=False,
            indent=2,
        )


def scan_reference(
    client: OpenAI,
    image_path: Path,
) -> ReferenceScanResult:
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.responses.parse(
                model=MODEL,
                reasoning={"effort": "high"},
                input=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "input_text",
                                "text": PROMPT,
                            },
                            {
                                "type": "input_image",
                                "image_url": image_to_data_url(image_path),
                                "detail": "high",
                            },
                        ],
                    }
                ],
                text_format=ReferenceScanResult,
            )

            if response.output_parsed is None:
                raise RuntimeError(
                    "Le modèle n'a retourné aucun résultat structuré."
                )

            return response.output_parsed

        except Exception as error:
            last_error = error

            if attempt < MAX_RETRIES:
                wait_seconds = min(2 ** attempt, 10)
                print(
                    f"  Tentative {attempt}/{MAX_RETRIES} échouée : "
                    f"{error}. Nouvelle tentative dans {wait_seconds}s."
                )
                time.sleep(wait_seconds)

    raise RuntimeError(
        f"Échec après {MAX_RETRIES} tentatives : {last_error}"
    )


def product_match_score(
    existing: dict[str, str],
    extracted: ExtractedProduct,
    position_distance: int,
) -> float:
    score = 0.0

    old_size = normalize_text(existing.get(SIZE_COLUMN))
    new_size = normalize_text(extracted.size)

    if old_size and new_size:
        if old_size == new_size:
            score += 60
        elif old_size in new_size or new_size in old_size:
            score += 35

    old_price = parse_number(existing.get(PRICE_COLUMN))
    new_price = parse_number(extracted.price)

    if old_price is not None and new_price is not None:
        difference = abs(old_price - new_price)
        if difference < 0.01:
            score += 80
        elif difference <= max(5, old_price * 0.01):
            score += 50
        elif difference <= max(20, old_price * 0.05):
            score += 20

    old_reference = normalize_text(existing.get(REFERENCE_COLUMN))
    new_reference = normalize_text(extracted.reference)

    if old_reference and new_reference:
        if old_reference == new_reference:
            score += 25
        elif old_reference in new_reference or new_reference in old_reference:
            score += 10

    score += max(0, 20 - position_distance * 5)
    return score


def align_products(
    existing_rows: list[ExistingRow],
    extracted_products: list[ExtractedProduct],
) -> list[tuple[ExistingRow, ExtractedProduct, float]]:
    if not existing_rows or not extracted_products:
        return []

    if len(existing_rows) == 1 and len(extracted_products) == 1:
        return [(existing_rows[0], extracted_products[0], 100.0)]

    available_existing = set(range(len(existing_rows)))
    available_extracted = set(range(len(extracted_products)))
    pairs: list[tuple[ExistingRow, ExtractedProduct, float]] = []

    while available_existing and available_extracted:
        best: tuple[float, int, int] | None = None

        for existing_index in available_existing:
            for extracted_index in available_extracted:
                score = product_match_score(
                    existing_rows[existing_index].row,
                    extracted_products[extracted_index],
                    abs(existing_index - extracted_index),
                )
                candidate = (score, existing_index, extracted_index)
                if best is None or candidate > best:
                    best = candidate

        if best is None:
            break

        score, existing_index, extracted_index = best
        pairs.append(
            (
                existing_rows[existing_index],
                extracted_products[extracted_index],
                score,
            )
        )
        available_existing.remove(existing_index)
        available_extracted.remove(extracted_index)

    return pairs


# =============================================================================
# TRAITEMENT PRINCIPAL
# =============================================================================

def main() -> None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY est absent du fichier .env.")

    fields, rows = read_csv(PRODUCTS_INPUT_CSV)

    sources_to_scan: dict[str, list[ExistingRow]] = {}

    for row_position, row in enumerate(rows):
        source_json = str(row.get(SOURCE_JSON_COLUMN) or "").strip()
        if not source_json:
            continue

        if ONLY_ROWS_WITHOUT_IMAGES and has_images(row):
            continue

        sources_to_scan.setdefault(source_json, []).append(
            ExistingRow(row_position=row_position, row=row)
        )

    manifest_source_map = load_manifest_source_map()
    exact_index, stem_index = build_input_image_indexes()

    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    CHECKPOINT_DIRECTORY.mkdir(parents=True, exist_ok=True)

    client = OpenAI(api_key=api_key)

    correction_rows: list[dict[str, Any]] = []
    error_rows: list[dict[str, Any]] = []

    scanned_count = 0
    checkpoint_count = 0
    corrected_count = 0
    low_confidence_count = 0

    print(f"Modèle utilisé : {MODEL}")
    print(f"Sources candidates : {len(sources_to_scan)}")
    print()

    for current, (source_json, existing_rows) in enumerate(
        sorted(sources_to_scan.items()),
        start=1,
    ):
        print(
            f"[{current}/{len(sources_to_scan)}] "
            f"{source_json} ({len(existing_rows)} ligne(s))"
        )

        image_path = resolve_original_image(
            source_json,
            manifest_source_map,
            exact_index,
            stem_index,
        )

        if image_path is None:
            error_rows.append(
                {
                    "source_json": source_json,
                    "error_type": "image-originale-introuvable",
                    "message": (
                        "Impossible de retrouver l'image dans input_images."
                    ),
                }
            )
            print("  Image originale introuvable.")
            continue

        try:
            result = load_checkpoint(source_json)
            if result is not None:
                checkpoint_count += 1
                print("  Résultat repris depuis le checkpoint.")
            else:
                result = scan_reference(client, image_path)
                save_checkpoint(source_json, result)
                scanned_count += 1
                print(
                    f"  GPT-5 : {len(result.products)} "
                    f"produit(s)/variante(s) détecté(s)."
                )
        except Exception as error:
            error_rows.append(
                {
                    "source_json": source_json,
                    "error_type": "erreur-api",
                    "message": str(error),
                }
            )
            print(f"  Erreur : {error}")
            continue

        aligned = align_products(existing_rows, result.products)
        aligned_positions = {
            existing.row_position for existing, _, _ in aligned
        }

        for existing, extracted, alignment_score in aligned:
            old_reference = str(
                existing.row.get(REFERENCE_COLUMN) or ""
            ).strip()
            accepted = (
                bool(extracted.reference.strip())
                and extracted.confidence_reference >= MIN_CONFIDENCE
            )

            if accepted:
                rows[existing.row_position][REFERENCE_COLUMN] = (
                    extracted.reference.strip()
                )
                corrected_count += 1
            else:
                low_confidence_count += 1

            correction_rows.append(
                {
                    "source_json": source_json,
                    "input_image": str(image_path),
                    "image_index": existing.row.get(
                        IMAGE_INDEX_COLUMN, ""
                    ),
                    "product_index": existing.row.get(
                        PRODUCT_INDEX_COLUMN, ""
                    ),
                    "old_reference": old_reference,
                    "gpt5_reference": extracted.reference.strip(),
                    "reference_applied": (
                        extracted.reference.strip() if accepted else ""
                    ),
                    "size_csv": existing.row.get(SIZE_COLUMN, ""),
                    "size_gpt5": extracted.size,
                    "price_csv": existing.row.get(PRICE_COLUMN, ""),
                    "price_gpt5": extracted.price,
                    "confidence_reference": (
                        extracted.confidence_reference
                    ),
                    "alignment_score": round(alignment_score, 2),
                    "accepted": "Oui" if accepted else "Non",
                    "evidence": extracted.evidence,
                    "warnings": json.dumps(
                        result.warnings,
                        ensure_ascii=False,
                    ),
                }
            )

        for existing in existing_rows:
            if existing.row_position in aligned_positions:
                continue

            correction_rows.append(
                {
                    "source_json": source_json,
                    "input_image": str(image_path),
                    "image_index": existing.row.get(
                        IMAGE_INDEX_COLUMN, ""
                    ),
                    "product_index": existing.row.get(
                        PRODUCT_INDEX_COLUMN, ""
                    ),
                    "old_reference": existing.row.get(
                        REFERENCE_COLUMN, ""
                    ),
                    "gpt5_reference": "",
                    "reference_applied": "",
                    "size_csv": existing.row.get(SIZE_COLUMN, ""),
                    "size_gpt5": "",
                    "price_csv": existing.row.get(PRICE_COLUMN, ""),
                    "price_gpt5": "",
                    "confidence_reference": "",
                    "alignment_score": "",
                    "accepted": "Non",
                    "evidence": "",
                    "warnings": json.dumps(
                        result.warnings
                        + ["Aucun produit GPT-5 aligné avec cette ligne CSV."],
                        ensure_ascii=False,
                    ),
                }
            )

    correction_fields = [
        "source_json",
        "input_image",
        "image_index",
        "product_index",
        "old_reference",
        "gpt5_reference",
        "reference_applied",
        "size_csv",
        "size_gpt5",
        "price_csv",
        "price_gpt5",
        "confidence_reference",
        "alignment_score",
        "accepted",
        "evidence",
        "warnings",
    ]

    write_csv(CORRECTIONS_CSV, correction_fields, correction_rows)
    write_csv(UPDATED_PRODUCTS_CSV, fields, rows)
    write_csv(
        ERRORS_CSV,
        ["source_json", "error_type", "message"],
        error_rows,
    )

    summary = {
        "model": MODEL,
        "sources_candidates": len(sources_to_scan),
        "sources_scanned_via_api": scanned_count,
        "sources_loaded_from_checkpoint": checkpoint_count,
        "references_applied": corrected_count,
        "low_confidence_or_empty": low_confidence_count,
        "technical_errors": len(error_rows),
        "minimum_confidence": MIN_CONFIDENCE,
        "products_input_csv": str(PRODUCTS_INPUT_CSV),
        "updated_products_csv": str(UPDATED_PRODUCTS_CSV),
        "corrections_csv": str(CORRECTIONS_CSV),
    }

    with SUMMARY_JSON.open("w", encoding="utf-8") as file:
        json.dump(summary, file, ensure_ascii=False, indent=2)

    print()
    print("Rescan GPT-5 terminé.")
    print(f"Sources réellement scannées       : {scanned_count}")
    print(f"Sources reprises des checkpoints  : {checkpoint_count}")
    print(f"Références corrigées/appliquées   : {corrected_count}")
    print(f"Résultats faibles ou vides        : {low_confidence_count}")
    print(f"Erreurs techniques                : {len(error_rows)}")
    print(f"Rapport des corrections           : {CORRECTIONS_CSV}")
    print(f"CSV produits corrigé              : {UPDATED_PRODUCTS_CSV}")
    print(f"Rapport d'erreurs                 : {ERRORS_CSV}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nTraitement interrompu. Les checkpoints déjà créés sont conservés.")
        raise SystemExit(130)
    except Exception as error:
        print(f"Erreur fatale : {error}")
        raise SystemExit(1)
