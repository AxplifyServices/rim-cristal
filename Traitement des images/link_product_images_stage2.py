from __future__ import annotations

import csv
import json
import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

# =============================================================================
# CONFIGURATION
# =============================================================================
# CSV issu de la première passe. Le script ne le modifie jamais.
CSV_PRODUCTS_INPUT = Path(
    "output/reference-rescan-gpt5/"
    "consolidation-produits-references-gpt5.csv"
)
# Rapport créé par la première passe.
CSV_UNMATCHED_INPUT = Path("output/images-non-associees.csv")

# Les images doivent déjà être présentes ici, avec leur vraie extension.
IMAGES_DIRECTORY = Path("backend/uploads/products")

# Préfixe enregistré dans le CSV. Adapter à "/uploads/products" si le backend
# expose les fichiers avec cette URL publique.
CSV_IMAGE_PREFIX = "backend/uploads/products"

# Sorties de cette deuxième passe.
CSV_PRODUCTS_OUTPUT = Path(
    "output/consolidation-produits-avec-images-2.csv"
)

CSV_MATCH_REPORT = Path(
    "output/rapport-match-images-apres-gpt5.csv"
)

CSV_UNMATCHED_OUTPUT = Path(
    "output/images-non-associees-apres-gpt5.csv"
)

CSV_CANDIDATES_REPORT = Path(
    "output/candidats-images-apres-gpt5.csv"
)

CSV_MISSING_FILES_REPORT = Path(
    "output/images-fichiers-introuvables-apres-gpt5.csv"
)

REFERENCE_COLUMN = "reference"
IMAGES_COLUMN = "images"
MAIN_IMAGE_COLUMN = "main_image"
IMAGE_COUNT_COLUMN = "image_count"

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

# Mots décoratifs ignorés pour la deuxième passe. Ils ne doivent pas servir à
# identifier une référence produit.
IGNORED_WORDS = {
    # Couleurs FR/EN + abréviations fréquentes
    "beige", "bej", "be", "bk", "black", "noir", "blanc", "white", "wh",
    "grey", "gray", "gris", "gr", "green", "vert", "blue", "bleu", "red",
    "rouge", "yellow", "jaune", "purple", "violet", "pink", "rose", "brown",
    "marron", "orange", "gold", "golden", "dore", "silver", "argente",
    "transparent", "clear", "multicolor", "multicolore",
    # Mots de liaison rencontrés dans les variantes de couleur
    "and", "et", "with", "avec", "or",
    # Descripteurs non structurels
    "color", "colour", "couleur", "cm", "mm", "led",
}

# Préfixes isolés souvent ajoutés par le graphiste. Ils sont ignorés uniquement
# lorsque la comparaison stricte échoue. Une référence officielle contenant ce
# préfixe reste donc prioritaire.
OPTIONAL_PREFIXES = {"b", "d", "p", "r", "rt", "s", "sr", "t", "c", "l"}


@dataclass(frozen=True)
class MatchDecision:
    reference: str | None
    normalized_reference: str | None
    method: str
    score: int
    image_key_clean: str
    candidates: tuple[str, ...] = ()


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(value))
    return "".join(c for c in normalized if not unicodedata.combining(c))


def normalize_text(value: str) -> str:
    value = strip_accents(value).lower().strip()
    value = value.replace("×", "x")
    return re.sub(r"[^a-z0-9]+", "", value)


def tokenize(value: str) -> list[str]:
    value = strip_accents(value).lower().replace("×", "x")
    return re.findall(r"[a-z]+|\d+", value)


def remove_known_extension(name: str) -> str:
    path = Path(name)
    if path.suffix.lower() in IMAGE_EXTENSIONS:
        return name[: -len(path.suffix)]
    return name


def remove_image_number(name: str) -> str:
    """Retire #1, #2... à la fin sans supprimer les variantes produit."""
    value = remove_known_extension(Path(name).name)
    value = re.sub(r"\s*#\s*\d+\s*_?\s*$", "", value, flags=re.IGNORECASE)
    return value.strip(" ._-\t")


def cleaned_tokens(value: str, drop_optional_prefix: bool = False) -> list[str]:
    tokens = tokenize(remove_image_number(value))
    tokens = [token for token in tokens if token not in IGNORED_WORDS]
    if drop_optional_prefix and tokens and tokens[0] in OPTIONAL_PREFIXES:
        tokens = tokens[1:]
    return tokens


def cleaned_key(value: str, drop_optional_prefix: bool = False) -> str:
    return "".join(cleaned_tokens(value, drop_optional_prefix))


def numeric_signature(value: str) -> str:
    """Concatène tous les groupes numériques après retrait des mots ignorés."""
    return "".join(token for token in cleaned_tokens(value) if token.isdigit())


def leading_number(value: str) -> str:
    for token in cleaned_tokens(value, drop_optional_prefix=True):
        if token.isdigit():
            return token
    return ""


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    if not path.exists():
        raise FileNotFoundError(f"Fichier introuvable : {path}")
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        if not reader.fieldnames:
            raise ValueError(f"Le CSV {path} ne contient pas d'en-têtes.")
        return list(reader.fieldnames), list(reader)


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def build_reference_indexes(rows: list[dict[str, str]]) -> dict[str, dict[str, set[str]]]:
    indexes: dict[str, dict[str, set[str]]] = {
        "strict": defaultdict(set),
        "clean": defaultdict(set),
        "clean_without_prefix": defaultdict(set),
        "numeric": defaultdict(set),
        "leading": defaultdict(set),
    }

    for row in rows:
        reference = (row.get(REFERENCE_COLUMN) or "").strip()
        if not reference or reference == "-":
            continue

        strict = normalize_text(reference)
        clean = cleaned_key(reference)
        clean_without_prefix = cleaned_key(reference, drop_optional_prefix=True)
        numeric = numeric_signature(reference)
        first_number = leading_number(reference)

        if strict:
            indexes["strict"][strict].add(reference)
        if clean:
            indexes["clean"][clean].add(reference)
        if clean_without_prefix:
            indexes["clean_without_prefix"][clean_without_prefix].add(reference)
        if numeric:
            indexes["numeric"][numeric].add(reference)
        if first_number:
            indexes["leading"][first_number].add(reference)

    return {name: dict(values) for name, values in indexes.items()}


def unique_reference(values: set[str] | None) -> str | None:
    if not values or len(values) != 1:
        return None
    return next(iter(values))


def normalized_reference(reference: str) -> str:
    return normalize_text(reference)


def decide_match(image_name: str, image_key_from_report: str, indexes: dict[str, dict[str, set[str]]]) -> MatchDecision:
    # Utiliser le nom original en priorité : il contient plus d'information.
    strict_key = normalize_text(remove_image_number(image_name)) or normalize_text(image_key_from_report)
    clean = cleaned_key(image_name) or cleaned_key(image_key_from_report)
    clean_without_prefix = cleaned_key(image_name, drop_optional_prefix=True)
    numeric = numeric_signature(image_name) or numeric_signature(image_key_from_report)
    first_number = leading_number(image_name) or leading_number(image_key_from_report)

    # 1) Même valeur après normalisation stricte.
    ref = unique_reference(indexes["strict"].get(strict_key))
    if ref:
        return MatchDecision(ref, normalized_reference(ref), "exact-normalise", 100, clean)

    # 2) Même valeur après retrait des couleurs et mots décoratifs.
    ref = unique_reference(indexes["clean"].get(clean))
    if ref:
        return MatchDecision(ref, normalized_reference(ref), "exact-sans-couleur", 98, clean)

    # 3) Même valeur après retrait d'un préfixe isolé décoratif.
    ref = unique_reference(indexes["clean_without_prefix"].get(clean_without_prefix))
    if ref:
        return MatchDecision(ref, normalized_reference(ref), "exact-sans-prefixe", 95, clean_without_prefix)

    # 4) Signature numérique exacte. Acceptée seulement si elle désigne une
    # seule référence dans le CSV et contient au moins 3 chiffres.
    if len(numeric) >= 3:
        ref = unique_reference(indexes["numeric"].get(numeric))
        if ref:
            return MatchDecision(ref, normalized_reference(ref), "signature-numerique", 92, clean)

    # 5) Premier groupe numérique exact. Plus permissif, mais toujours unique.
    if len(first_number) >= 3:
        ref = unique_reference(indexes["leading"].get(first_number))
        if ref:
            return MatchDecision(ref, normalized_reference(ref), "numero-principal-unique", 88, clean)

    # Génération de candidats pour contrôle manuel, sans forcer le match.
    candidate_refs: set[str] = set()
    for key in (clean, clean_without_prefix):
        if not key:
            continue
        for ref_key, references in indexes["clean"].items():
            if key.startswith(ref_key) or ref_key.startswith(key):
                candidate_refs.update(references)

    if numeric:
        candidate_refs.update(indexes["numeric"].get(numeric, set()))
    if first_number:
        candidate_refs.update(indexes["leading"].get(first_number, set()))

    candidates = tuple(sorted(candidate_refs)[:10])
    method = "ambigu" if len(candidate_refs) > 1 else "aucune-correspondance"
    return MatchDecision(None, None, method, 0, clean, candidates)


def build_image_file_index(directory: Path) -> tuple[dict[str, list[Path]], dict[str, list[Path]]]:
    if not directory.exists():
        raise FileNotFoundError(f"Dossier d'images introuvable : {directory}")

    exact_names: dict[str, list[Path]] = defaultdict(list)
    normalized_names: dict[str, list[Path]] = defaultdict(list)

    for path in directory.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        exact_names[path.name.lower()].append(path)
        normalized_names[normalize_text(remove_image_number(path.name))].append(path)

    return dict(exact_names), dict(normalized_names)


def resolve_existing_image(
    original_name: str,
    detected_extension: str,
    exact_names: dict[str, list[Path]],
    normalized_names: dict[str, list[Path]],
) -> Path | None:
    original = Path(original_name).name
    extension = detected_extension.lower().strip()

    candidates = [original]
    if Path(original).suffix.lower() not in IMAGE_EXTENSIONS and extension:
        candidates.append(f"{original}{extension}")

    for candidate in candidates:
        paths = exact_names.get(candidate.lower(), [])
        if len(paths) == 1:
            return paths[0]

    key = normalize_text(remove_image_number(original))
    paths = normalized_names.get(key, [])
    if len(paths) == 1:
        return paths[0]

    # Dernier essai avec la vraie extension pour départager plusieurs fichiers.
    if extension and paths:
        filtered = [path for path in paths if path.suffix.lower() == extension]
        if len(filtered) == 1:
            return filtered[0]

    return None


def parse_images(value: str | None) -> list[str]:
    if not value:
        return []
    raw = str(value).strip()
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()]
    except json.JSONDecodeError:
        pass
    # Compatibilité avec d'anciens CSV séparés par | ou ;
    return [item.strip() for item in re.split(r"[|;]", raw) if item.strip()]


def csv_image_path(path: Path) -> str:
    return f"{CSV_IMAGE_PREFIX.rstrip('/')}/{path.name}"


def main() -> None:
    product_fields, products = read_csv(CSV_PRODUCTS_INPUT)
    _, unmatched_images = read_csv(CSV_UNMATCHED_INPUT)

    for column in (IMAGES_COLUMN, MAIN_IMAGE_COLUMN, IMAGE_COUNT_COLUMN):
        if column not in product_fields:
            product_fields.append(column)

    indexes = build_reference_indexes(products)
    exact_file_index, normalized_file_index = build_image_file_index(IMAGES_DIRECTORY)

    # Les nouvelles images sont regroupées par référence normalisée.
    new_images_by_reference: dict[str, list[str]] = defaultdict(list)
    match_rows: list[dict[str, object]] = []
    remaining_rows: list[dict[str, object]] = []
    candidate_rows: list[dict[str, object]] = []
    missing_file_rows: list[dict[str, object]] = []

    for row in unmatched_images:
        original_name = (row.get("original_name") or "").strip()
        detected_extension = (row.get("detected_extension") or "").strip()
        old_image_key = (row.get("image_key") or "").strip()

        decision = decide_match(original_name, old_image_key, indexes)
        if decision.reference is None or decision.normalized_reference is None:
            remaining_rows.append({
                **row,
                "stage2_reason": decision.method,
                "stage2_clean_key": decision.image_key_clean,
                "stage2_candidates": json.dumps(list(decision.candidates), ensure_ascii=False),
            })
            candidate_rows.append({
                "original_name": original_name,
                "image_key": old_image_key,
                "clean_key": decision.image_key_clean,
                "candidate_count": len(decision.candidates),
                "candidates": json.dumps(list(decision.candidates), ensure_ascii=False),
                "reason": decision.method,
            })
            continue

        image_path = resolve_existing_image(
            original_name,
            detected_extension,
            exact_file_index,
            normalized_file_index,
        )
        if image_path is None:
            missing_file_rows.append({
                "original_name": original_name,
                "detected_extension": detected_extension,
                "matched_reference": decision.reference,
                "match_method": decision.method,
                "reason": "Correspondance produit trouvée, mais fichier image introuvable dans le dossier destination",
            })
            remaining_rows.append({
                **row,
                "stage2_reason": "fichier-image-introuvable",
                "stage2_clean_key": decision.image_key_clean,
                "stage2_candidates": json.dumps([decision.reference], ensure_ascii=False),
            })
            continue

        image_csv_path = csv_image_path(image_path)
        if image_csv_path not in new_images_by_reference[decision.normalized_reference]:
            new_images_by_reference[decision.normalized_reference].append(image_csv_path)

        match_rows.append({
            "original_name": original_name,
            "detected_extension": detected_extension,
            "matched_reference": decision.reference,
            "normalized_reference": decision.normalized_reference,
            "match_method": decision.method,
            "match_score": decision.score,
            "clean_key": decision.image_key_clean,
            "existing_file": image_path.name,
            "csv_path": image_csv_path,
        })

    lines_updated = 0
    references_updated: set[str] = set()
    images_added_total = 0

    for product in products:
        reference = (product.get(REFERENCE_COLUMN) or "").strip()
        ref_key = normalize_text(reference)
        additions = new_images_by_reference.get(ref_key, [])

        current_images = parse_images(product.get(IMAGES_COLUMN))
        merged_images = list(dict.fromkeys(current_images + additions))

        added_count = len(merged_images) - len(current_images)
        if added_count > 0:
            lines_updated += 1
            references_updated.add(ref_key)
            images_added_total += added_count

        product[IMAGES_COLUMN] = json.dumps(merged_images, ensure_ascii=False)
        product[MAIN_IMAGE_COLUMN] = merged_images[0] if merged_images else ""
        product[IMAGE_COUNT_COLUMN] = str(len(merged_images))

    match_fields = [
        "original_name", "detected_extension", "matched_reference",
        "normalized_reference", "match_method", "match_score", "clean_key",
        "existing_file", "csv_path",
    ]
    remaining_fields = list(unmatched_images[0].keys()) if unmatched_images else [
        "original_name", "detected_extension", "image_key", "reason"
    ]
    for column in ("stage2_reason", "stage2_clean_key", "stage2_candidates"):
        if column not in remaining_fields:
            remaining_fields.append(column)

    write_csv(CSV_PRODUCTS_OUTPUT, product_fields, products)
    write_csv(CSV_MATCH_REPORT, match_fields, match_rows)
    write_csv(CSV_UNMATCHED_OUTPUT, remaining_fields, remaining_rows)
    write_csv(
        CSV_CANDIDATES_REPORT,
        ["original_name", "image_key", "clean_key", "candidate_count", "candidates", "reason"],
        candidate_rows,
    )
    write_csv(
        CSV_MISSING_FILES_REPORT,
        ["original_name", "detected_extension", "matched_reference", "match_method", "reason"],
        missing_file_rows,
    )

    print("Deuxième passe terminée.")
    print(f"Images reçues depuis le rapport       : {len(unmatched_images)}")
    print(f"Images associées en deuxième passe    : {len(match_rows)}")
    print(f"Images encore non associées           : {len(remaining_rows)}")
    print(f"Fichiers image introuvables           : {len(missing_file_rows)}")
    print(f"Références enrichies                  : {len(references_updated)}")
    print(f"Lignes produits enrichies             : {lines_updated}")
    print(f"Liens d'images ajoutés aux lignes     : {images_added_total}")
    print()
    print(f"CSV produits                           : {CSV_PRODUCTS_OUTPUT}")
    print(f"Rapport des matchs                     : {CSV_MATCH_REPORT}")
    print(f"Reliquat                               : {CSV_UNMATCHED_OUTPUT}")
    print(f"Candidats à contrôler                  : {CSV_CANDIDATES_REPORT}")
    print(f"Fichiers introuvables                  : {CSV_MISSING_FILES_REPORT}")


if __name__ == "__main__":
    main()
