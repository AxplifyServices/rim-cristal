from __future__ import annotations

import csv
import json
import re
import shutil
import unicodedata
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------
CSV_INPUT = Path("consolidation-produits.csv")

# Choisir UNE source : dossier ou ZIP.
IMAGES_SOURCE = Path("meubles")       # ex. Path("meubles")
IMAGES_ZIP = Path("meubles.zip")      # utilisé seulement si IMAGES_SOURCE absent

# Destination physique des images dans le projet backend.
DESTINATION_DIRECTORY = Path("backend/uploads/products")

# Valeur écrite dans le CSV. Utiliser des / pour rester compatible web/Linux.
CSV_IMAGE_PREFIX = "backend/uploads/products"

CSV_OUTPUT = Path("output/consolidation-produits-avec-images.csv")
MATCH_REPORT = Path("output/rapport-match-images.csv")
UNMATCHED_IMAGES_REPORT = Path("output/images-non-associees.csv")

# Colonne contenant la référence dans le CSV.
REFERENCE_COLUMN = "reference"

# Colonnes ajoutées au CSV.
IMAGES_COLUMN = "images"
MAIN_IMAGE_COLUMN = "main_image"
IMAGE_COUNT_COLUMN = "image_count"

# Si True, vide backend/uploads/products avant de recopier les images.
CLEAR_DESTINATION = False

# Extensions réellement autorisées après détection du contenu du fichier.
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


@dataclass(frozen=True)
class SourceImage:
    path: Path
    original_name: str
    extension: str


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def normalize_for_match(value: str) -> str:
    """Normalise référence/nom pour comparer sans espaces ni ponctuation."""
    value = strip_accents(str(value)).lower().strip()
    return re.sub(r"[^a-z0-9]+", "", value)


def safe_reference_for_filename(reference: str) -> str:
    value = strip_accents(reference).lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "sans-reference"


def name_without_image_number(filename: str) -> str:
    """Retire seulement la partie '#1', '#2', etc. et l'extension éventuelle."""
    name = Path(filename).name
    # Une vraie extension connue est retirée. Les faux suffixes '. #1' restent gérés ensuite.
    suffix = Path(name).suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        name = name[: -len(suffix)]
    name = re.sub(r"\s*#\s*\d+\s*_?\s*$", "", name, flags=re.IGNORECASE)
    return name.strip(" ._-\t")


def detect_image_extension(path: Path) -> str | None:
    """Détecte le vrai format par signature binaire, même si l'extension manque."""
    try:
        with path.open("rb") as file:
            header = file.read(16)
    except OSError:
        return None

    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if header.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if header.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return ".webp"
    return None


def collect_source_images(directory: Path) -> list[SourceImage]:
    images: list[SourceImage] = []
    for path in sorted(directory.rglob("*"), key=lambda p: p.name.lower()):
        if not path.is_file():
            continue
        extension = detect_image_extension(path)
        if extension is None:
            continue
        images.append(
            SourceImage(path=path, original_name=path.name, extension=extension)
        )
    return images


def read_csv_rows(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        if not reader.fieldnames:
            raise ValueError(f"Le CSV {path} ne contient pas d'en-têtes.")
        return list(reader.fieldnames), list(reader)


def build_reference_index(rows: list[dict[str, str]]) -> dict[str, set[str]]:
    """Mappe une référence normalisée vers ses valeurs originales du CSV."""
    index: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        original_reference = (row.get(REFERENCE_COLUMN) or "").strip()
        normalized_reference = normalize_for_match(original_reference)
        if normalized_reference:
            index[normalized_reference].add(original_reference)
    return dict(index)


def match_reference(
    image_name: str,
    reference_index: dict[str, set[str]],
) -> tuple[str | None, str, str]:
    """
    Retourne (référence CSV, méthode, clé image).

    La comparaison se fait par préfixe et choisit la référence la plus longue.
    Exemples :
      - '0145 Bej. #1' -> '0145'
      - '2241_60×180 #2' -> '2241'
      - '8338_45 #1' -> '8338/45' plutôt que '8338'
      - '860 s_white #1' -> '860s'
    """
    meaningful_name = name_without_image_number(image_name)
    image_key = normalize_for_match(meaningful_name)
    if not image_key:
        return None, "aucune", image_key

    candidates = [
        normalized_reference
        for normalized_reference in reference_index
        if image_key.startswith(normalized_reference)
    ]
    if not candidates:
        return None, "aucune", image_key

    longest_length = max(len(candidate) for candidate in candidates)
    best_candidates = sorted(
        candidate for candidate in candidates if len(candidate) == longest_length
    )

    # Ambiguïté réelle : deux clés normalisées différentes de même longueur.
    if len(best_candidates) > 1:
        return None, "ambigu", image_key

    normalized_reference = best_candidates[0]
    original_references = sorted(reference_index[normalized_reference])
    # Plusieurs écritures CSV peuvent se normaliser de la même manière.
    # La première est choisie, mais toutes les lignes ayant la même clé recevront les images.
    return original_references[0], "prefixe-plus-long", image_key


def extract_or_use_directory() -> tuple[Path, TemporaryDirectory[str] | None]:
    if IMAGES_SOURCE.exists() and IMAGES_SOURCE.is_dir():
        return IMAGES_SOURCE, None

    if IMAGES_ZIP.exists() and IMAGES_ZIP.is_file():
        temporary_directory = TemporaryDirectory(prefix="rim-cristal-images-")
        extraction_path = Path(temporary_directory.name)
        with zipfile.ZipFile(IMAGES_ZIP, "r") as archive:
            archive.extractall(extraction_path)
        return extraction_path, temporary_directory

    raise FileNotFoundError(
        "Aucune source d'images trouvée. Vérifie IMAGES_SOURCE ou IMAGES_ZIP."
    )


def prepare_destination() -> None:
    if CLEAR_DESTINATION and DESTINATION_DIRECTORY.exists():
        shutil.rmtree(DESTINATION_DIRECTORY)
    DESTINATION_DIRECTORY.mkdir(parents=True, exist_ok=True)
    CSV_OUTPUT.parent.mkdir(parents=True, exist_ok=True)


def web_path(filename: str) -> str:
    return f"{CSV_IMAGE_PREFIX.rstrip('/')}/{filename}"


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    fieldnames, rows = read_csv_rows(CSV_INPUT)
    reference_index = build_reference_index(rows)
    source_directory, temporary_directory = extract_or_use_directory()

    try:
        prepare_destination()
        source_images = collect_source_images(source_directory)

        images_by_normalized_reference: dict[str, list[SourceImage]] = defaultdict(list)
        match_rows: list[dict[str, object]] = []
        unmatched_rows: list[dict[str, object]] = []

        for image in source_images:
            matched_reference, method, image_key = match_reference(
                image.original_name, reference_index
            )
            if matched_reference is None:
                unmatched_rows.append(
                    {
                        "original_name": image.original_name,
                        "detected_extension": image.extension,
                        "image_key": image_key,
                        "reason": method,
                    }
                )
                continue

            normalized_reference = normalize_for_match(matched_reference)
            images_by_normalized_reference[normalized_reference].append(image)
            match_rows.append(
                {
                    "original_name": image.original_name,
                    "detected_extension": image.extension,
                    "matched_reference": matched_reference,
                    "normalized_reference": normalized_reference,
                    "match_method": method,
                    "image_key": image_key,
                }
            )

        # Copie + renommage sûr. Les couleurs et caractères supplémentaires sont ignorés.
        final_paths_by_reference: dict[str, list[str]] = defaultdict(list)
        copied_name_by_original: dict[str, str] = {}

        for normalized_reference, images in sorted(images_by_normalized_reference.items()):
            original_reference = sorted(reference_index[normalized_reference])[0]
            safe_reference = safe_reference_for_filename(original_reference)

            # Tri stable : nom d'origine, puis chemin complet.
            images = sorted(images, key=lambda img: (img.original_name.lower(), str(img.path)))

            for sequence, image in enumerate(images, start=1):
                new_filename = f"{safe_reference}-{sequence:03d}{image.extension}"
                destination = DESTINATION_DIRECTORY / new_filename
                shutil.copy2(image.path, destination)
                final_path = web_path(new_filename)
                final_paths_by_reference[normalized_reference].append(final_path)
                copied_name_by_original[image.original_name] = new_filename

        # Enrichit chaque ligne. Les lignes dupliquées de la même référence reçoivent la même liste.
        output_rows: list[dict[str, object]] = []
        for row in rows:
            reference = (row.get(REFERENCE_COLUMN) or "").strip()
            normalized_reference = normalize_for_match(reference)
            image_paths = final_paths_by_reference.get(normalized_reference, [])

            enriched = dict(row)
            enriched[IMAGES_COLUMN] = json.dumps(image_paths, ensure_ascii=False)
            enriched[MAIN_IMAGE_COLUMN] = image_paths[0] if image_paths else ""
            enriched[IMAGE_COUNT_COLUMN] = len(image_paths)
            output_rows.append(enriched)

        output_fieldnames = list(fieldnames)
        for column in (IMAGES_COLUMN, MAIN_IMAGE_COLUMN, IMAGE_COUNT_COLUMN):
            if column not in output_fieldnames:
                output_fieldnames.append(column)

        # Complète le rapport de match avec le nom final.
        for report_row in match_rows:
            report_row["renamed_file"] = copied_name_by_original.get(
                str(report_row["original_name"]), ""
            )
            report_row["csv_path"] = (
                web_path(str(report_row["renamed_file"]))
                if report_row["renamed_file"]
                else ""
            )

        write_csv(CSV_OUTPUT, output_fieldnames, output_rows)
        write_csv(
            MATCH_REPORT,
            [
                "original_name",
                "detected_extension",
                "matched_reference",
                "normalized_reference",
                "match_method",
                "image_key",
                "renamed_file",
                "csv_path",
            ],
            match_rows,
        )
        write_csv(
            UNMATCHED_IMAGES_REPORT,
            ["original_name", "detected_extension", "image_key", "reason"],
            unmatched_rows,
        )

        products_with_images = sum(
            1 for row in output_rows if int(row[IMAGE_COUNT_COLUMN]) > 0
        )
        unique_refs_with_images = len(final_paths_by_reference)

        print("Traitement terminé.")
        print(f"Images détectées                 : {len(source_images)}")
        print(f"Images associées                 : {len(match_rows)}")
        print(f"Images non associées             : {len(unmatched_rows)}")
        print(f"Références avec images           : {unique_refs_with_images}")
        print(f"Lignes produits avec images      : {products_with_images}/{len(rows)}")
        print(f"CSV enrichi                      : {CSV_OUTPUT}")
        print(f"Images copiées                   : {DESTINATION_DIRECTORY}")
        print(f"Rapport de correspondance        : {MATCH_REPORT}")
        print(f"Rapport images non associées     : {UNMATCHED_IMAGES_REPORT}")

    finally:
        if temporary_directory is not None:
            temporary_directory.cleanup()


if __name__ == "__main__":
    main()
