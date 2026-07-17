from __future__ import annotations

import base64
import json
import logging
import mimetypes
import os
import re
import shutil
import time
import unicodedata
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from openai import (
    APIConnectionError,
    APITimeoutError,
    OpenAI,
    RateLimitError,
)
from pydantic import BaseModel, ConfigDict, Field, ValidationError


# ============================================================
# Chargement de la configuration
# ============================================================

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")
MODEL = os.getenv("OPENAI_MODEL", "gpt-5.5")

INPUT_DIRECTORY = Path(
    os.getenv("INPUT_DIRECTORY", "input_images")
)
JSON_DIRECTORY = Path(
    os.getenv("JSON_DIRECTORY", "manifests")
)
RENAMED_DIRECTORY = Path(
    os.getenv("RENAMED_DIRECTORY", "renamed_originals")
)
ERROR_DIRECTORY = Path(
    os.getenv("ERROR_DIRECTORY", "errors")
)

PROMPT_FILE = Path("prompt.txt")

SKIP_EXISTING = (
    os.getenv("SKIP_EXISTING", "true").lower() == "true"
)

MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))

SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}

ALLOWED_COLORS = Literal[
    "Blanc",
    "Noir",
    "Gris",
    "Argenté",
    "Doré",
    "Bronze",
    "Cuivre",
    "Transparent",
    "Cristal",
    "Beige",
    "Marron",
    "Bois clair",
    "Bois foncé",
    "Rouge",
    "Bordeaux",
    "Rose",
    "Violet",
    "Bleu",
    "Bleu marine",
    "Turquoise",
    "Vert",
    "Vert olive",
    "Jaune",
    "Orange",
    "Multicolore",
]


# ============================================================
# Schéma Structured Outputs
# ============================================================

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Region(StrictModel):
    x_min: float = Field(ge=0.0, le=1.0)
    y_min: float = Field(ge=0.0, le=1.0)
    x_max: float = Field(ge=0.0, le=1.0)
    y_max: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)


class ProductVariant(StrictModel):
    reference: str
    name: str

    # size est facultatif parce que certains de vos exemples
    # ne le contiennent pas.
    size: str = ""

    price: float | None
    confidence_reference: float = Field(ge=0.0, le=1.0)
    confidence_price: float = Field(ge=0.0, le=1.0)


class CatalogImage(StrictModel):
    source_file: str
    cleaned_file: str
    detected_product_type: str
    rubrique: str
    categorie: str
    famille: str
    description: str
    colors: list[ALLOWED_COLORS]
    price_box_regions: list[Region]
    logo_regions: list[Region]
    products: list[ProductVariant]
    warnings: list[str]


class CatalogManifest(StrictModel):
    images: list[CatalogImage]


# ============================================================
# Utilitaires
# ============================================================

def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format=(
            "%(asctime)s | %(levelname)s | %(message)s"
        ),
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def ensure_directories() -> None:
    for directory in (
        INPUT_DIRECTORY,
        JSON_DIRECTORY,
        RENAMED_DIRECTORY,
        ERROR_DIRECTORY,
    ):
        directory.mkdir(parents=True, exist_ok=True)


def load_prompt() -> str:
    if not PROMPT_FILE.exists():
        raise FileNotFoundError(
            f"Le fichier de prompt est introuvable : "
            f"{PROMPT_FILE.resolve()}"
        )

    prompt = PROMPT_FILE.read_text(
        encoding="utf-8"
    ).strip()

    if not prompt:
        raise ValueError("Le fichier prompt.txt est vide.")

    return prompt


def list_images() -> list[Path]:
    return sorted(
        (
            path
            for path in INPUT_DIRECTORY.iterdir()
            if path.is_file()
            and path.suffix.lower()
            in SUPPORTED_EXTENSIONS
        ),
        key=lambda path: path.name.casefold(),
    )


def image_to_data_url(image_path: Path) -> str:
    mime_type, _ = mimetypes.guess_type(
        image_path.name
    )

    if mime_type not in {
        "image/jpeg",
        "image/png",
        "image/webp",
    }:
        raise ValueError(
            f"Type d'image non pris en charge : "
            f"{mime_type or 'inconnu'}"
        )

    image_bytes = image_path.read_bytes()
    encoded = base64.b64encode(
        image_bytes
    ).decode("utf-8")

    return f"data:{mime_type};base64,{encoded}"


def remove_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(
        character
        for character in normalized
        if unicodedata.category(character) != "Mn"
    )


def safe_stem(value: str) -> str:
    """
    Nettoie uniquement le nom sans extension.

    Exemple :
    'Lustre 7303/80×180' -> 'lustre-7303-80-180'
    """
    value = remove_accents(value).lower()
    value = value.replace("×", "-")
    value = re.sub(r"[/\\]+", "-", value)
    value = re.sub(r"[^a-z0-9_-]+", "-", value)
    value = re.sub(r"-{2,}", "-", value)
    value = value.strip("-_")

    return value or "produit"


def normalize_cleaned_filename(
    suggested_filename: str,
    source_path: Path,
) -> str:
    """
    Conserve le stem proposé par le modèle mais utilise
    l'extension réelle du fichier original.

    Cela évite de copier des octets JPEG dans un fichier
    portant artificiellement l'extension .png.
    """
    suggested_name = Path(
        suggested_filename.replace("\\", "/")
    ).name

    suggested_stem = Path(suggested_name).stem
    normalized_stem = safe_stem(suggested_stem)

    source_extension = source_path.suffix.lower()

    # Uniformisation de jpeg vers jpg facultative.
    if source_extension == ".jpeg":
        source_extension = ".jpg"

    return f"{normalized_stem}{source_extension}"


def reserve_unique_filename(
    desired_filename: str,
    reserved_names: set[str],
) -> str:
    """
    Garantit l'unicité dans l'ensemble du traitement.
    """
    desired_path = Path(desired_filename)
    stem = desired_path.stem
    extension = desired_path.suffix

    candidate = desired_filename
    index = 2

    while (
        candidate.casefold() in reserved_names
        or (RENAMED_DIRECTORY / candidate).exists()
    ):
        candidate = f"{stem}-{index}{extension}"
        index += 1

    reserved_names.add(candidate.casefold())
    return candidate


def manifest_output_path(
    source_path: Path,
) -> Path:
    """
    Le JSON est nommé depuis le fichier source pour permettre
    la reprise avant de connaître cleaned_file.
    """
    return JSON_DIRECTORY / (
        f"{source_path.stem}.json"
    )


def write_manifest(
    manifest: CatalogManifest,
    output_path: Path,
) -> None:
    output_path.write_text(
        json.dumps(
            manifest.model_dump(mode="json"),
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def copy_with_new_name(
    source_path: Path,
    cleaned_filename: str,
) -> Path:
    destination = (
        RENAMED_DIRECTORY / cleaned_filename
    )

    # copy2 conserve aussi les métadonnées du fichier.
    shutil.copy2(source_path, destination)

    return destination


def save_error(
    source_path: Path,
    error: Exception,
) -> None:
    error_path = ERROR_DIRECTORY / (
        f"{source_path.stem}.error.txt"
    )

    error_path.write_text(
        (
            f"Fichier : {source_path.name}\n"
            f"Type : {type(error).__name__}\n"
            f"Erreur : {error}\n"
        ),
        encoding="utf-8",
    )


def validate_regions(
    manifest_image: CatalogImage,
) -> list[str]:
    """
    Pydantic vérifie que les coordonnées sont entre 0 et 1.
    Cette fonction vérifie leur ordre logique.
    """
    warnings: list[str] = []

    all_regions = [
        ("price_box_regions", region)
        for region in manifest_image.price_box_regions
    ] + [
        ("logo_regions", region)
        for region in manifest_image.logo_regions
    ]

    for region_type, region in all_regions:
        if region.x_min >= region.x_max:
            warnings.append(
                f"{region_type} : x_min doit être "
                "inférieur à x_max."
            )

        if region.y_min >= region.y_max:
            warnings.append(
                f"{region_type} : y_min doit être "
                "inférieur à y_max."
            )

    return warnings


# ============================================================
# Appel OpenAI
# ============================================================

def analyze_image(
    client: OpenAI,
    developer_prompt: str,
    image_path: Path,
) -> CatalogManifest:
    data_url = image_to_data_url(image_path)

    user_instruction = f"""
Analyse l'image jointe selon les instructions développeur.

Nom exact du fichier source :
{image_path.name}

Le champ source_file doit contenir exactement :
{image_path.name}

Le champ cleaned_file doit contenir uniquement un nom de
fichier, sans chemin de dossier.

Conserve l'extension réelle du fichier source :
{image_path.suffix.lower()}
""".strip()

    response = client.responses.parse(
        model=MODEL,
        input=[
            {
                "role": "developer",
                "content": [
                    {
                        "type": "input_text",
                        "text": developer_prompt,
                    }
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": user_instruction,
                    },
                    {
                        "type": "input_image",
                        "image_url": data_url,

                        # High améliore la lecture des petits
                        # textes et des zones commerciales.
                        "detail": "high",
                    },
                ],
            },
        ],
        text_format=CatalogManifest,
    )

    if response.output_parsed is None:
        raise RuntimeError(
            "La réponse ne contient aucun résultat parsé. "
            "Une réponse de sécurité ou une erreur de modèle "
            "est possible."
        )

    return response.output_parsed


def analyze_with_retries(
    client: OpenAI,
    developer_prompt: str,
    image_path: Path,
) -> CatalogManifest:
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return analyze_image(
                client,
                developer_prompt,
                image_path,
            )

        except (
            RateLimitError,
            APITimeoutError,
            APIConnectionError,
        ) as error:
            last_error = error

            if attempt >= MAX_RETRIES:
                break

            waiting_time = 2 ** attempt

            logging.warning(
                "%s : tentative %s/%s échouée. "
                "Nouvel essai dans %s secondes.",
                image_path.name,
                attempt,
                MAX_RETRIES,
                waiting_time,
            )

            time.sleep(waiting_time)

    if last_error is not None:
        raise last_error

    raise RuntimeError(
        "L'analyse a échoué sans erreur détaillée."
    )


# ============================================================
# Traitement principal
# ============================================================

def main() -> None:
    configure_logging()
    ensure_directories()

    if not API_KEY:
        raise RuntimeError(
            "OPENAI_API_KEY est absent du fichier .env."
        )

    developer_prompt = load_prompt()
    images = list_images()

    if not images:
        logging.warning(
            "Aucune image trouvée dans %s",
            INPUT_DIRECTORY.resolve(),
        )
        return

    client = OpenAI(api_key=API_KEY)

    reserved_names: set[str] = {
        path.name.casefold()
        for path in RENAMED_DIRECTORY.iterdir()
        if path.is_file()
    }

    successful = 0
    failed = 0
    skipped = 0

    logging.info(
        "%s image(s) trouvée(s).", len(images)
    )

    for position, image_path in enumerate(
        images,
        start=1,
    ):
        json_path = manifest_output_path(image_path)

        if SKIP_EXISTING and json_path.exists():
            logging.info(
                "[%s/%s] Ignorée, JSON existant : %s",
                position,
                len(images),
                image_path.name,
            )
            skipped += 1
            continue

        logging.info(
            "[%s/%s] Analyse : %s",
            position,
            len(images),
            image_path.name,
        )

        try:
            manifest = analyze_with_retries(
                client,
                developer_prompt,
                image_path,
            )

            if len(manifest.images) != 1:
                raise ValueError(
                    "Une image d'entrée doit produire "
                    "exactement un objet dans images."
                )

            result_image = manifest.images[0]

            # On impose le nom source réel, même si le modèle
            # s'est trompé ou a laissé le champ vide.
            result_image.source_file = image_path.name

            cleaned_filename = (
                normalize_cleaned_filename(
                    result_image.cleaned_file,
                    image_path,
                )
            )

            cleaned_filename = reserve_unique_filename(
                cleaned_filename,
                reserved_names,
            )

            # Le JSON doit contenir le nom réellement utilisé.
            result_image.cleaned_file = cleaned_filename

            region_warnings = validate_regions(
                result_image
            )

            for warning in region_warnings:
                if warning not in result_image.warnings:
                    result_image.warnings.append(warning)

            copied_path = copy_with_new_name(
                image_path,
                cleaned_filename,
            )

            write_manifest(
                manifest,
                json_path,
            )

            logging.info(
                "OK : %s -> %s | JSON : %s",
                image_path.name,
                copied_path.name,
                json_path.name,
            )

            successful += 1

        except (
            ValidationError,
            ValueError,
            RuntimeError,
            OSError,
            RateLimitError,
            APITimeoutError,
            APIConnectionError,
        ) as error:
            failed += 1
            save_error(image_path, error)

            logging.exception(
                "Échec pour %s : %s",
                image_path.name,
                error,
            )

    logging.info("Traitement terminé.")
    logging.info("Réussites : %s", successful)
    logging.info("Ignorées : %s", skipped)
    logging.info("Échecs : %s", failed)
    logging.info(
        "JSON : %s", JSON_DIRECTORY.resolve()
    )
    logging.info(
        "Copies renommées : %s",
        RENAMED_DIRECTORY.resolve(),
    )
    logging.info(
        "Rapports d'erreur : %s",
        ERROR_DIRECTORY.resolve(),
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.warning(
            "Traitement interrompu par l'utilisateur."
        )
        raise SystemExit(130)
    except Exception as error:
        logging.exception(
            "Erreur fatale : %s", error
        )
        raise SystemExit(1)

