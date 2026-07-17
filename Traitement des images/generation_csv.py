from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any


# Dossier contenant les fichiers JSON générés par scan_images.py.
INPUT_DIRECTORY = Path("manifests")

# Dossier et fichiers de sortie.
OUTPUT_DIRECTORY = Path("output")
OUTPUT_CSV_FILE = OUTPUT_DIRECTORY / "consolidation-produits.csv"
ERROR_CSV_FILE = OUTPUT_DIRECTORY / "erreurs-consolidation.csv"

# Une ligne est créée pour chaque produit/variante présent dans products.
# Si une image ne contient aucun produit, une ligne est tout de même créée
# avec les champs produit vides afin de ne perdre aucune donnée d'analyse.
CSV_COLUMNS = [
    "source_json",
    "image_index",
    "product_index",
    "detected_product_type",
    "rubrique",
    "categorie",
    "famille",
    "description",
    "colors",
    "price_box_regions",
    "logo_regions",
    "warnings",
    "reference",
    "name",
    "size",
    "price",
    "confidence_reference",
    "confidence_price",
]

ERROR_COLUMNS = [
    "source_json",
    "error_type",
    "message",
]


def serialize_for_csv(value: Any) -> str:
    """Convertit proprement les listes et objets JSON en texte CSV."""
    if value is None:
        return ""

    if isinstance(value, (list, dict)):
        return json.dumps(
            value,
            ensure_ascii=False,
            separators=(",", ":"),
        )

    if isinstance(value, bool):
        return "true" if value else "false"

    return str(value)


def load_json(json_path: Path) -> dict[str, Any]:
    """Charge un manifeste JSON et vérifie que sa racine est un objet."""
    try:
        with json_path.open("r", encoding="utf-8-sig") as file:
            content = json.load(file)
    except json.JSONDecodeError as error:
        raise ValueError(
            f"JSON invalide à la ligne {error.lineno}, "
            f"colonne {error.colno} : {error.msg}"
        ) from error
    except OSError as error:
        raise ValueError(f"Impossible de lire le fichier : {error}") from error

    if not isinstance(content, dict):
        raise ValueError("La racine du fichier JSON doit être un objet.")

    return content


def build_row(
    *,
    source_json: str,
    image_index: int,
    product_index: int | None,
    image: dict[str, Any],
    product: dict[str, Any] | None,
) -> dict[str, str | int]:
    """Construit une ligne sans appliquer de filtre ni déduplication."""
    product = product or {}

    return {
        "source_json": source_json,
        "image_index": image_index,
        "product_index": "" if product_index is None else product_index,
        "detected_product_type": serialize_for_csv(
            image.get("detected_product_type")
        ),
        "rubrique": serialize_for_csv(image.get("rubrique")),
        "categorie": serialize_for_csv(image.get("categorie")),
        "famille": serialize_for_csv(image.get("famille")),
        "description": serialize_for_csv(image.get("description")),
        "colors": serialize_for_csv(image.get("colors")),
        "price_box_regions": serialize_for_csv(
            image.get("price_box_regions")
        ),
        "logo_regions": serialize_for_csv(image.get("logo_regions")),
        "warnings": serialize_for_csv(image.get("warnings")),
        "reference": serialize_for_csv(product.get("reference")),
        "name": serialize_for_csv(product.get("name")),
        "size": serialize_for_csv(product.get("size")),
        "price": serialize_for_csv(product.get("price")),
        "confidence_reference": serialize_for_csv(
            product.get("confidence_reference")
        ),
        "confidence_price": serialize_for_csv(
            product.get("confidence_price")
        ),
    }


def write_csv(
    output_path: Path,
    rows: list[dict[str, Any]],
    columns: list[str],
) -> None:
    """Écrit un CSV UTF-8 avec BOM, lisible directement dans Excel."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8-sig", newline="") as file:
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
    if not INPUT_DIRECTORY.exists():
        INPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
        raise FileNotFoundError(
            f"Le dossier {INPUT_DIRECTORY.resolve()} a été créé. "
            "Ajoute les fichiers JSON puis relance le script."
        )

    json_files = sorted(
        INPUT_DIRECTORY.glob("*.json"),
        key=lambda path: path.name.lower(),
    )

    if not json_files:
        raise FileNotFoundError(
            f"Aucun fichier JSON trouvé dans {INPUT_DIRECTORY.resolve()}."
        )

    rows: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    json_success_count = 0
    image_count = 0
    product_count = 0

    for json_path in json_files:
        try:
            manifest = load_json(json_path)
        except ValueError as error:
            errors.append(
                {
                    "source_json": json_path.name,
                    "error_type": "invalid_json",
                    "message": str(error),
                }
            )
            continue

        images = manifest.get("images")

        if not isinstance(images, list):
            errors.append(
                {
                    "source_json": json_path.name,
                    "error_type": "invalid_images_field",
                    "message": (
                        "Le champ 'images' est absent ou n'est pas un tableau."
                    ),
                }
            )
            continue

        json_success_count += 1

        for image_index, image in enumerate(images, start=1):
            if not isinstance(image, dict):
                errors.append(
                    {
                        "source_json": json_path.name,
                        "error_type": "invalid_image_item",
                        "message": (
                            f"L'élément images[{image_index - 1}] "
                            "n'est pas un objet JSON."
                        ),
                    }
                )
                continue

            image_count += 1
            products = image.get("products")

            if not isinstance(products, list):
                errors.append(
                    {
                        "source_json": json_path.name,
                        "error_type": "invalid_products_field",
                        "message": (
                            f"Le champ 'products' de l'image {image_index} "
                            "est absent ou n'est pas un tableau."
                        ),
                    }
                )
                products = []

            valid_products = [
                product for product in products if isinstance(product, dict)
            ]

            invalid_product_count = len(products) - len(valid_products)
            if invalid_product_count:
                errors.append(
                    {
                        "source_json": json_path.name,
                        "error_type": "invalid_product_item",
                        "message": (
                            f"{invalid_product_count} produit(s) de l'image "
                            f"{image_index} ne sont pas des objets JSON."
                        ),
                    }
                )

            if not valid_products:
                rows.append(
                    build_row(
                        source_json=json_path.name,
                        image_index=image_index,
                        product_index=None,
                        image=image,
                        product=None,
                    )
                )
                continue

            for product_index, product in enumerate(valid_products, start=1):
                rows.append(
                    build_row(
                        source_json=json_path.name,
                        image_index=image_index,
                        product_index=product_index,
                        image=image,
                        product=product,
                    )
                )
                product_count += 1

    write_csv(OUTPUT_CSV_FILE, rows, CSV_COLUMNS)
    write_csv(ERROR_CSV_FILE, errors, ERROR_COLUMNS)

    print(f"Fichiers JSON trouvés : {len(json_files)}")
    print(f"Fichiers JSON lus avec succès : {json_success_count}")
    print(f"Images consolidées : {image_count}")
    print(f"Produits/variantes consolidés : {product_count}")
    print(f"Lignes écrites dans le CSV : {len(rows)}")
    print(f"Erreurs techniques : {len(errors)}")
    print(f"CSV consolidé : {OUTPUT_CSV_FILE.resolve()}")
    print(f"Rapport d'erreurs : {ERROR_CSV_FILE.resolve()}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Erreur : {error}")
        raise SystemExit(1)
