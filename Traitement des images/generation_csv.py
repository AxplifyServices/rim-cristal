from __future__ import annotations

import csv
import json
import re
import unicodedata
from pathlib import Path
from typing import Any


INPUT_DIRECTORY = Path("manifests")
OUTPUT_DIRECTORY = Path("output")

# Valeur enregistrée dans url_image1.
# Alternative souvent préférable pour le frontend :
# IMAGE_DATABASE_PREFIX = "/uploads/products/"
IMAGE_DATABASE_PREFIX = "backend/uploads/products/"

MIN_REFERENCE_CONFIDENCE = 0.80
MIN_PRICE_CONFIDENCE = 0.80

CSV_COLUMNS = [
    "id",
    "name",
    "slug",
    "reference",
    "marque",
    "rubrique",
    "categorie",
    "famille",
    "description",
    "url_image1",
    "url_image2",
    "url_image3",
    "url_image4",
    "url_image5",
    "price",
    "colors",
    "sizes",
    "stock",
    "weight",
    "badge",
    "is_active",
    "is_featured",
    "is_new",
    "is_bestseller",
    "rating",
    "reviews_count",
    "created_at",
    "updated_at",
    "category_id",
    "subcategory_id",
    "care_instructions",
    "origin_country",
    "collection_name",
    "seo_title",
    "seo_description",
    "price_wholesale",
    "wholesale_min_qty",
    "is_available_on_site",
]

ANOMALY_COLUMNS = [
    "json_file",
    "source_file",
    "cleaned_file",
    "reference",
    "name",
    "field",
    "reason",
]


def remove_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(
        character
        for character in normalized
        if unicodedata.category(character) != "Mn"
    )


def create_slug_base(value: str) -> str:
    slug = remove_accents(str(value or "")).lower()

    # Les séparateurs de dimensions deviennent des tirets.
    slug = re.sub(r"[×x/\\]+", "-", slug)

    # Suppression des apostrophes.
    slug = slug.replace("'", "").replace("’", "")

    # Remplacement des autres caractères spéciaux.
    slug = re.sub(r"[^a-z0-9]+", "-", slug)

    # Nettoyage des tirets.
    slug = re.sub(r"-{2,}", "-", slug).strip("-")

    return slug or "produit"


def create_unique_slug(name: str, used_slugs: set[str]) -> str:
    base_slug = create_slug_base(name)
    slug = base_slug
    suffix = 2

    while slug in used_slugs:
        slug = f"{base_slug}-{suffix}"
        suffix += 1

    used_slugs.add(slug)
    return slug


def normalize_reference(value: Any) -> str:
    reference = str(value or "").strip()
    return re.sub(r"\s+", " ", reference)


def create_image_path(cleaned_file: str) -> str:
    # On retire les éventuels dossiers accidentellement présents.
    filename = Path(cleaned_file.replace("\\", "/")).name.strip()

    if not filename:
        return ""

    prefix = IMAGE_DATABASE_PREFIX.replace("\\", "/").rstrip("/")
    return f"{prefix}/{filename}"


def has_file_extension(filename: str) -> bool:
    return bool(re.search(r"\.[a-zA-Z0-9]{2,5}$", filename))


def is_valid_price(value: Any) -> bool:
    if isinstance(value, bool):
        return False

    return (
        isinstance(value, (int, float))
        and value > 0
    )


def json_for_csv(value: Any) -> str:
    """
    Transforme une liste Python en JSON UTF-8.

    Exemple :
    ["Doré", "Bleu"]
    """
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
    )


def boolean_for_csv(value: bool) -> str:
    return "true" if value else "false"


def add_anomaly(
    anomalies: list[dict[str, Any]],
    *,
    json_file: str = "",
    source_file: str = "",
    cleaned_file: str = "",
    reference: str = "",
    name: str = "",
    field: str = "",
    reason: str = "",
) -> None:
    anomalies.append(
        {
            "json_file": json_file,
            "source_file": source_file,
            "cleaned_file": cleaned_file,
            "reference": reference,
            "name": name,
            "field": field,
            "reason": reason,
        }
    )


def load_manifest(json_path: Path) -> dict[str, Any] | None:
    try:
        with json_path.open("r", encoding="utf-8-sig") as file:
            content = json.load(file)
    except json.JSONDecodeError as error:
        raise ValueError(
            f"JSON invalide à la ligne {error.lineno}, "
            f"colonne {error.colno} : {error.msg}"
        ) from error
    except OSError as error:
        raise ValueError(
            f"Impossible de lire le fichier : {error}"
        ) from error

    if not isinstance(content, dict):
        raise ValueError(
            "La racine du manifeste doit être un objet JSON."
        )

    return content


def build_product_row(
    *,
    product_id: int,
    image: dict[str, Any],
    product: dict[str, Any],
    slug: str,
    image_path: str,
) -> dict[str, Any]:
    size = str(product.get("size") or "").strip()

    colors = image.get("colors")
    if not isinstance(colors, list):
        colors = []

    return {
        "id": product_id,
        "name": str(product.get("name") or "").strip(),
        "slug": slug,
        "reference": normalize_reference(product.get("reference")),
        "marque": "",
        "rubrique": str(image.get("rubrique") or "").strip(),
        "categorie": str(image.get("categorie") or "").strip(),
        "famille": str(image.get("famille") or "").strip(),
        "description": str(image.get("description") or "").strip(),
        "url_image1": image_path,
        "url_image2": "",
        "url_image3": "",
        "url_image4": "",
        "url_image5": "",
        "price": f"{float(product['price']):.2f}",
        "colors": json_for_csv(colors),
        "sizes": json_for_csv([size] if size else []),
        "stock": 0,
        "weight": "",
        "badge": "",
        "is_active": boolean_for_csv(True),
        "is_featured": boolean_for_csv(False),
        "is_new": boolean_for_csv(False),
        "is_bestseller": boolean_for_csv(False),
        "rating": 0,
        "reviews_count": 0,
        "created_at": "",
        "updated_at": "",
        "category_id": "",
        "subcategory_id": "",
        "care_instructions": "",
        "origin_country": "Chine",
        "collection_name": "",
        "seo_title": "",
        "seo_description": "",
        "price_wholesale": "",
        "wholesale_min_qty": "",
        "is_available_on_site": boolean_for_csv(True),
    }


def write_csv(
    output_path: Path,
    rows: list[dict[str, Any]],
    columns: list[str],
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # utf-8-sig ajoute un BOM, utile pour Excel.
    with output_path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=columns,
            delimiter=",",
            quoting=csv.QUOTE_MINIMAL,
            extrasaction="ignore",
        )

        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)

    if not INPUT_DIRECTORY.exists():
        INPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
        raise FileNotFoundError(
            f"Le dossier {INPUT_DIRECTORY.resolve()} a été créé. "
            "Ajoutez-y vos fichiers JSON puis relancez le script."
        )

    json_files = sorted(
        INPUT_DIRECTORY.glob("*.json"),
        key=lambda path: path.name.lower(),
    )

    if not json_files:
        raise FileNotFoundError(
            f"Aucun fichier JSON trouvé dans "
            f"{INPUT_DIRECTORY.resolve()}."
        )

    product_rows: list[dict[str, Any]] = []
    anomalies: list[dict[str, Any]] = []

    used_slugs: set[str] = set()
    used_references: dict[str, str] = {}

    next_id = 1

    for json_path in json_files:
        json_filename = json_path.name

        try:
            manifest = load_manifest(json_path)
        except ValueError as error:
            add_anomaly(
                anomalies,
                json_file=json_filename,
                field="json",
                reason=str(error),
            )
            continue

        images = manifest.get("images")

        if not isinstance(images, list):
            add_anomaly(
                anomalies,
                json_file=json_filename,
                field="images",
                reason=(
                    "Le champ images est absent "
                    "ou n'est pas un tableau."
                ),
            )
            continue

        for image in images:
            if not isinstance(image, dict):
                add_anomaly(
                    anomalies,
                    json_file=json_filename,
                    field="image",
                    reason=(
                        "Un élément de images "
                        "n'est pas un objet JSON."
                    ),
                )
                continue

            source_file = str(
                image.get("source_file") or ""
            ).strip()

            cleaned_file = str(
                image.get("cleaned_file") or ""
            ).strip()

            if not cleaned_file:
                add_anomaly(
                    anomalies,
                    json_file=json_filename,
                    source_file=source_file,
                    field="cleaned_file",
                    reason="Nom du fichier nettoyé absent.",
                )
                continue

            if not has_file_extension(cleaned_file):
                add_anomaly(
                    anomalies,
                    json_file=json_filename,
                    source_file=source_file,
                    cleaned_file=cleaned_file,
                    field="cleaned_file",
                    reason=(
                        "Le fichier nettoyé ne possède "
                        "pas d'extension valide."
                    ),
                )
                continue

            products = image.get("products")

            if not isinstance(products, list):
                add_anomaly(
                    anomalies,
                    json_file=json_filename,
                    source_file=source_file,
                    cleaned_file=cleaned_file,
                    field="products",
                    reason=(
                        "Le champ products est absent "
                        "ou n'est pas un tableau."
                    ),
                )
                continue

            image_path = create_image_path(cleaned_file)

            for product in products:
                if not isinstance(product, dict):
                    add_anomaly(
                        anomalies,
                        json_file=json_filename,
                        source_file=source_file,
                        cleaned_file=cleaned_file,
                        field="product",
                        reason=(
                            "Une variante n'est pas "
                            "un objet JSON."
                        ),
                    )
                    continue

                reference = normalize_reference(
                    product.get("reference")
                )

                name = str(
                    product.get("name") or ""
                ).strip()

                price = product.get("price")

                if not reference:
                    add_anomaly(
                        anomalies,
                        json_file=json_filename,
                        source_file=source_file,
                        cleaned_file=cleaned_file,
                        name=name,
                        field="reference",
                        reason="Référence absente.",
                    )
                    continue

                if not name:
                    add_anomaly(
                        anomalies,
                        json_file=json_filename,
                        source_file=source_file,
                        cleaned_file=cleaned_file,
                        reference=reference,
                        field="name",
                        reason="Nom du produit absent.",
                    )
                    continue

                if not is_valid_price(price):
                    add_anomaly(
                        anomalies,
                        json_file=json_filename,
                        source_file=source_file,
                        cleaned_file=cleaned_file,
                        reference=reference,
                        name=name,
                        field="price",
                        reason=(
                            "Prix absent, invalide "
                            "ou inférieur ou égal à zéro."
                        ),
                    )
                    continue

                reference_confidence = product.get(
                    "confidence_reference"
                )

                if (
                    isinstance(reference_confidence, (int, float))
                    and not isinstance(reference_confidence, bool)
                    and reference_confidence
                    < MIN_REFERENCE_CONFIDENCE
                ):
                    add_anomaly(
                        anomalies,
                        json_file=json_filename,
                        source_file=source_file,
                        cleaned_file=cleaned_file,
                        reference=reference,
                        name=name,
                        field="confidence_reference",
                        reason=(
                            "Confiance référence insuffisante : "
                            f"{reference_confidence}"
                        ),
                    )
                    continue

                price_confidence = product.get(
                    "confidence_price"
                )

                if (
                    isinstance(price_confidence, (int, float))
                    and not isinstance(price_confidence, bool)
                    and price_confidence
                    < MIN_PRICE_CONFIDENCE
                ):
                    add_anomaly(
                        anomalies,
                        json_file=json_filename,
                        source_file=source_file,
                        cleaned_file=cleaned_file,
                        reference=reference,
                        name=name,
                        field="confidence_price",
                        reason=(
                            "Confiance prix insuffisante : "
                            f"{price_confidence}"
                        ),
                    )
                    continue

                if reference in used_references:
                    add_anomaly(
                        anomalies,
                        json_file=json_filename,
                        source_file=source_file,
                        cleaned_file=cleaned_file,
                        reference=reference,
                        name=name,
                        field="reference",
                        reason=(
                            "Référence dupliquée. "
                            "Première occurrence : "
                            f"{used_references[reference]}"
                        ),
                    )
                    continue

                used_references[reference] = (
                    f"{json_filename} / "
                    f"{source_file or cleaned_file}"
                )

                slug = create_unique_slug(
                    name,
                    used_slugs,
                )

                product_rows.append(
                    build_product_row(
                        product_id=next_id,
                        image=image,
                        product=product,
                        slug=slug,
                        image_path=image_path,
                    )
                )

                next_id += 1

            warnings = image.get("warnings")

            if isinstance(warnings, list):
                for warning in warnings:
                    if not warning:
                        continue

                    add_anomaly(
                        anomalies,
                        json_file=json_filename,
                        source_file=source_file,
                        cleaned_file=cleaned_file,
                        field="warning",
                        reason=str(warning),
                    )

    products_output = OUTPUT_DIRECTORY / "produits.csv"
    anomalies_output = (
        OUTPUT_DIRECTORY / "rapport-anomalies.csv"
    )

    write_csv(
        products_output,
        product_rows,
        CSV_COLUMNS,
    )

    write_csv(
        anomalies_output,
        anomalies,
        ANOMALY_COLUMNS,
    )

    print(f"{len(product_rows)} produit(s) exporté(s).")
    print(
        f"{len(anomalies)} anomalie(s) "
        "ou avertissement(s)."
    )
    print(f"Produits : {products_output.resolve()}")
    print(f"Rapport : {anomalies_output.resolve()}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Erreur : {error}")
        raise SystemExit(1)
