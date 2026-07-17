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
from typing import Any


# =============================================================================
# CONFIGURATION
# =============================================================================

# CSV contenant les références corrigées par GPT-5.
CSV_PRODUCTS_INPUT = Path(
    "output/reference-rescan-gpt5/"
    "consolidation-produits-references-gpt5.csv"
)

# Rapport de la première passe : seules ces images seront retraitées.
CSV_UNMATCHED_INPUT = Path(
    "output/images-non-associees.csv"
)

# Source des images du graphiste.
# Le script utilise le dossier s'il existe, sinon le ZIP.
IMAGES_SOURCE_DIRECTORY = Path("meubles")
IMAGES_SOURCE_ZIP = Path("meubles.zip")

# Dossier physique final.
DESTINATION_DIRECTORY = Path(
    "backend/uploads/products"
)

# Chemin écrit dans le CSV.
CSV_IMAGE_PREFIX = "backend/uploads/products"

# Fichiers générés.
CSV_PRODUCTS_OUTPUT = Path(
    "output/consolidation-produits-avec-images-apres-gpt5.csv"
)

CSV_MATCH_REPORT = Path(
    "output/rapport-match-images-apres-gpt5-v2.csv"
)

CSV_UNMATCHED_OUTPUT = Path(
    "output/images-non-associees-apres-gpt5-v2.csv"
)

CSV_AMBIGUOUS_OUTPUT = Path(
    "output/images-ambigues-apres-gpt5-v2.csv"
)

CSV_MISSING_SOURCE_OUTPUT = Path(
    "output/images-source-introuvables-apres-gpt5-v2.csv"
)

REFERENCE_COLUMN = "reference"
SIZE_COLUMN = "size"
IMAGES_COLUMN = "images"
MAIN_IMAGE_COLUMN = "main_image"
IMAGE_COUNT_COLUMN = "image_count"

# Le script ne vide jamais backend/uploads/products.
CLEAR_DESTINATION = False

IMAGE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
}

IGNORED_WORDS = {
    # Couleurs
    "beige", "bej", "be", "bk", "black", "noir", "blanc", "white", "wh",
    "grey", "gray", "gris", "gr", "green", "vert", "blue", "bleu", "red",
    "rouge", "yellow", "jaune", "purple", "violet", "pink", "rose",
    "brown", "marron", "orange", "gold", "golden", "dore", "silver",
    "argente", "transparent", "clear", "multicolor", "multicolore",
    # Connecteurs
    "and", "et", "with", "avec", "or",
    # Descripteurs
    "color", "colour", "couleur", "cm", "mm", "led",
}

OPTIONAL_PREFIXES = {
    "b", "c", "d", "l", "p", "r", "rt", "s", "sr", "t",
}


# =============================================================================
# MODÈLES
# =============================================================================

@dataclass(frozen=True)
class SourceImage:
    path: Path
    original_name: str
    detected_extension: str


@dataclass(frozen=True)
class MatchDecision:
    reference: str | None
    normalized_reference: str | None
    method: str
    score: int
    image_key: str
    candidates: tuple[str, ...] = ()


# =============================================================================
# NORMALISATION
# =============================================================================

def strip_accents(value: Any) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    return "".join(
        character
        for character in normalized
        if not unicodedata.combining(character)
    )


def normalize_text(value: Any) -> str:
    value = strip_accents(value).lower().strip()
    value = value.replace("×", "x")
    return re.sub(r"[^a-z0-9]+", "", value)


def tokenize(value: Any) -> list[str]:
    value = strip_accents(value).lower().replace("×", "x")
    return re.findall(r"[a-z]+|\d+", value)


def remove_known_extension(filename: str) -> str:
    name = Path(filename).name
    suffix = Path(name).suffix.lower()

    if suffix in IMAGE_EXTENSIONS:
        return name[:-len(suffix)]

    return name


def remove_image_number(filename: str) -> str:
    value = remove_known_extension(filename)

    # Retire uniquement le numéro d'image final : #1, #2, etc.
    value = re.sub(
        r"\s*#\s*\d+\s*_?\s*$",
        "",
        value,
        flags=re.IGNORECASE,
    )

    return value.strip(" ._-\t")


def cleaned_tokens(
    value: Any,
    *,
    drop_optional_prefix: bool = False,
) -> list[str]:
    tokens = tokenize(remove_image_number(str(value or "")))
    tokens = [
        token
        for token in tokens
        if token not in IGNORED_WORDS
    ]

    if (
        drop_optional_prefix
        and tokens
        and tokens[0] in OPTIONAL_PREFIXES
    ):
        tokens = tokens[1:]

    return tokens


def cleaned_key(
    value: Any,
    *,
    drop_optional_prefix: bool = False,
) -> str:
    return "".join(
        cleaned_tokens(
            value,
            drop_optional_prefix=drop_optional_prefix,
        )
    )


def numeric_signature(value: Any) -> str:
    return "".join(
        token
        for token in cleaned_tokens(value)
        if token.isdigit()
    )


def leading_number(value: Any) -> str:
    for token in cleaned_tokens(
        value,
        drop_optional_prefix=True,
    ):
        if token.isdigit():
            return token

    return ""


def normalize_reference_for_filename(reference: str) -> str:
    value = strip_accents(reference).lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "sans-reference"


# =============================================================================
# CSV
# =============================================================================

def read_csv(
    path: Path,
) -> tuple[list[str], list[dict[str, str]]]:
    if not path.exists():
        raise FileNotFoundError(
            f"Fichier introuvable : {path.resolve()}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        reader = csv.DictReader(file)

        if not reader.fieldnames:
            raise ValueError(
                f"Le fichier {path} ne contient pas d'en-têtes."
            )

        return list(reader.fieldnames), list(reader)


def write_csv(
    path: Path,
    fieldnames: list[str],
    rows: list[dict[str, Any]],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(rows)


def parse_images(value: Any) -> list[str]:
    raw = str(value or "").strip()

    if not raw:
        return []

    try:
        parsed = json.loads(raw)

        if isinstance(parsed, list):
            return [
                str(item).strip()
                for item in parsed
                if str(item).strip()
            ]
    except json.JSONDecodeError:
        pass

    return [
        item.strip()
        for item in re.split(r"[|;]", raw)
        if item.strip()
    ]


# =============================================================================
# DÉTECTION DES IMAGES
# =============================================================================

def detect_image_extension(path: Path) -> str | None:
    try:
        with path.open("rb") as file:
            header = file.read(16)
    except OSError:
        return None

    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"

    if header.startswith(b"\xff\xd8\xff"):
        return ".jpg"

    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return ".webp"

    if header.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"

    return None


def collect_source_images(
    directory: Path,
) -> list[SourceImage]:
    images: list[SourceImage] = []

    for path in sorted(
        directory.rglob("*"),
        key=lambda item: str(item).lower(),
    ):
        if not path.is_file():
            continue

        extension = detect_image_extension(path)

        if extension is None:
            continue

        images.append(
            SourceImage(
                path=path,
                original_name=path.name,
                detected_extension=extension,
            )
        )

    return images


def open_images_source() -> tuple[
    Path,
    TemporaryDirectory[str] | None,
]:
    if (
        IMAGES_SOURCE_DIRECTORY.exists()
        and IMAGES_SOURCE_DIRECTORY.is_dir()
    ):
        return IMAGES_SOURCE_DIRECTORY, None

    if (
        IMAGES_SOURCE_ZIP.exists()
        and IMAGES_SOURCE_ZIP.is_file()
    ):
        temporary_directory = TemporaryDirectory(
            prefix="rim-cristal-images-gpt5-"
        )
        extraction_path = Path(temporary_directory.name)

        with zipfile.ZipFile(
            IMAGES_SOURCE_ZIP,
            "r",
        ) as archive:
            archive.extractall(extraction_path)

        return extraction_path, temporary_directory

    raise FileNotFoundError(
        "Aucune source d'images trouvée. "
        "Ajoute le dossier 'meubles' ou le fichier 'meubles.zip' "
        "à côté du script."
    )


def build_source_indexes(
    images: list[SourceImage],
) -> dict[str, dict[str, list[SourceImage]]]:
    indexes: dict[str, dict[str, list[SourceImage]]] = {
        "exact": defaultdict(list),
        "normalized_full": defaultdict(list),
        "normalized_without_number": defaultdict(list),
    }

    for image in images:
        indexes["exact"][
            image.original_name.lower()
        ].append(image)

        indexes["normalized_full"][
            normalize_text(image.original_name)
        ].append(image)

        indexes["normalized_without_number"][
            normalize_text(remove_image_number(image.original_name))
        ].append(image)

    return {
        name: dict(values)
        for name, values in indexes.items()
    }


def resolve_source_image(
    report_row: dict[str, str],
    indexes: dict[str, dict[str, list[SourceImage]]],
) -> SourceImage | None:
    original_name = str(
        report_row.get("original_name") or ""
    ).strip()

    detected_extension = str(
        report_row.get("detected_extension") or ""
    ).lower().strip()

    candidates = [original_name]

    if (
        Path(original_name).suffix.lower()
        not in IMAGE_EXTENSIONS
        and detected_extension
    ):
        candidates.append(
            f"{original_name}{detected_extension}"
        )

    # 1. Nom exact.
    for candidate in candidates:
        values = indexes["exact"].get(
            candidate.lower(),
            [],
        )

        if len(values) == 1:
            return values[0]

    # 2. Nom complet normalisé.
    for candidate in candidates:
        key = normalize_text(candidate)
        values = indexes["normalized_full"].get(
            key,
            [],
        )

        if len(values) == 1:
            return values[0]

    # 3. Nom sans #1/#2 normalisé.
    key = normalize_text(
        remove_image_number(original_name)
    )

    values = indexes[
        "normalized_without_number"
    ].get(key, [])

    if len(values) == 1:
        return values[0]

    # 4. Utilisation de l'extension réelle pour départager.
    if detected_extension and values:
        filtered = [
            image
            for image in values
            if image.detected_extension == detected_extension
        ]

        if len(filtered) == 1:
            return filtered[0]

    return None


# =============================================================================
# INDEX DES RÉFÉRENCES
# =============================================================================

def build_reference_indexes(
    rows: list[dict[str, str]],
) -> dict[str, dict[str, set[str]]]:
    indexes: dict[str, dict[str, set[str]]] = {
        "strict": defaultdict(set),
        "clean": defaultdict(set),
        "clean_without_prefix": defaultdict(set),
        "numeric": defaultdict(set),
        "leading": defaultdict(set),
    }

    for row in rows:
        reference = str(
            row.get(REFERENCE_COLUMN) or ""
        ).strip()

        if not reference or reference == "-":
            continue

        strict = normalize_text(reference)
        clean = cleaned_key(reference)
        clean_without_prefix = cleaned_key(
            reference,
            drop_optional_prefix=True,
        )
        numeric = numeric_signature(reference)
        first_number = leading_number(reference)

        if strict:
            indexes["strict"][strict].add(reference)

        if clean:
            indexes["clean"][clean].add(reference)

        if clean_without_prefix:
            indexes["clean_without_prefix"][
                clean_without_prefix
            ].add(reference)

        if numeric:
            indexes["numeric"][numeric].add(reference)

        if first_number:
            indexes["leading"][first_number].add(reference)

    return {
        name: dict(values)
        for name, values in indexes.items()
    }


def unique_reference(
    values: set[str] | None,
) -> str | None:
    if not values or len(values) != 1:
        return None

    return next(iter(values))


def decide_match(
    image_name: str,
    old_image_key: str,
    indexes: dict[str, dict[str, set[str]]],
) -> MatchDecision:
    meaningful_name = remove_image_number(image_name)

    strict = (
        normalize_text(meaningful_name)
        or normalize_text(old_image_key)
    )

    clean = (
        cleaned_key(meaningful_name)
        or cleaned_key(old_image_key)
    )

    clean_without_prefix = cleaned_key(
        meaningful_name,
        drop_optional_prefix=True,
    )

    numeric = (
        numeric_signature(meaningful_name)
        or numeric_signature(old_image_key)
    )

    first_number = (
        leading_number(meaningful_name)
        or leading_number(old_image_key)
    )

    reference = unique_reference(
        indexes["strict"].get(strict)
    )

    if reference:
        return MatchDecision(
            reference=reference,
            normalized_reference=normalize_text(reference),
            method="exact-normalise",
            score=100,
            image_key=clean,
        )

    reference = unique_reference(
        indexes["clean"].get(clean)
    )

    if reference:
        return MatchDecision(
            reference=reference,
            normalized_reference=normalize_text(reference),
            method="exact-sans-couleur",
            score=98,
            image_key=clean,
        )

    reference = unique_reference(
        indexes["clean_without_prefix"].get(
            clean_without_prefix
        )
    )

    if reference:
        return MatchDecision(
            reference=reference,
            normalized_reference=normalize_text(reference),
            method="exact-sans-prefixe",
            score=95,
            image_key=clean_without_prefix,
        )

    if len(numeric) >= 3:
        reference = unique_reference(
            indexes["numeric"].get(numeric)
        )

        if reference:
            return MatchDecision(
                reference=reference,
                normalized_reference=normalize_text(reference),
                method="signature-numerique",
                score=92,
                image_key=clean,
            )

    if len(first_number) >= 3:
        reference = unique_reference(
            indexes["leading"].get(first_number)
        )

        if reference:
            return MatchDecision(
                reference=reference,
                normalized_reference=normalize_text(reference),
                method="numero-principal-unique",
                score=88,
                image_key=clean,
            )

    # Candidats prudents.
    candidate_references: set[str] = set()

    if len(clean) >= 3:
        for reference_key, references in indexes["clean"].items():
            if len(reference_key) < 3:
                continue

            if (
                clean.startswith(reference_key)
                or reference_key.startswith(clean)
            ):
                candidate_references.update(references)

    if len(numeric) >= 3:
        candidate_references.update(
            indexes["numeric"].get(numeric, set())
        )

    if len(first_number) >= 3:
        candidate_references.update(
            indexes["leading"].get(first_number, set())
        )

    candidates = tuple(
        sorted(candidate_references)[:10]
    )

    method = (
        "ambigu"
        if len(candidate_references) > 1
        else "aucune-correspondance"
    )

    return MatchDecision(
        reference=None,
        normalized_reference=None,
        method=method,
        score=0,
        image_key=clean,
        candidates=candidates,
    )


# =============================================================================
# COPIE ET NOMMAGE
# =============================================================================

def prepare_destination() -> None:
    if (
        CLEAR_DESTINATION
        and DESTINATION_DIRECTORY.exists()
    ):
        shutil.rmtree(DESTINATION_DIRECTORY)

    DESTINATION_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )


def build_existing_filename_set() -> set[str]:
    if not DESTINATION_DIRECTORY.exists():
        return set()

    return {
        path.name.lower()
        for path in DESTINATION_DIRECTORY.iterdir()
        if path.is_file()
    }


def reserve_destination_filename(
    reference: str,
    extension: str,
    sequence_by_reference: dict[str, int],
    existing_names: set[str],
) -> str:
    safe_reference = normalize_reference_for_filename(
        reference
    )

    normalized_reference = normalize_text(reference)

    while True:
        sequence_by_reference[normalized_reference] += 1
        sequence = sequence_by_reference[normalized_reference]

        filename = (
            f"{safe_reference}-{sequence:03d}{extension}"
        )

        if filename.lower() not in existing_names:
            existing_names.add(filename.lower())
            return filename


def csv_image_path(filename: str) -> str:
    return (
        f"{CSV_IMAGE_PREFIX.rstrip('/')}/{filename}"
    )


# =============================================================================
# TRAITEMENT PRINCIPAL
# =============================================================================

def main() -> None:
    product_fields, products = read_csv(
        CSV_PRODUCTS_INPUT
    )

    unmatched_fields, unmatched_images = read_csv(
        CSV_UNMATCHED_INPUT
    )

    for column in (
        IMAGES_COLUMN,
        MAIN_IMAGE_COLUMN,
        IMAGE_COUNT_COLUMN,
    ):
        if column not in product_fields:
            product_fields.append(column)

    source_directory, temporary_directory = (
        open_images_source()
    )

    try:
        source_images = collect_source_images(
            source_directory
        )

        source_indexes = build_source_indexes(
            source_images
        )

        reference_indexes = build_reference_indexes(
            products
        )

        prepare_destination()

        existing_names = build_existing_filename_set()

        # On part du plus grand numéro déjà utilisé par référence.
        sequence_by_reference: dict[str, int] = defaultdict(int)

        for path in DESTINATION_DIRECTORY.iterdir():
            if not path.is_file():
                continue

            match = re.match(
                r"(.+)-(\d{3})\.[^.]+$",
                path.name,
                flags=re.IGNORECASE,
            )

            if not match:
                continue

            normalized_reference = normalize_text(
                match.group(1)
            )

            sequence_by_reference[
                normalized_reference
            ] = max(
                sequence_by_reference[
                    normalized_reference
                ],
                int(match.group(2)),
            )

        new_paths_by_reference: dict[
            str,
            list[str]
        ] = defaultdict(list)

        match_rows: list[dict[str, Any]] = []
        remaining_rows: list[dict[str, Any]] = []
        ambiguous_rows: list[dict[str, Any]] = []
        missing_source_rows: list[dict[str, Any]] = []

        copied_source_paths: set[str] = set()

        for report_row in unmatched_images:
            original_name = str(
                report_row.get("original_name") or ""
            ).strip()

            old_image_key = str(
                report_row.get("image_key") or ""
            ).strip()

            decision = decide_match(
                original_name,
                old_image_key,
                reference_indexes,
            )

            if (
                decision.reference is None
                or decision.normalized_reference is None
            ):
                enriched = {
                    **report_row,
                    "match_v2_reason": decision.method,
                    "match_v2_clean_key": decision.image_key,
                    "match_v2_candidates": json.dumps(
                        list(decision.candidates),
                        ensure_ascii=False,
                    ),
                }

                remaining_rows.append(enriched)

                if decision.method == "ambigu":
                    ambiguous_rows.append(enriched)

                continue

            source_image = resolve_source_image(
                report_row,
                source_indexes,
            )

            if source_image is None:
                missing_source_rows.append(
                    {
                        **report_row,
                        "matched_reference": decision.reference,
                        "match_method": decision.method,
                        "match_score": decision.score,
                        "reason": (
                            "Référence trouvée, mais image source "
                            "introuvable dans meubles/meubles.zip."
                        ),
                    }
                )

                remaining_rows.append(
                    {
                        **report_row,
                        "match_v2_reason": "image-source-introuvable",
                        "match_v2_clean_key": decision.image_key,
                        "match_v2_candidates": json.dumps(
                            [decision.reference],
                            ensure_ascii=False,
                        ),
                    }
                )

                continue

            source_identity = str(
                source_image.path.resolve()
            ).lower()

            # Évite de recopier deux fois exactement le même fichier source.
            if source_identity in copied_source_paths:
                continue

            copied_source_paths.add(source_identity)

            new_filename = reserve_destination_filename(
                decision.reference,
                source_image.detected_extension,
                sequence_by_reference,
                existing_names,
            )

            destination = (
                DESTINATION_DIRECTORY / new_filename
            )

            shutil.copy2(
                source_image.path,
                destination,
            )

            final_csv_path = csv_image_path(
                new_filename
            )

            new_paths_by_reference[
                decision.normalized_reference
            ].append(final_csv_path)

            match_rows.append(
                {
                    "original_name": original_name,
                    "detected_extension_report": (
                        report_row.get(
                            "detected_extension",
                            "",
                        )
                    ),
                    "detected_extension_real": (
                        source_image.detected_extension
                    ),
                    "matched_reference": decision.reference,
                    "normalized_reference": (
                        decision.normalized_reference
                    ),
                    "match_method": decision.method,
                    "match_score": decision.score,
                    "image_key": decision.image_key,
                    "source_file": str(source_image.path),
                    "renamed_file": new_filename,
                    "csv_path": final_csv_path,
                }
            )

        lines_enriched = 0
        references_enriched: set[str] = set()
        links_added = 0

        for product in products:
            reference = str(
                product.get(REFERENCE_COLUMN) or ""
            ).strip()

            normalized_reference = normalize_text(
                reference
            )

            existing_images = parse_images(
                product.get(IMAGES_COLUMN)
            )

            additions = new_paths_by_reference.get(
                normalized_reference,
                [],
            )

            merged_images = list(
                dict.fromkeys(
                    existing_images + additions
                )
            )

            added_count = (
                len(merged_images)
                - len(existing_images)
            )

            if added_count > 0:
                lines_enriched += 1
                references_enriched.add(
                    normalized_reference
                )
                links_added += added_count

            product[IMAGES_COLUMN] = json.dumps(
                merged_images,
                ensure_ascii=False,
            )

            product[MAIN_IMAGE_COLUMN] = (
                merged_images[0]
                if merged_images
                else ""
            )

            product[IMAGE_COUNT_COLUMN] = str(
                len(merged_images)
            )

        remaining_fields = list(unmatched_fields)

        for column in (
            "match_v2_reason",
            "match_v2_clean_key",
            "match_v2_candidates",
        ):
            if column not in remaining_fields:
                remaining_fields.append(column)

        write_csv(
            CSV_PRODUCTS_OUTPUT,
            product_fields,
            products,
        )

        write_csv(
            CSV_MATCH_REPORT,
            [
                "original_name",
                "detected_extension_report",
                "detected_extension_real",
                "matched_reference",
                "normalized_reference",
                "match_method",
                "match_score",
                "image_key",
                "source_file",
                "renamed_file",
                "csv_path",
            ],
            match_rows,
        )

        write_csv(
            CSV_UNMATCHED_OUTPUT,
            remaining_fields,
            remaining_rows,
        )

        write_csv(
            CSV_AMBIGUOUS_OUTPUT,
            remaining_fields,
            ambiguous_rows,
        )

        missing_source_fields = list(unmatched_fields)

        for column in (
            "matched_reference",
            "match_method",
            "match_score",
            "reason",
        ):
            if column not in missing_source_fields:
                missing_source_fields.append(column)

        write_csv(
            CSV_MISSING_SOURCE_OUTPUT,
            missing_source_fields,
            missing_source_rows,
        )

        products_with_images = sum(
            1
            for product in products
            if parse_images(product.get(IMAGES_COLUMN))
        )

        unique_references_with_images = {
            normalize_text(
                product.get(REFERENCE_COLUMN)
            )
            for product in products
            if (
                normalize_text(
                    product.get(REFERENCE_COLUMN)
                )
                and parse_images(
                    product.get(IMAGES_COLUMN)
                )
            )
        }

        print("Matching après GPT-5 terminé.")
        print(
            f"Images reçues depuis le reliquat     : "
            f"{len(unmatched_images)}"
        )
        print(
            f"Images sources détectées             : "
            f"{len(source_images)}"
        )
        print(
            f"Nouvelles images associées/copées    : "
            f"{len(match_rows)}"
        )
        print(
            f"Images encore non associées          : "
            f"{len(remaining_rows)}"
        )
        print(
            f"Images ambiguës                      : "
            f"{len(ambiguous_rows)}"
        )
        print(
            f"Images sources introuvables          : "
            f"{len(missing_source_rows)}"
        )
        print(
            f"Références enrichies                 : "
            f"{len(references_enriched)}"
        )
        print(
            f"Lignes produits enrichies            : "
            f"{lines_enriched}"
        )
        print(
            f"Liens d'images ajoutés               : "
            f"{links_added}"
        )
        print(
            f"Références totales avec images       : "
            f"{len(unique_references_with_images)}"
        )
        print(
            f"Lignes produits totales avec images  : "
            f"{products_with_images}/{len(products)}"
        )
        print()
        print(
            f"CSV final                            : "
            f"{CSV_PRODUCTS_OUTPUT}"
        )
        print(
            f"Images copiées                       : "
            f"{DESTINATION_DIRECTORY}"
        )
        print(
            f"Rapport des matchs                   : "
            f"{CSV_MATCH_REPORT}"
        )
        print(
            f"Reliquat final                       : "
            f"{CSV_UNMATCHED_OUTPUT}"
        )
        print(
            f"Cas ambigus                          : "
            f"{CSV_AMBIGUOUS_OUTPUT}"
        )
        print(
            f"Images sources introuvables          : "
            f"{CSV_MISSING_SOURCE_OUTPUT}"
        )

    finally:
        if temporary_directory is not None:
            temporary_directory.cleanup()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nTraitement interrompu.")
        raise SystemExit(130)
    except Exception as error:
        print(f"Erreur fatale : {error}")
        raise SystemExit(1)
